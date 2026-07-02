import fitz
import os
import base64
from openai import OpenAI
from pydantic import BaseModel, Field

class DiagramBox(BaseModel):
    questionNumber: str
    ymin_percent: int = Field(description="0 to 100")
    xmin_percent: int = Field(description="0 to 100")
    ymax_percent: int = Field(description="0 to 100")
    xmax_percent: int = Field(description="0 to 100")

class Extraction(BaseModel):
    diagrams: list[DiagramBox]

doc = fitz.open("/var/folders/z3/ll1hzn_n3_x7ql3q1x5d4xd80000gn/T/qp_1783013983931.pdf")
page = doc.load_page(4) # Page 5 (has question 2 with diagram)
pix = page.get_pixmap(dpi=150)
pix.save("test_page.png")

with open("test_page.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

completion = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a precise vision bounding box extractor. Find any question diagrams. Ignore QR codes. Output coordinates as integer percentages (0-100) from top-left."},
        {"role": "user", "content": [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}]}
    ],
    response_format=Extraction
)

print(completion.choices[0].message.parsed.model_dump_json(indent=2))
