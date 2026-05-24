const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8")
  );
}

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("package.json declara un walkthrough localizado", () => {
  const manifest = readJson("package.json");

  assert.equal(manifest.contributes.walkthroughs.length, 1);

  const walkthrough = manifest.contributes.walkthroughs[0];
  const step = walkthrough.steps[0];

  assert.equal(walkthrough.title, "%walkthrough.gettingStarted.title%");
  assert.equal(
    walkthrough.description,
    "%walkthrough.gettingStarted.description%"
  );
  assert.equal(
    step.title,
    "%walkthrough.gettingStarted.step.createProject.title%"
  );
  assert.equal(
    step.description,
    "%walkthrough.gettingStarted.step.createProject.description%"
  );
  assert.equal(step.media.markdown, "media/walkthrough/getting-started.md");
  assert.deepEqual(step.completionEvents, ["onCommand:shipone.createProject"]);
});

test("walkthrough menciona importacion y scan root", () => {
  const walkthrough = readText("media/walkthrough/getting-started.md");

  assert.ok(walkthrough.includes("Add existing project"));
  assert.ok(walkthrough.includes("Scan projects root"));
  assert.ok(walkthrough.includes("shipone.projectsRoot"));
});
