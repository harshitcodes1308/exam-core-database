import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function PapersListPage() {
  const papers = await prisma.paper.findMany({
    include: {
      board: true,
      class: true,
      subject: true,
      _count: {
        select: { questions: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ingested Papers</h1>
      
      {papers.length === 0 ? (
        <p className="text-gray-500">No papers ingested yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {papers.map((paper) => (
            <Link key={paper.id} href={`/papers/${paper.id}`} className="bg-white p-5 rounded-xl shadow-sm border hover:border-blue-500 transition-colors block group">
              <div className="text-sm text-gray-500 mb-2">
                {paper.board.code} &middot; {paper.class.name} &middot; {paper.subject.name}
              </div>
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {paper.type} - {paper.year}
              </h2>
              {paper.setNumber && <p className="text-sm mt-1 text-gray-600">{paper.setNumber}</p>}
              <div className="mt-4 pt-4 border-t text-sm font-medium text-gray-700 flex justify-between">
                <span>Questions:</span>
                <span className="bg-gray-100 px-2 py-0.5 rounded">{paper._count.questions}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
