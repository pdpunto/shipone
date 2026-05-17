const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

test("validate-package.mjs no falla", () => {
  assert.doesNotThrow(() => {
    execFileSync("node", ["scripts/validate-package.mjs"], {
      cwd: __dirname + "/..",
      stdio: "pipe",
    });
  });
});
