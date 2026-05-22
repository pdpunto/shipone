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

  assert.ok(notes.includes("Sin cambios por ahora."));
});

test("build-release-notes puede leer una seccion concreta", () => {
  const notes = runReleaseNotes(["--section", "0.0.6"]);

  assert.ok(notes.includes("AI context with Git summary"));
});
