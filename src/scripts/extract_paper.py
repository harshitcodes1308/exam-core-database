import sys
import json
import fitz  # PyMuPDF
import re

def is_hindi(text):
    # Check if text contains Devanagari characters
    return bool(re.search(r'[\u0900-\u097F]', text))

def extract_questions(pdf_path):
    doc = fitz.open(pdf_path)
    questions = []
    current_q = None

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("blocks")
        
        # Sort blocks top-to-bottom, left-to-right
        blocks.sort(key=lambda b: (b[1], b[0]))
        
        for b in blocks:
            text = b[4].strip()
            if not text or is_hindi(text):
                continue
            
            # Simple heuristic for Question Number: starts with number dot, or Q. number
            # e.g., "1. ", "Q.1", "Q1."
            match = re.match(r'^(?:Q\.?\s*)?(\d+)\.\s*(.*)', text, re.IGNORECASE | re.DOTALL)
            if match:
                q_num = match.group(1)
                content = match.group(2).strip()
                
                # Save previous question if exists
                if current_q:
                    questions.append(current_q)
                
                current_q = {
                    "questionNumber": q_num,
                    "questionText": content,
                    "questionType": "Subjective", # default
                    "options": [],
                    "marks": None
                }
                
                # Check if it has MCQ options in the same block (A), (B), etc.
                opts = re.findall(r'\(([a-d])\)\s*([^()]+)(?=\([a-d]\)|$)', content, re.IGNORECASE)
                if opts:
                    current_q["questionType"] = "MCQ"
                    current_q["options"] = [{"content": o[1].strip(), "isCorrect": False} for o in opts]
            elif current_q:
                # Append to current question text if it's not a new question
                # Also check for options in subsequent blocks
                opts = re.findall(r'^\s*\(([a-d])\)\s*(.*)', text, re.IGNORECASE | re.MULTILINE)
                if opts:
                    current_q["questionType"] = "MCQ"
                    for o in opts:
                        current_q["options"].append({"content": o[1].strip(), "isCorrect": False})
                else:
                    current_q["questionText"] += "\n" + text

    if current_q:
        questions.append(current_q)
        
    return questions

def extract_answers(pdf_path):
    doc = fitz.open(pdf_path)
    answers = {}
    current_a = None
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("blocks")
        blocks.sort(key=lambda b: (b[1], b[0]))
        
        for b in blocks:
            text = b[4].strip()
            if not text or is_hindi(text):
                continue
            
            # Look for answer numbers like "1.", "Ans 1", etc.
            match = re.match(r'^(?:Ans\.?\s*)?(\d+)\.\s*(.*)', text, re.IGNORECASE | re.DOTALL)
            if match:
                q_num = match.group(1)
                content = match.group(2).strip()
                answers[q_num] = content
                current_a = q_num
            elif current_a:
                answers[current_a] += "\n" + text
                
    return answers

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing PDF paths"}))
        sys.exit(1)
        
    qp_path = sys.argv[1]
    ms_path = sys.argv[2]
    
    try:
        questions = extract_questions(qp_path)
        answers = extract_answers(ms_path)
        
        # Merge
        for q in questions:
            q_num = q["questionNumber"]
            if q_num in answers:
                # If MCQ, try to parse which option is correct from the answer
                if q["questionType"] == "MCQ":
                    ans_text = answers[q_num].strip()
                    # Official scheme usually says "(a)" or "(b)"
                    opt_match = re.match(r'^\s*\(([a-d])\)', ans_text, re.IGNORECASE)
                    if opt_match:
                        correct_letter = opt_match.group(1).lower()
                        # 'a' is index 0, 'b' is index 1
                        idx = ord(correct_letter) - 97
                        if 0 <= idx < len(q["options"]):
                            q["options"][idx]["isCorrect"] = True
                            q["correctAnswer"] = ans_text # store the raw text too
                    else:
                        q["correctAnswer"] = ans_text
                else:
                    q["officialSolution"] = answers[q_num]
                    
        print(json.dumps(questions))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
