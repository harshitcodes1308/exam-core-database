import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function TaxonomyExplorer() {
  const boards = await prisma.board.findMany({
    include: {
      classes: {
        include: {
          subjects: {
            include: {
              chapters: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  topics: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                      _count: {
                        select: { questions: true, contents: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Taxonomy Explorer</h2>
      </div>

      {boards.map((board) => (
        <div key={board.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 border-b pb-4 mb-4">Board: {board.name} ({board.code})</h3>
          
          <div className="space-y-6">
            {board.classes.map((cls) => (
              <div key={cls.id} className="pl-4 border-l-2 border-blue-100">
                <h4 className="text-lg font-semibold text-blue-800 mb-4">Class {cls.levelNum}: {cls.name}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cls.subjects.map((subject) => (
                    <div key={subject.id} className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                      <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <span>{subject.icon}</span>
                        {subject.name}
                      </h5>
                      
                      <div className="space-y-2 mt-4 text-sm">
                        {subject.chapters.map((chapter) => (
                          <div key={chapter.id} className="border-t border-gray-200 pt-2 first:border-0 first:pt-0">
                            <span className="font-medium text-gray-700">Ch {chapter.orderIndex}: {chapter.name}</span>
                            <ul className="mt-1 space-y-1 pl-4">
                              {chapter.topics.map((topic) => (
                                <li key={topic.id} className="text-gray-600 hover:text-blue-600 transition-colors flex justify-between items-center group">
                                  <Link href={`/topics/${topic.id}`} className="truncate block pr-2">
                                    • {topic.name}
                                  </Link>
                                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                    {topic._count.questions} Q | {topic._count.contents} N
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
