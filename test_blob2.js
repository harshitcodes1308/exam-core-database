const { put } = require("@vercel/blob");
const fs = require("fs");
const envFile = fs.readFileSync(".env", "utf-8");
const tokenLine = envFile.split("\n").find(line => line.startsWith("BLOB_READ_WRITE_TOKEN="));
const token = tokenLine ? tokenLine.split("=")[1].replace(/"/g, "") : null;

async function test() {
  console.log("Token:", token);
  try {
    const blob = await put("diagrams/test.txt", "hello world", { access: 'public', token });
    console.log("Success:", blob);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
