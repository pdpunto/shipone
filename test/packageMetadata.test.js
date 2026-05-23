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
  assert.deepEqual(manifest.categories, ["Other"]);
  assert.equal(manifest.repository.url, "https://github.com/pdpunto/shipone.git");
  assert.equal(manifest.homepage, "https://github.com/pdpunto/shipone#readme");
  assert.equal(manifest.bugs.url, "https://github.com/pdpunto/shipone/issues");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.engines.vscode, "^1.115.0");
  assert.equal(manifest.devDependencies["@types/node"], "25.7.0");
  assert.equal(manifest.devDependencies.typescript, "6.0.3");
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

test("package.json valida utf8", () => {
  const manifest = readJson("package.json");

  assert.equal(manifest.scripts["validate:utf8"], "node scripts/validate-utf8.mjs");
  assert.ok(manifest.scripts["test"].includes("test/utf8Encoding.test.js"));
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
  assert.ok(manifest.contributes.menus["shipone.moreActions"].some((entry) => entry.command === "shipone.editNextAction"));
  assert.equal(
    itemCommands.filter((command) => command === "shipone.editNextAction").length,
    1
  );
});

test("package.json expone atajos keyboard-first", () => {
  const manifest = readJson("package.json");
  const keybindings = manifest.contributes.keybindings;

  assert.deepEqual(
    keybindings.map((binding) => binding.command),
    [
      "shipone.weeklyReview",
      "shipone.exportWeeklyReviewSummary",
      "shipone.generateAiContext",
      "shipone.syncStatusFile",
      "shipone.createReadme",
      "shipone.initializeGit",
      "shipone.editNextAction",
    ]
  );
  assert.equal(keybindings[0].key, "ctrl+alt+w");
  assert.equal(keybindings[1].key, "ctrl+alt+shift+w");
  assert.equal(keybindings[2].key, "ctrl+alt+c");
  assert.equal(keybindings[3].key, "ctrl+alt+s");
  assert.equal(keybindings[4].key, "ctrl+alt+r");
  assert.equal(keybindings[5].key, "ctrl+alt+i");
  assert.equal(keybindings[6].key, "ctrl+alt+n");
});
