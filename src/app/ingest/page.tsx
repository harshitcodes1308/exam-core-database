import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { runIngestion } from "./actions";

export default async function IngestPage() {
  const boards = await prisma.board.findMany({
    include: {
      classes: {
        include: {
          subjects: true
        }
      }
    }
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">&larr; Back to Taxonomy</Link>
        <h2 className="text-3xl font-bold">Content Ingestion Pipeline</h2>
        <p className="text-gray-500 mt-1">
          Upload official PDF papers and marking schemes to automatically parse and inject questions.
        </p>
      </div>

      <form action={runIngestion} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h3 className="text-xl font-bold border-b pb-4">Paper Metadata</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Board</label>
            <select name="boardId" required className="w-full border rounded p-2">
              <option value="">Select Board</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select name="classId" required className="w-full border rounded p-2">
              <option value="">Select Class</option>
              {boards.flatMap(b => b.classes).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select name="subjectId" required className="w-full border rounded p-2">
              <option value="">Select Subject</option>
              {boards.flatMap(b => b.classes).flatMap(c => c.subjects).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Paper Type</label>
            <select name="paperType" required className="w-full border rounded p-2">
              <option value="Board Exam">Board Exam</option>
              <option value="Sample Question Paper (SQP)">Sample Question Paper (SQP)</option>
              <option value="Practice Paper">Practice Paper</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <input name="year" type="number" required defaultValue={new Date().getFullYear()} className="w-full border rounded p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Paper Code (Optional)</label>
            <input name="code" className="w-full border rounded p-2" placeholder="e.g. 30/1/1" />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Set Number (Optional)</label>
            <input name="setNumber" className="w-full border rounded p-2" placeholder="e.g. Set 1" />
          </div>
        </div>

        <h3 className="text-xl font-bold border-b pb-4 pt-4">Upload PDFs</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <label className="block text-sm font-bold text-gray-700 mb-2">Question Paper PDF</label>
            <input type="file" name="questionPaper" accept="application/pdf" required className="text-sm" />
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <label className="block text-sm font-bold text-gray-700 mb-2">Marking Scheme PDF</label>
            <input type="file" name="markingScheme" accept="application/pdf" required className="text-sm" />
          </div>
        </div>

        <div className="pt-4 border-t">
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow hover:bg-blue-700 transition-colors">
            Run Ingestion Pipeline
          </button>
        </div>
      </form>
    </div>
  );
}
