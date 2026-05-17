const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
}

test("package.json publica metadatos para marketplace", () => {
  const manifest = readJson("package.json");

  assert.deepEqual(manifest.keywords, [
    "vscode",
    "productivity",
    "projects",
    "focus",
    "roadmap",
    "ship",
  ]);
  assert.deepEqual(manifest.categories, ["Productivity", "Other"]);
  assert.equal(manifest.repository.url, "https://github.com/pdpunto/shipone.git");
  assert.equal(manifest.homepage, "https://github.com/pdpunto/shipone#readme");
  assert.equal(manifest.bugs.url, "https://github.com/pdpunto/shipone/issues");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.engines.vscode, "^1.90.0");
});
