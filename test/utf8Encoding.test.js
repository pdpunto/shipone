const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

test("validate-utf8.mjs no falla", () => {
  assert.doesNotThrow(() => {
    execFileSync("node", ["scripts/validate-utf8.mjs"], {
      cwd: __dirname + "/..",
      stdio: "pipe",
    });
  });
});

test("roadmap markdown tiene utf8 valido", () => {
  const filePath = path.join(__dirname, "..", "docs", "shipone-public-release-roadmap.md");
  const content = fs.readFileSync(filePath);
  assert.doesNotThrow(() => {
    new TextDecoder("utf-8", { fatal: true }).decode(content);
  });
});
