import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { addContent, addQuestion, deleteContent, deleteQuestion } from "../../actions";

export default async function TopicPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const topicId = params.id;
  
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      chapter: {
        include: { subject: true }
      },
      contents: { orderBy: { createdAt: 'desc' } },
      questions: { 
        orderBy: { createdAt: 'desc' },
        include: { options: true }
      },
    }
  });

  if (!topic) return <div>Topic not found</div>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">&larr; Back to Taxonomy</Link>
        <h2 className="text-3xl font-bold">{topic.name}</h2>
        <p className="text-gray-500 mt-1">
          {topic.chapter.subject.name} &gt; {topic.chapter.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Content Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold border-b pb-4 mb-4">Learning Content</h3>
          
          <form action={addContent} className="space-y-4 mb-8 bg-gray-50 p-4 rounded-lg">
            <input type="hidden" name="topicId" value={topic.id} />
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input name="title" required className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select name="contentType" className="w-full border rounded p-2">
                <option value="NOTE">Note</option>
                <option value="FORMULA">Formula Sheet</option>
                <option value="VIDEO_LINK">Video Link</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Body (Markdown)</label>
              <textarea name="body" required rows={4} className="w-full border rounded p-2"></textarea>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">Add Content</button>
          </form>

          <div className="space-y-4">
            {topic.contents.map(content => (
              <div key={content.id} className="border border-gray-200 rounded p-4 relative">
                <form action={deleteContent.bind(null, content.id, topic.id)} className="absolute top-4 right-4">
                  <button type="submit" className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                </form>
                <div className="text-xs font-bold text-gray-400 mb-1">{content.contentType}</div>
                <h4 className="font-semibold text-lg">{content.title}</h4>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{content.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Questions Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold border-b pb-4 mb-4">Question Bank</h3>
          
          <form action={addQuestion} className="space-y-4 mb-8 bg-gray-50 p-4 rounded-lg">
            <input type="hidden" name="topicId" value={topic.id} />
            <div>
              <label className="block text-sm font-medium mb-1">Question Type</label>
              <select name="type" className="w-full border rounded p-2">
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="SAQ">Short Answer (SAQ)</option>
                <option value="LAQ">Long Answer (LAQ)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select name="difficulty" className="w-full border rounded p-2">
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
                <option value="HOTS">HOTS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Question Content</label>
              <textarea name="content" required rows={3} className="w-full border rounded p-2"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">MCQ Options (one per line, if MCQ)</label>
              <textarea name="options" rows={4} placeholder="Option A&#10;Option B&#10;Option C&#10;Option D" className="w-full border rounded p-2"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correct Option Index (0-based)</label>
              <input name="correctOptionIndex" type="number" defaultValue={0} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hint</label>
              <input name="hint" className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Explanation</label>
              <textarea name="explanation" rows={2} className="w-full border rounded p-2"></textarea>
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700">Add Question</button>
          </form>

          <div className="space-y-4">
            {topic.questions.map(q => (
              <div key={q.id} className="border border-gray-200 rounded p-4 relative">
                <form action={deleteQuestion.bind(null, q.id, topic.id)} className="absolute top-4 right-4">
                  <button type="submit" className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                </form>
                <div className="flex gap-2 mb-2">
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{q.questionType}</span>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{q.difficulty}</span>
                </div>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{q.questionText}</p>
                {q.options.length > 0 && (
                  <ul className="mt-3 space-y-1 list-disc list-inside">
                    {q.options.map(opt => (
                      <li key={opt.id} className={`text-sm ${opt.isCorrect ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
                        {opt.content} {opt.isCorrect && '✓'}
                      </li>
                    ))}
                  </ul>
                )}
                {q.officialSolution && (
                  <div className="mt-3 text-sm bg-blue-50 text-blue-800 p-2 rounded">
                    <strong>Explanation:</strong> {q.officialSolution}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
