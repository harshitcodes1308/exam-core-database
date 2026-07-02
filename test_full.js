const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

async function test() {
  try {
    console.log("Running python script...");
    const { stdout, stderr } = await execAsync("src/scripts/venv/bin/python3 src/scripts/extract_paper.py /var/folders/z3/ll1hzn_n3_x7ql3q1x5d4xd80000gn/T/qp_1783013983931.pdf /var/folders/z3/ll1hzn_n3_x7ql3q1x5d4xd80000gn/T/ms_1783013983931.pdf", { maxBuffer: 1024 * 1024 * 50 });
    const data = JSON.parse(stdout);
    if (data.error) throw new Error(data.error);
    
    const qs = data.questions || data;
    const withDiagram = qs.filter(q => q.diagramUrl);
    console.log(`Extracted ${qs.length} questions. ${withDiagram.length} have diagrams.`);
    console.log(withDiagram.map(q => ({ q: q.questionNumber, url: q.diagramUrl })));
  } catch (e) {
    console.error(e);
  }
}
test();
