const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
}

test("package.json publica metadatos para marketplace", () => {
  const manifest = readJson("package.json");

  assert.deepEqual(manifest.keywords, [
    "vscode",
    "productivity",
    "projects",
    "focus",
    "roadmap",
    "ship",
  ]);
  assert.deepEqual(manifest.categories, ["Productivity", "Other"]);
  assert.equal(manifest.repository.url, "https://github.com/pdpunto/shipone.git");
  assert.equal(manifest.homepage, "https://github.com/pdpunto/shipone#readme");
  assert.equal(manifest.bugs.url, "https://github.com/pdpunto/shipone/issues");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.engines.vscode, "^1.90.0");
});

test("package.json configura prettier", () => {
  const manifest = readJson("package.json");

  assert.equal(
    manifest.scripts["format"],
    "prettier --check \"src/**/*.ts\" \"*.json\" \"docs/**/*.md\""
  );
  assert.equal(
    manifest.scripts["format:write"],
    "prettier --write \"src/**/*.ts\" \"*.json\" \"docs/**/*.md\""
  );
});

test("package.json evita acciones duplicadas en la barra superior", () => {
  const manifest = readJson("package.json");
  const titleCommands = manifest.contributes.menus["view/title"].map(
    (entry) => entry.command ?? entry.submenu
  );
  const submenus = manifest.contributes.submenus.map((item) => item.id);
  const itemCommands = manifest.contributes.menus["view/item/context"].map(
    (entry) => entry.command
  );

  assert.deepEqual(titleCommands, [
    "shipone.createProject",
    "shipone.chooseProject",
    "shipone.searchProject",
    "shipone.moreActions",
  ]);
  assert.deepEqual(submenus, ["shipone.moreActions"]);
  assert.equal(
    itemCommands.filter((command) => command === "shipone.editNextAction").length,
    1
  );
});
