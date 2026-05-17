import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".mp3",
  ".mp4",
  ".pdf",
  ".zip",
  ".vsix",
  ".exe",
  ".dll",
  ".node",
]);

const decoder = new TextDecoder("utf-8", { fatal: true });
const root = process.cwd();
const trackedFiles = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);

const failures = [];

for (const relativePath of trackedFiles) {
  const extension = path.extname(relativePath).toLowerCase();
  if (binaryExtensions.has(extension)) {
    continue;
  }

  try {
    const content = await readFile(path.join(root, relativePath));
    decoder.decode(content);
  } catch (error) {
    failures.push({
      path: relativePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

if (failures.length > 0) {
  console.error("UTF-8 validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure.path}: ${failure.error}`);
  }
  process.exitCode = 1;
}
