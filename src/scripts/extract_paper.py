import sys
import json
import os
import pymupdf4llm
from pydantic import BaseModel, Field
from typing import List, Optional
from openai import OpenAI

class Option(BaseModel):
    content: str = Field(description="The text content of the MCQ option. Do not include the (A), (B) prefix.")
    isCorrect: bool = Field(description="True if this is the correct option according to the marking scheme, otherwise False.")

class Question(BaseModel):
    questionNumber: str = Field(description="The question number (e.g. '1', '2a', '3(i)').")
    questionText: str = Field(description="The full text of the question, preserving newlines where appropriate. Do not include general instructions.")
    questionType: str = Field(description="Must be exactly 'MCQ' or 'Subjective'.")
    options: List[Option] = Field(description="List of options if it's an MCQ, otherwise an empty array.", default_factory=list)
    correctAnswer: Optional[str] = Field(description="If MCQ, the short correct option letter (e.g. 'A', 'B', 'C', 'D'). Null if Subjective.", default=None)
    officialSolution: Optional[str] = Field(description="The exact full explanation/solution from the marking scheme. This MUST be populated for ALL questions (both MCQs and Subjective).", default=None)
    diagramUrl: Optional[str] = Field(description="If the question contains an image/diagram in the Markdown (e.g. ![](path/to/image.png) or ![image](...)), extract ONLY the path (e.g. 'path/to/image.png') and put it here. Null if no image.", default=None)

class ExamPaper(BaseModel):
    questions: List[Question] = Field(description="List of all extracted questions.")

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing PDF paths"}))
        sys.exit(1)
        
    qp_path = sys.argv[1]
    ms_path = sys.argv[2]
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        print(json.dumps({"error": "OPENAI_API_KEY environment variable is not set."}))
        sys.exit(1)

    try:
        # Create diagrams directory
        diagrams_dir = os.path.join(os.getcwd(), "public", "uploads", "diagrams")
        os.makedirs(diagrams_dir, exist_ok=True)

        # Convert QP to markdown and extract images
        qp_md = pymupdf4llm.to_markdown(qp_path, write_images=True, image_path="public/uploads/diagrams")
        
        # Convert MS to markdown (no need to extract images usually, but we can do it just in case)
        ms_md = pymupdf4llm.to_markdown(ms_path)

        client = OpenAI(api_key=api_key)

        prompt = f"""
You are an expert exam paper digitizer. Your task is to extract all questions and their official solutions from the provided Question Paper (QP) and Marking Scheme (MS) Markdown.

RULES:
1. Ignore general instructions, title pages, and any Hindi translations. Extract ONLY the English version of the questions.
2. For MCQs, populate the `options` array, mark exactly one option as `isCorrect: true`, AND put the correct option letter (A, B, C, D) in `correctAnswer`.
3. For Subjective questions, set `questionType` to "Subjective" and leave `options` empty.
4. The `officialSolution` field MUST be populated for EVERY question. Copy the entire explanation/solution for that specific question from the Marking Scheme Markdown. 
5. The Markdown text contains images like `![](public/uploads/diagrams/img.png)`. If a question has an associated diagram, extract the file path and put it in `diagramUrl`.
6. Ensure the `questionNumber` matches exactly between the QP and MS.
7. If a question has sub-parts (e.g. 1a, 1b), treat them as separate questions with question numbers "1(a)" and "1(b)".

=== QUESTION PAPER MARKDOWN ===
{qp_md}

=== MARKING SCHEME MARKDOWN ===
{ms_md}
"""

        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a precise data extraction tool."},
                {"role": "user", "content": prompt}
            ],
            response_format=ExamPaper,
        )

        exam_paper = completion.choices[0].message.parsed
        print(exam_paper.model_dump_json(exclude_none=False))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
