import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PaperPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const paperId = params.id;
  
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      board: true,
      class: true,
      subject: true,
      questions: {
        include: {
          options: true
        },
        orderBy: {
          questionNumber: 'asc'
        }
      }
    }
  });

  if (!paper) return notFound();

  // Helper to sort question numbers naturally (e.g. 1, 2, 10 instead of 1, 10, 2)
  const sortedQuestions = [...paper.questions].sort((a, b) => {
    const numA = parseInt(a.questionNumber || "0") || 0;
    const numB = parseInt(b.questionNumber || "0") || 0;
    return numA - numB;
  });

  return (
    <div className="space-y-6">
      <Link href="/" className="text-blue-600 hover:underline text-sm">&larr; Back to Taxonomy</Link>
      
      <div className="bg-white p-6 rounded shadow border">
        <h1 className="text-2xl font-bold">{paper.type} - {paper.year}</h1>
        <p className="text-gray-600 mt-2">
          {paper.board.code} | {paper.class.name} | {paper.subject.name}
          {paper.setNumber && ` | ${paper.setNumber}`}
          {paper.code && ` | Code: ${paper.code}`}
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Extracted Questions ({sortedQuestions.length})</h2>
        
        {sortedQuestions.length === 0 ? (
          <p className="text-gray-500 italic">No questions were extracted. Check the PDF format.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {sortedQuestions.map((q) => (
              <div key={q.id} className="bg-white p-5 rounded shadow border">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    Q. {q.questionNumber}
                  </span>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {q.questionType}
                  </span>
                </div>
                
                {q.diagramUrl && (
                  <div className="mb-4">
                    <img src={q.diagramUrl} alt={`Diagram for Q.${q.questionNumber}`} className="max-w-full h-auto rounded border" />
                  </div>
                )}
                
                <p className="whitespace-pre-wrap text-gray-900 font-medium mb-4">{q.questionText}</p>
                
                {q.options && q.options.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {q.options.map(opt => (
                      <li key={opt.id} className="p-2 rounded border bg-gray-50 border-gray-100 text-gray-600">
                        {opt.content}
                      </li>
                    ))}
                  </ul>
                )}
                
                {q.officialSolution && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-4">
                    <p className="text-sm font-bold text-yellow-800 mb-1">Official Solution:</p>
                    <p className="text-sm text-yellow-900 whitespace-pre-wrap">{q.officialSolution}</p>
                  </div>
                )}
                
                {q.correctAnswer && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded mt-4">
                    <p className="text-sm font-bold text-green-800 mb-1">Correct Answer:</p>
                    <p className="text-sm text-green-900 whitespace-pre-wrap">{q.correctAnswer}</p>
                  </div>
                )}
                
                {/* Topic mapping status placeholder */}
                <div className="mt-4 pt-4 border-t flex justify-end">
                  {q.topicId ? (
                    <span className="text-xs text-green-600 font-bold">✓ Mapped to a Topic</span>
                  ) : (
                    <span className="text-xs text-red-500 font-bold">! Unmapped</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
