"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export async function runIngestion(formData: FormData) {
  const boardId = formData.get("boardId") as string;
  const classId = formData.get("classId") as string;
  const subjectId = formData.get("subjectId") as string;
  const paperType = formData.get("paperType") as string;
  const year = parseInt(formData.get("year") as string, 10);
  const code = formData.get("code") as string;
  const setNumber = formData.get("setNumber") as string;

  const qp = formData.get("questionPaper") as File;
  const ms = formData.get("markingScheme") as File;

  if (!qp || !ms) {
    throw new Error("Missing PDF files");
  }

  // Ensure Paper exists or create it
  let paper = await prisma.paper.findFirst({
    where: { boardId, classId, subjectId, type: paperType, year, code, setNumber }
  });

  if (!paper) {
    paper = await prisma.paper.create({
      data: { boardId, classId, subjectId, type: paperType, year, code, setNumber }
    });
  }

  // Save files to tmp
  const tmpDir = os.tmpdir();
  const qpPath = join(tmpDir, `qp_${Date.now()}.pdf`);
  const msPath = join(tmpDir, `ms_${Date.now()}.pdf`);

  await writeFile(qpPath, Buffer.from(await qp.arrayBuffer()));
  await writeFile(msPath, Buffer.from(await ms.arrayBuffer()));

  // Run Python Script
  const scriptPath = join(process.cwd(), "src/scripts/extract_paper.py");
  const pythonExecutable = join(process.cwd(), "src/scripts/venv/bin/python3");
  
  try {
    const { stdout, stderr } = await execAsync(`${pythonExecutable} ${scriptPath} ${qpPath} ${msPath}`);
    
    const parsedData = JSON.parse(stdout);
    if (parsedData.error) {
      throw new Error(`Python Error: ${parsedData.error}`);
    }

    // Insert into DB
    let inserted = 0;
    for (const item of parsedData) {
      // Duplicate check
      const exists = await prisma.question.findFirst({
        where: {
          paperId: paper.id,
          questionNumber: item.questionNumber
        }
      });

      if (!exists) {
        const question = await prisma.question.create({
          data: {
            paperId: paper.id,
            questionNumber: item.questionNumber,
            questionText: item.questionText,
            questionType: item.questionType,
            correctAnswer: item.correctAnswer || null,
            officialSolution: item.officialSolution || null,
          }
        });

        if (item.options && item.options.length > 0) {
          await Promise.all(item.options.map((opt: any, idx: number) => 
            prisma.questionOption.create({
              data: {
                questionId: question.id,
                content: opt.content,
                isCorrect: opt.isCorrect,
                orderIndex: idx
              }
            })
          ));
        }
        inserted++;
      }
    }

    // Done
  } catch (err: any) {
    console.error("Extraction Failed:", err);
    throw new Error(`Extraction failed: ${err.message}`);
  }

  revalidatePath("/");
  redirect("/");
}
