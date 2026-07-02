import os
import sys
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List, Optional

class Option(BaseModel):
    content: str
    isCorrect: bool

class Question(BaseModel):
    questionNumber: str
    questionText: str
    questionType: str
    options: List[Option]
    correctAnswer: Optional[str]
    officialSolution: Optional[str]
    diagramUrl: Optional[str]

class ExamPaper(BaseModel):
    questions: List[Question]

qp_md = "1. What is the area of this triangle?\n\n![](public/uploads/diagrams/qp_123.pdf-0001-00.png)\n\n(A) 10\n(B) 20\n(C) 30\n(D) 40\n"
ms_md = "1. (B) 20\nArea = 1/2 * b * h\n"

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

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
completion = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a precise data extraction tool."},
        {"role": "user", "content": prompt}
    ],
    response_format=ExamPaper,
)

print(completion.choices[0].message.parsed.model_dump_json(indent=2))
