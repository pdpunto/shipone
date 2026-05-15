const test = require("node:test");
const assert = require("node:assert/strict");

const { filterProjectsByName, filterProjectsByTag, buildProjectDetail } = require("../out/utils/projectSearch");
const { parseMvpTasks, getFinishedThisWeek, isStaleProject } = require("../out/utils/projectReview");
const {
  isProjectMetadata,
  normalizeProjectMetadata,
  normalizeProjectListWithDiagnostics,
} = require("../out/models/projectValidation");

test("filterProjectsByName busca sin distinguir mayusculas", () => {
  const projects = [
    { name: "ShipOne", tags: [], path: "/a" },
    { name: "API Helper", tags: [], path: "/b" },
  ];

  const result = filterProjectsByName(projects, "ship");

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "ShipOne");
});

test("filterProjectsByTag filtra por etiqueta parcial", () => {
  const projects = [
    { name: "A", tags: ["frontend"], path: "/a" },
    { name: "B", tags: ["backend"], path: "/b" },
  ];

  const result = filterProjectsByTag(projects, "front");

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "A");
});

test("buildProjectDetail junta ruta, etiquetas y next action", () => {
  const detail = buildProjectDetail({
    path: "/tmp/proyecto",
    tags: ["ui", "mvp"],
    nextAction: "Crear login",
  });

  assert.equal(detail, "/tmp/proyecto · Etiquetas: ui, mvp · Siguiente: Crear login");
});

test("parseMvpTasks conserva tareas existentes", () => {
  const currentTasks = [
    { id: "1", text: "Login", done: true },
    { id: "2", text: "Dashboard", done: false },
  ];

  const result = parseMvpTasks("Login, Deploy", currentTasks);

  assert.equal(result.length, 2);
  assert.equal(result[0].id, "1");
  assert.equal(result[0].done, true);
  assert.equal(result[1].text, "Deploy");
  assert.equal(result[1].done, false);
});

test("normalizeProjectMetadata rellena campos opcionales", () => {
  const project = normalizeProjectMetadata({
    id: "p1",
    name: "ShipOne",
    description: "Test",
    type: "blank",
    status: "idea",
    path: "/tmp/shipone",
    createdAt: "2026-05-15T00:00:00.000Z",
  });

  assert.ok(project);
  assert.equal(project.schemaVersion, 2);
  assert.equal(project.favorite, false);
  assert.deepEqual(project.tags, []);
  assert.deepEqual(project.mvpTasks, []);
});

test("normalizeProjectMetadata migra schema viejo", () => {
  const project = normalizeProjectMetadata({
    schemaVersion: 1,
    id: "p1",
    name: "ShipOne",
    description: "Test",
    type: "blank",
    status: "idea",
    path: "/tmp/shipone",
    createdAt: "2026-05-15T00:00:00.000Z",
    tags: ["ui", "ui", 123],
  });

  assert.ok(project);
  assert.equal(project.schemaVersion, 2);
  assert.deepEqual(project.tags, ["ui"]);
});

test("normalizeProjectListWithDiagnostics marca corrupcion", () => {
  const result = normalizeProjectListWithDiagnostics([
    {
      id: "p1",
      name: "Valido",
      description: "Test",
      type: "blank",
      status: "idea",
      path: "/tmp/a",
      createdAt: "2026-05-15T00:00:00.000Z",
    },
    {
      id: "p2",
      name: 123,
    },
  ]);

  assert.equal(result.projects.length, 1);
  assert.equal(result.corrupted, true);
});

test("isProjectMetadata rechaza esquema invalido anidado", () => {
  assert.equal(
    isProjectMetadata({
      schemaVersion: 1,
      id: "p1",
      name: "Valido",
      description: "Test",
      type: "blank",
      status: "idea",
      path: "/tmp/a",
      createdAt: "2026-05-15T00:00:00.000Z",
      tags: ["ok", 123],
      mvpTasks: [{ id: "1", text: "Login", done: "no" }],
    }),
    false
  );
});

test("isStaleProject marca proyecto activo viejo", () => {
  const today = new Date();
  const oldDate = new Date(today.getTime() - 15 * 86_400_000).toISOString();

  assert.equal(
    isStaleProject({
      status: "active",
      lastOpenedAt: oldDate,
    }),
    true
  );
});

test("getFinishedThisWeek devuelve solo recientes", () => {
  const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const old = new Date(Date.now() - 10 * 86_400_000).toISOString();

  const result = getFinishedThisWeek([
    { status: "finished", finishedAt: recent },
    { status: "finished", finishedAt: old },
    { status: "idea" },
  ]);

  assert.equal(result.length, 1);
});
