const { put } = require("@vercel/blob");
const fs = require("fs");
const envFile = fs.readFileSync(".env", "utf-8");
const tokenLine = envFile.split("\n").find(line => line.startsWith("BLOB_READ_WRITE_TOKEN="));
const token = tokenLine ? tokenLine.split("=")[1].replace(/"/g, "") : null;

async function test() {
  try {
    const blob = await put("test.txt", "hello world", { access: 'private', token });
    console.log("Success:", blob);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
