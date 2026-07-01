import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding subjects to Class 10...')
  
  const class10List = await prisma.class.findMany({
    where: { levelNum: 10, board: { code: 'CBSE' } }
  })
  
  if (class10List.length === 0) {
    console.log('Class 10 CBSE not found!')
    return
  }
  
  const class10 = class10List[0];

  // Check if they exist first, if not create them
  const subjectsToCreate = [
    { name: 'SST', code: 'SST10', icon: 'Public' },
    { name: 'English', code: 'ENG10', icon: 'MenuBook' },
    { name: 'IT / AI / CA', code: 'COMP10', icon: 'Computer' },
  ]

  for (const sub of subjectsToCreate) {
    const existing = await prisma.subject.findFirst({
      where: { classId: class10.id, name: sub.name }
    })
    
    if (!existing) {
      await prisma.subject.create({
        data: {
          classId: class10.id,
          name: sub.name,
          code: sub.code,
          icon: sub.icon
        }
      })
      console.log(`Created ${sub.name}`)
    } else {
      console.log(`${sub.name} already exists`)
    }
  }

  // Rename Mathematics to Maths if it exists
  const math = await prisma.subject.findFirst({
    where: { classId: class10.id, name: 'Mathematics' }
  })
  if (math) {
    await prisma.subject.update({
      where: { id: math.id },
      data: { name: 'Maths' }
    })
    console.log('Renamed Mathematics to Maths')
  }

  console.log('Done!')
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
