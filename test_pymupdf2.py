import pymupdf4llm
md = pymupdf4llm.to_markdown("/var/folders/z3/ll1hzn_n3_x7ql3q1x5d4xd80000gn/T/qp_1783013983931.pdf", write_images=True, image_path="public/uploads/diagrams")
with open("test_md.md", "w") as f:
  f.write(md)
