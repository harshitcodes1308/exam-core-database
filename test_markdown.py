import pymupdf4llm
import os
import sys

def main():
    os.makedirs("public/uploads/diagrams", exist_ok=True)
    pdf_path = sys.argv[1]
    md_text = pymupdf4llm.to_markdown(pdf_path, write_images=True, image_path="public/uploads/diagrams")
    print(md_text[:1000])

if __name__ == "__main__":
    main()
