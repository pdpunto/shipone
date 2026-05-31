const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

function runReleaseNotes(args = []) {
  return execFileSync("node", ["scripts/build-release-notes.mjs", ...args], {
    cwd: __dirname + "/..",
    encoding: "utf8",
  }).trim();
}

test("build-release-notes returns the unreleased block", () => {
  const notes = runReleaseNotes();

  assert.ok(notes.includes("No changes yet."));
});

test("build-release-notes can read a specific section", () => {
  const notes = runReleaseNotes(["--section", "0.0.8"]);

  assert.ok(notes.includes("Added a GitHub import flow"));
  assert.ok(notes.includes("Fixed project deletion"));
  assert.ok(notes.includes("Improved GitHub repo deletion"));
});
