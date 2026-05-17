const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

function runSemver(args = []) {
  return execFileSync("node", ["scripts/semver.mjs", ...args], {
    cwd: __dirname + "/..",
    encoding: "utf8",
  }).trim();
}

test("semver current devuelve la version del paquete", () => {
  assert.equal(runSemver(["current"]), "0.0.1");
});

test("semver tag devuelve la release tag", () => {
  assert.equal(runSemver(["tag"]), "v0.0.1");
});

test("semver validate-tag acepta el tag actual", () => {
  assert.equal(runSemver(["validate-tag", "v0.0.1"]), "v0.0.1");
});
