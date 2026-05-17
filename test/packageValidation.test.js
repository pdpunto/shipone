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

test("package.json expone package:vsix", () => {
  const manifest = JSON.parse(require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "package.json"), "utf8"));

  assert.equal(manifest.scripts["package:vsix"], "npx @vscode/vsce package");
});
