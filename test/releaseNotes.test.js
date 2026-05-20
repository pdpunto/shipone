const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

function runReleaseNotes(args = []) {
  return execFileSync("node", ["scripts/build-release-notes.mjs", ...args], {
    cwd: __dirname + "/..",
    encoding: "utf8",
  }).trim();
}

test("build-release-notes devuelve el bloque unreleased", () => {
  const notes = runReleaseNotes();

  assert.ok(notes.includes("README public polished."));
  assert.ok(notes.includes("Release documentation prepared."));
});
