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

test("json del repo tiene utf8 valido", () => {
  const files = ["package.json", "package-lock.json", "package.nls.json", "package.nls.es.json", "tsconfig.json"];
  for (const relativePath of files) {
    const filePath = path.join(__dirname, "..", relativePath);
    const content = fs.readFileSync(filePath);
    assert.doesNotThrow(() => {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(content);
      JSON.parse(text);
    }, relativePath);
  }
});

test("typescript del repo tiene utf8 valido", () => {
  const root = path.join(__dirname, "..");
  const files = execFileSync("git", ["ls-files", "*.ts"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);

  for (const relativePath of files) {
    const filePath = path.join(root, relativePath);
    const content = fs.readFileSync(filePath);
    assert.doesNotThrow(() => {
      new TextDecoder("utf-8", { fatal: true }).decode(content);
    }, relativePath);
  }
});
