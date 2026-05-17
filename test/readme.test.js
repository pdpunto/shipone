const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("README documenta el PAT de marketplace", () => {
  const readme = readText("README.md");

  assert.ok(readme.includes("VSCE_PAT"));
  assert.ok(readme.includes("Publish Marketplace"));
});
