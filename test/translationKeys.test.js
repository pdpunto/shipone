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

test("package.nls.es.json traduce foco", () => {
  const es = readJson("package.nls.es.json");
  const oAcute = String.fromCharCode(0x00f3);

  assert.equal(es["Focus mode activado."], "Modo enfoque activado.");
  assert.equal(es["Focus mode desactivado."], "Modo enfoque desactivado.");
  assert.equal(es["Weekly review"], `Revisi${oAcute}n semanal`);
  assert.equal(
    es["Siguiente accion para el proyecto activo"],
    `Siguiente acci${oAcute}n para el proyecto activo`
  );
  assert.equal(es["Focus mode"], "Modo enfoque");
  assert.equal(es["Siguiente accion"], `Siguiente acci${oAcute}n`);
});

test("package.nls.es.json traduce revision semanal", () => {
  const es = readJson("package.nls.es.json");
  const oAcute = String.fromCharCode(0x00f3);
  const aAcute = String.fromCharCode(0x00e1);
  const eAcute = String.fromCharCode(0x00e9);

  assert.equal(
    es["command.weeklyReview.title"],
    `ShipOne: Revisi${oAcute}n semanal`
  );
  assert.equal(es["Weekly review"], `Revisi${oAcute}n semanal`);
  assert.equal(
    es["Siguiente accion para el proyecto activo"],
    `Siguiente acci${oAcute}n para el proyecto activo`
  );
  assert.equal(es["Revisar login"], "Revisar inicio de sesi\u00f3n");
  assert.equal(es["## Next action"], `## Siguiente acci${oAcute}n`);
});

test("package.nls.es.json traduce congelar y reanudar", () => {
  const es = readJson("package.nls.es.json");
  const aAcute = String.fromCharCode(0x00e1);
  const eAcute = String.fromCharCode(0x00e9);

  assert.equal(es["command.freezeProject.title"], "ShipOne: Congelar proyecto");
  assert.equal(es["command.resumeProject.title"], "ShipOne: Reanudar proyecto");
  assert.equal(es["Congelar proyecto"], "Congelar proyecto");
  assert.equal(es["Motivo de la pausa"], "Motivo de la pausa");
  assert.equal(es["Que haras al volver"], "Que haras al volver");
  assert.equal(es["Nota de pausa"], "Nota de pausa");
  assert.equal(es["Proyecto congelado: {0}."], "Proyecto congelado: {0}.");
  assert.equal(es["Pausado"], "Pausado");
  assert.equal(es["Reanudar proyecto"], "Reanudar proyecto");
  assert.equal(es["Proyecto reanudado: {0}."], "Proyecto reanudado: {0}.");
});

test("package.nls.es.json traduce confirmaciones de continuar", () => {
  const es = readJson("package.nls.es.json");

  assert.equal(es["Seguir sin GitHub"], "Seguir sin GitHub");
  assert.equal(es["Seguir sin Git"], "Seguir sin Git");
  assert.equal(es["Seguir sin commit"], "Seguir sin commit");
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
