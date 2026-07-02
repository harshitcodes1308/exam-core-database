import sys
import json
import os
import pymupdf4llm
import fitz
import base64
from openai import OpenAI
from pydantic import BaseModel, Field
from PIL import Image
import io

class Option(BaseModel):
    content: str
    isCorrect: bool

class Question(BaseModel):
    questionNumber: str
    questionText: str
    questionType: str = Field(description="'MCQ' or 'Subjective'")
    options: list[Option]
    correctAnswer: str | None
    officialSolution: str | None
    hasDiagram: bool
    diagram_ymin: int | None = Field(description="0-100 percentage of the image height")
    diagram_xmin: int | None = Field(description="0-100 percentage of the image width")
    diagram_ymax: int | None = Field(description="0-100 percentage of the image height")
    diagram_xmax: int | None = Field(description="0-100 percentage of the image width")

class PageExtraction(BaseModel):
    questions: list[Question]

def extract(qp_path, ms_path):
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    if not client.api_key:
        print(json.dumps({"error": "OPENAI_API_KEY environment variable is not set."}))
        sys.exit(1)

    print("Extracting Marking Scheme...", file=sys.stderr)
    try:
        ms_md = pymupdf4llm.to_markdown(ms_path)
    except Exception as e:
        print(json.dumps({"error": f"Failed to read MS PDF: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

    print("Extracting Question Paper...", file=sys.stderr)
    try:
        qp_doc = fitz.open(qp_path)
    except Exception as e:
        print(json.dumps({"error": f"Failed to read QP PDF: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

    all_questions = []

    # Get a unique prefix for saving images
    base_name = os.path.basename(qp_path).split('.')[0]
    out_dir = os.path.join(os.getcwd(), "public", "uploads", "diagrams")
    os.makedirs(out_dir, exist_ok=True)

    system_prompt = f"""
    You are an expert exam digitizer. 
    You will be given ONE PAGE of a Question Paper (as an image) and the ENTIRE Marking Scheme (as text).
    Extract all questions that appear on this page image. If a question spans across multiple pages, only extract the part visible.
    Ignore any Hindi translations. ONLY extract English text.

    For each question on this page:
    1. Extract the `questionNumber` and `questionText`. Do not include the number in the text.
    2. Identify the `questionType` (MCQ or Subjective).
    3. If MCQ, extract the `options` and find the correct one from the Marking Scheme.
    4. Find its corresponding `officialSolution` from the Marking Scheme text.
    5. CRITICAL VISUAL CHECK: Look closely at the question in the image. Does it have a visual diagram, grid, figure, graph, or complex drawing that is NOT just text?
       - If YES: set `hasDiagram=true`.
       - Provide the precise bounding box for the diagram in integer percentages (0-100) from top-left.
       - The bounding box MUST perfectly enclose the ENTIRE diagram, including all sub-parts, tables, and labels. Do NOT include the question text in the box.
       - CRITICAL: DO NOT select QR codes, page numbers, watermarks, or generic page headers. Only capture question-specific diagrams. 
       - If the object is a QR code, barcode, or page number, set `hasDiagram=false`!
       - Ensure the bounding box has a slight margin so the edges of the diagram are not cut off.
    """

    import concurrent.futures

    def process_page(page_num):
        print(f"Processing page {page_num + 1}/{qp_doc.page_count}...", file=sys.stderr)
        page = qp_doc.load_page(page_num)
        
        # High resolution for better cropping
        pix = page.get_pixmap(dpi=300)
        img_bytes = pix.tobytes("png")
        b64 = base64.b64encode(img_bytes).decode('utf-8')
        
        page_questions = []
        try:
            completion = client.beta.chat.completions.parse(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": [
                        {"type": "text", "text": f"Here is the Marking Scheme text:\n\n{ms_md}\n\nNow, extract the questions from the attached Question Paper page image."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                    ]}
                ],
                response_format=PageExtraction,
                max_completion_tokens=4096,
                temperature=0.0
            )
            
            page_data = completion.choices[0].message.parsed
            
            # Open image in PIL for cropping
            pil_img = Image.open(io.BytesIO(img_bytes))
            width, height = pil_img.size
            
            for q in page_data.questions:
                q_dict = q.model_dump()
                q_dict['diagramUrl'] = None
                
                if q.hasDiagram and all(v is not None for v in [q.diagram_ymin, q.diagram_xmin, q.diagram_ymax, q.diagram_xmax]):
                    # Calculate pixel coordinates
                    left = int((q.diagram_xmin / 100) * width)
                    upper = int((q.diagram_ymin / 100) * height)
                    right = int((q.diagram_xmax / 100) * width)
                    lower = int((q.diagram_ymax / 100) * height)
                    
                    # Add 2% padding
                    pad_x = int(width * 0.02)
                    pad_y = int(height * 0.02)
                    left = max(0, left - pad_x)
                    upper = max(0, upper - pad_y)
                    right = min(width, right + pad_x)
                    lower = min(height, lower + pad_y)
                    
                    # Validate crop area
                    if right > left and lower > upper:
                        cropped = pil_img.crop((left, upper, right, lower))
                        img_filename = f"{base_name}_{q.questionNumber}.png"
                        img_path = os.path.join(out_dir, img_filename)
                        cropped.save(img_path)
                        q_dict['diagramUrl'] = f"public/uploads/diagrams/{img_filename}"
                
                # Cleanup internal fields
                del q_dict['hasDiagram']
                del q_dict['diagram_ymin']
                del q_dict['diagram_xmin']
                del q_dict['diagram_ymax']
                del q_dict['diagram_xmax']
                
                page_questions.append(q_dict)
                
        except Exception as e:
            print(f"Failed on page {page_num + 1}: {str(e)}", file=sys.stderr)
            
        return page_num, page_questions

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(process_page, p) for p in range(qp_doc.page_count)]
        results = []
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            
    # Sort results by page_num to keep questions in order
    results.sort(key=lambda x: x[0])
    for _, page_questions in results:
        all_questions.extend(page_questions)

    print(f"Extracted {len(all_questions)} questions. {sum(1 for q in all_questions if q.get('diagramUrl'))} have diagrams.", file=sys.stderr)
    print(json.dumps(all_questions, indent=2))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python3 extract_paper.py <qp_pdf> <ms_pdf>"}))
        sys.exit(1)
    
    qp_pdf = sys.argv[1]
    ms_pdf = sys.argv[2]
    
    extract(qp_pdf, ms_pdf)
