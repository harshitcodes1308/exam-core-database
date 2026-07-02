import sys
import json
import os
import pymupdf4llm
import fitz
import base64
from openai import OpenAI
from pydantic import BaseModel, Field


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

    # Get a unique prefix for saving images (if needed later, but diagram logic is removed)
    base_name = os.path.basename(qp_path).split('.')[0]

    system_prompt = f"""
    You are an expert exam digitizer. 
    You will be given ONE PAGE of a Question Paper (as an image) and the ENTIRE Marking Scheme (as text).
    Extract all questions that appear on this page image. If a question spans across multiple pages, only extract the part visible.
    Ignore any Hindi translations. ONLY extract English text.

    CRITICAL RULE FOR DIAGRAMS:
    If a question contains any visual diagram, grid, figure, graph, or complex drawing that is NOT just text, you MUST completely IGNORE and SKIP that question. Do not include it in your output JSON. Only extract questions that are purely text-based.

    For each purely text-based question on this page:
    1. Extract the `questionNumber` and `questionText`. Do not include the number in the text.
    2. Identify the `questionType` (MCQ or Subjective).
    3. If MCQ, extract the `options` and find the correct one from the Marking Scheme.
    4. Find its corresponding `officialSolution` from the Marking Scheme text.
    """

    import concurrent.futures

    def process_page(page_num):
        print(f"Processing page {page_num + 1}/{qp_doc.page_count}...", file=sys.stderr)
        page = qp_doc.load_page(page_num)
        
        # High resolution
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
                        {"type": "text", "text": f"Here is the Marking Scheme text:\n\n{ms_md}\n\nNow, extract the questions from the attached Question Paper page image. Remember to SKIP any questions that contain diagrams or figures!"},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                    ]}
                ],
                response_format=PageExtraction,
                max_completion_tokens=4096,
                temperature=0.0
            )
            
            page_data = completion.choices[0].message.parsed
            
            for q in page_data.questions:
                q_dict = q.model_dump()
                q_dict['diagramUrl'] = None
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
