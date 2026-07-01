import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Exam Core Database...')

  // 1. Create Board
  const cbse = await prisma.board.upsert({
    where: { code: 'CBSE' },
    update: {},
    create: {
      name: 'Central Board of Secondary Education',
      code: 'CBSE',
      country: 'India',
    },
  })

  // 2. Create Class
  const class10 = await prisma.class.create({
    data: {
      boardId: cbse.id,
      name: 'Class 10',
      levelNum: 10,
    }
  })

  // 3. Create Subjects
  const math = await prisma.subject.create({
    data: {
      classId: class10.id,
      name: 'Mathematics',
      code: 'MATH10',
      icon: 'Calculate',
    }
  })

  const science = await prisma.subject.create({
    data: {
      classId: class10.id,
      name: 'Science',
      code: 'SCI10',
      icon: 'Science',
    }
  })

  // 4. Create Chapters for Science
  const ch1 = await prisma.chapter.create({
    data: {
      subjectId: science.id,
      name: 'Chemical Reactions and Equations',
      orderIndex: 1,
    }
  })

  const ch2 = await prisma.chapter.create({
    data: {
      subjectId: science.id,
      name: 'Acids, Bases and Salts',
      orderIndex: 2,
    }
  })

  // 5. Create Topics for Ch1
  await prisma.topic.createMany({
    data: [
      { chapterId: ch1.id, name: 'Chemical Equations', orderIndex: 1 },
      { chapterId: ch1.id, name: 'Types of Chemical Reactions', orderIndex: 2 },
      { chapterId: ch1.id, name: 'Oxidation and Reduction', orderIndex: 3 },
    ]
  })

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
