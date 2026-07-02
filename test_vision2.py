import fitz
import os
import base64
from openai import OpenAI
from pydantic import BaseModel, Field

class Option(BaseModel):
    content: str
    isCorrect: bool

class Question(BaseModel):
    questionNumber: str
    questionText: str
    options: list[Option]
    correctAnswer: str | None
    officialSolution: str | None
    hasDiagram: bool
    diagram_ymin: int | None = Field(description="0-100 percentage")
    diagram_xmin: int | None = Field(description="0-100 percentage")
    diagram_ymax: int | None = Field(description="0-100 percentage")
    diagram_xmax: int | None = Field(description="0-100 percentage")

class PageExtraction(BaseModel):
    questions: list[Question]

doc = fitz.open("/var/folders/z3/ll1hzn_n3_x7ql3q1x5d4xd80000gn/T/qp_1783013983931.pdf")
page = doc.load_page(4) # Page 5
pix = page.get_pixmap(dpi=150)
pix.save("test_page5.png")

with open("test_page5.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

prompt = """
Extract all questions from this exam paper page.
If a question has a visual diagram, figure, or image grid, set hasDiagram=true and provide the bounding box in percentages (0-100) from top-left.
The bounding box MUST enclose the ENTIRE diagram (all pieces, sub-figures, and labels). Do NOT include the question text in the diagram box.
"""

completion = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
        ]}
    ],
    response_format=PageExtraction
)

print(completion.choices[0].message.parsed.model_dump_json(indent=2))
