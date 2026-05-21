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
  assert.equal(runSemver(["current"]), "0.0.3");
});

test("semver tag devuelve la release tag", () => {
  assert.equal(runSemver(["tag"]), "v0.0.3");
});

test("semver validate-tag acepta el tag actual", () => {
  assert.equal(runSemver(["validate-tag", "v0.0.3"]), "v0.0.3");
});

test("semver beta-tag genera un prerelease", () => {
  assert.equal(runSemver(["create-beta-tag", "2"]), "v0.0.3-beta.2");
});

test("semver validate-beta-tag acepta un prerelease", () => {
  assert.equal(runSemver(["validate-beta-tag", "v0.0.3-beta.1"]), "v0.0.3-beta.1");
});
