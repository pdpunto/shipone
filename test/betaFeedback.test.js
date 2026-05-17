const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("README orienta a recoger feedback de beta", () => {
  const readme = readText("README.md");

  assert.ok(readme.includes("Issues"));
  assert.ok(readme.includes("bug report"));
});

test("onboarding sigue proponiendo el primer paso correcto", () => {
  const onboarding = readText("src/onboarding/showFirstRunOnboarding.ts");

  assert.ok(onboarding.includes("shipone.createProject"));
  assert.ok(onboarding.includes("shipone.connectGithub"));
});
