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

  assert.ok(notes.includes("Mejorado el contexto de IA con resumen de Git."));
});

test("build-release-notes puede leer una seccion concreta", () => {
  const notes = runReleaseNotes(["--section", "0.0.5"]);

  assert.ok(notes.includes("safe project deletion"));
});
