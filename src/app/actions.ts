"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addContent(formData: FormData) {
  const topicId = formData.get("topicId") as string;
  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const contentType = formData.get("contentType") as string;

  await prisma.content.create({
    data: {
      topicId,
      title,
      body,
      contentType,
    }
  });

  revalidatePath(`/topics/${topicId}`);
}

export async function deleteContent(contentId: string, topicId: string) {
  await prisma.content.delete({ where: { id: contentId } });
  revalidatePath(`/topics/${topicId}`);
}

export async function addQuestion(formData: FormData) {
  const topicId = formData.get("topicId") as string;
  const questionText = formData.get("content") as string;
  const questionType = formData.get("type") as string;
  const difficulty = formData.get("difficulty") as string;
  const hint = formData.get("hint") as string;
  const officialSolution = formData.get("explanation") as string;
  const optionsRaw = formData.get("options") as string;
  const correctOptionIndex = parseInt(formData.get("correctOptionIndex") as string, 10);

  const question = await prisma.question.create({
    data: {
      topicId,
      questionText,
      questionType,
      difficulty,
      hint: hint || null,
      officialSolution: officialSolution || null,
    }
  });

  if (questionType === "MCQ" && optionsRaw) {
    const optionsList = optionsRaw.split("\n").filter(o => o.trim() !== "");
    await Promise.all(optionsList.map((opt, idx) => 
      prisma.questionOption.create({
        data: {
          questionId: question.id,
          content: opt.trim(),
          isCorrect: idx === correctOptionIndex,
          orderIndex: idx,
        }
      })
    ));
  }

  revalidatePath(`/topics/${topicId}`);
}

export async function deleteQuestion(questionId: string, topicId: string) {
  await prisma.question.delete({ where: { id: questionId } });
  revalidatePath(`/topics/${topicId}`);
}
