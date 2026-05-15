const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
}

test("validate-translations.mjs no falla", () => {
  assert.doesNotThrow(() => {
    execFileSync("node", ["scripts/validate-translations.mjs"], {
      cwd: __dirname + "/..",
      stdio: "pipe",
    });
  });
});

test("package.nls.es.json traduce mensajes de salud", () => {
  const es = readJson("package.nls.es.json");

  assert.equal(es.healthy, "saludable");
  assert.equal(es.warning, "con avisos");
  assert.ok(es.bad);
  assert.ok(es["Sin next action"]);
  assert.ok(es["Active sin next action"]);
});

test("package.nls.es.json traduce metricas", () => {
  const es = readJson("package.nls.es.json");

  const metrics = String.fromCharCode(0x004d, 0x00e9, 0x0074, 0x0072, 0x0069, 0x0063, 0x0061, 0x0073);
  const activeProjects = String.fromCharCode(0x0050, 0x0072, 0x006f, 0x0079, 0x0065, 0x0063, 0x0074, 0x006f, 0x0073, 0x0020, 0x0061, 0x0063, 0x0074, 0x0069, 0x0076, 0x006f, 0x0073);
  const pausedProjects = String.fromCharCode(0x0050, 0x0072, 0x006f, 0x0079, 0x0065, 0x0063, 0x0074, 0x006f, 0x0073, 0x0020, 0x0070, 0x0061, 0x0075, 0x0073, 0x0061, 0x0064, 0x006f, 0x0073);
  const finishedProjects = String.fromCharCode(0x0050, 0x0072, 0x006f, 0x0079, 0x0065, 0x0063, 0x0074, 0x006f, 0x0073, 0x0020, 0x0074, 0x0065, 0x0072, 0x006d, 0x0069, 0x006e, 0x0061, 0x0064, 0x006f, 0x0073);
  const finishRatio = String.fromCharCode(0x0052, 0x0061, 0x0074, 0x0069, 0x006f, 0x0020, 0x0064, 0x0065, 0x0020, 0x0066, 0x0069, 0x006e, 0x0061, 0x006c, 0x0069, 0x007a, 0x0061, 0x0063, 0x0069, 0x00f3, 0x006e);

  assert.equal(es["Metrics"], metrics);
  assert.equal(es["Active projects"], activeProjects);
  assert.equal(es["Paused projects"], pausedProjects);
  assert.equal(es["Finished projects"], finishedProjects);
  assert.equal(es["Finish ratio"], finishRatio);
});
