import { put } from "@vercel/blob";
import * as dotenv from "dotenv";
dotenv.config();

async function test() {
  console.log("Token:", process.env.BLOB_READ_WRITE_TOKEN ? "Exists" : "Missing");
  try {
    const blob = await put("test.txt", "hello world", { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
    console.log("Success:", blob);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
