const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

test("validate-utf8.mjs no falla", () => {
  assert.doesNotThrow(() => {
    execFileSync("node", ["scripts/validate-utf8.mjs"], {
      cwd: __dirname + "/..",
      stdio: "pipe",
    });
  });
});
