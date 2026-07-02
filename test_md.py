import pymupdf4llm
import sys

def main():
    pdf_path = sys.argv[1]
    md_text = pymupdf4llm.to_markdown(pdf_path, write_images=False)
    with open("md_test.txt", "w") as f:
        f.write(md_text)

if __name__ == "__main__":
    main()
