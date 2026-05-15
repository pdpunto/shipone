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
  assert.equal(es.bad, "crítico");
  assert.equal(es["Sin next action"], "Sin siguiente acción");
  assert.equal(
    es["Active sin next action"],
    "Proyecto activo sin siguiente acción"
  );
});
