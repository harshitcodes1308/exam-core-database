import pymupdf4llm
import os

# Create a simple PDF with an image to test
import fitz
doc = fitz.open()
page = doc.new_page()
# Draw a simple rectangle or something
page.draw_rect(fitz.Rect(50, 50, 150, 150), color=(1, 0, 0), fill=(1, 0, 0))
doc.save("test.pdf")

os.makedirs("public/uploads/diagrams", exist_ok=True)
md = pymupdf4llm.to_markdown("test.pdf", write_images=True, image_path="public/uploads/diagrams")
print(md)
