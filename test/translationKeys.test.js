const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

test("validate-translations.mjs no falla", () => {
  assert.doesNotThrow(() => {
    execFileSync("node", ["scripts/validate-translations.mjs"], {
      cwd: __dirname + "/..",
      stdio: "pipe",
    });
  });
});
