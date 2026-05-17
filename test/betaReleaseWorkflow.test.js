const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("beta release workflow publica prerelease", () => {
  const workflow = readText(".github/workflows/beta-release.yml");

  assert.ok(workflow.includes('prerelease: true'));
  assert.ok(workflow.includes('v*-beta*'));
  assert.ok(workflow.includes('validate-beta-tag'));
});
