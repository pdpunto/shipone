const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("vscodeignore excluye codigo fuente y mantiene assets", () => {
  const content = readText(".vscodeignore");

  assert.ok(content.includes("src/**"));
  assert.ok(content.includes("test/**"));
  assert.ok(content.includes("!media/**"));
  assert.ok(content.includes("!README.md"));
  assert.ok(content.includes("!LICENSE"));
});
