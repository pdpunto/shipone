const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
}

test("package.nls.es.json no pierde claves respecto al base", () => {
  const base = readJson("package.nls.json");
  const es = readJson("package.nls.es.json");

  const missingKeys = Object.keys(base).filter((key) => !(key in es));
  const extraKeys = Object.keys(es).filter((key) => !(key in base));

  assert.deepEqual(missingKeys, []);
  assert.deepEqual(extraKeys, []);
});
