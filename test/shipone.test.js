const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const {
  filterProjectsByName,
  filterProjectsByTag,
  buildProjectDetail,
} = require("../out/utils/projectSearch");
const {
  parseMvpTasks,
  getFinishedThisWeek,
  isStaleProject,
} = require("../out/utils/projectReview");
const {
  isProjectMetadata,
  createProjectMetadata,
  normalizeProjectMetadata,
  normalizeProjectListWithDiagnostics,
} = require("../out/models/projectValidation");
const {
  describeInactivityWarning,
  getInactivityWarning,
} = require("../out/utils/inactivityWarning");

const STORAGE_ROOT = "C:\\tmp\\shipone-storage";

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

  assert.equal(
    detail,
    "/tmp/proyecto \u00b7 Etiquetas: ui, mvp \u00b7 Siguiente: Crear login"
  );
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

test("createProjectMetadata fija valores base", () => {
  const project = createProjectMetadata({
    id: "p1",
    name: "ShipOne",
    description: "Test",
    type: "blank",
    status: "idea",
    path: "/tmp/shipone",
    createdAt: "2026-05-15T00:00:00.000Z",
  });

  assert.equal(project.schemaVersion, 2);
  assert.equal(project.favorite, false);
  assert.deepEqual(project.tags, []);
  assert.deepEqual(project.mvpTasks, []);
  assert.equal(project.repoUrl, null);
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

test("ProjectStoreService guarda y carga metadata", async () => {
  const fsState = createMemoryFs();
  const vscodeApi = createMockVscodeForStorage(fsState);
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return vscodeApi;
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/services/projectStoreService")];
    const { ProjectStoreService } = require("../out/services/projectStoreService");
    const service = new ProjectStoreService({
      globalStorageUri: vscodeApi.Uri.file(STORAGE_ROOT),
    });
    const storageFile = storageFilePath(STORAGE_ROOT);

    const project = createProjectMetadata({
      id: "p1",
      name: "ShipOne",
      description: "Test",
      type: "blank",
      status: "idea",
      path: "/tmp/shipone",
      createdAt: "2026-05-15T00:00:00.000Z",
    });

    await service.saveProjects([project]);
    const projects = await service.loadProjects();

    assert.equal(projects.length, 1);
    assert.equal(projects[0].id, "p1");
    assert.equal(projects[0].schemaVersion, 2);
    assert.equal(
      fsState.files.get(storageFile).toString("utf8"),
      JSON.stringify({ version: 2, projects: [project] }, null, 2)
    );
  } finally {
    Module._load = originalLoad;
  }
});

test("ProjectStoreService recupera desde backup", async () => {
  const fsState = createMemoryFs();
  const vscodeApi = createMockVscodeForStorage(fsState);
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return vscodeApi;
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/services/projectStoreService")];
    const { ProjectStoreService } = require("../out/services/projectStoreService");
    const service = new ProjectStoreService({
      globalStorageUri: vscodeApi.Uri.file(STORAGE_ROOT),
    });
    const storageFile = storageFilePath(STORAGE_ROOT);
    const backupFile = storageBackupPath(STORAGE_ROOT);

    fsState.files.set(storageFile, Buffer.from("{bad json", "utf8"));
    fsState.files.set(
      backupFile,
      Buffer.from(
        JSON.stringify({
          version: 2,
          projects: [
            {
              schemaVersion: 2,
              id: "p1",
              name: "Backup",
              description: "Test",
              type: "blank",
              status: "idea",
              path: "/tmp/backup",
              createdAt: "2026-05-15T00:00:00.000Z",
            },
          ],
        }),
        "utf8"
      )
    );

    const projects = await service.loadProjects();

    assert.equal(projects.length, 1);
    assert.equal(projects[0].name, "Backup");
    assert.deepEqual(
      JSON.parse(fsState.files.get(storageFile).toString("utf8")),
      {
        version: 2,
        projects: [
          {
            schemaVersion: 2,
            id: "p1",
            name: "Backup",
            description: "Test",
            type: "blank",
            status: "idea",
            path: "/tmp/backup",
            createdAt: "2026-05-15T00:00:00.000Z",
            favorite: false,
            tags: [],
            mvpTasks: [],
          },
        ],
      }
    );
  } finally {
    Module._load = originalLoad;
  }
});

test("ProjectStoreService migra metadata vieja", async () => {
  const fsState = createMemoryFs();
  const vscodeApi = createMockVscodeForStorage(fsState);
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return vscodeApi;
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/services/projectStoreService")];
    const { ProjectStoreService } = require("../out/services/projectStoreService");
    const service = new ProjectStoreService({
      globalStorageUri: vscodeApi.Uri.file(STORAGE_ROOT),
    });
    const storageFile = storageFilePath(STORAGE_ROOT);

    fsState.files.set(
      storageFile,
      Buffer.from(
        JSON.stringify([
          {
            id: "p1",
            name: "Legacy",
            description: "Test",
            type: "blank",
            status: "idea",
            path: "/tmp/legacy",
            createdAt: "2026-05-15T00:00:00.000Z",
          },
        ]),
        "utf8"
      )
    );

    const projects = await service.loadProjects();

    assert.equal(projects.length, 1);
    assert.equal(projects[0].schemaVersion, 2);
    const stored = JSON.parse(fsState.files.get(storageFile).toString("utf8"));
    assert.equal(stored.version, 2);
    assert.equal(stored.projects[0].schemaVersion, 2);
  } finally {
    Module._load = originalLoad;
  }
});

test("ProjectStoreService marca metadata corrupta", async () => {
  const fsState = createMemoryFs();
  const vscodeApi = createMockVscodeForStorage(fsState);
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return vscodeApi;
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/services/projectStoreService")];
    const { ProjectStoreService } = require("../out/services/projectStoreService");
    const service = new ProjectStoreService({
      globalStorageUri: vscodeApi.Uri.file(STORAGE_ROOT),
    });
    const storageFile = storageFilePath(STORAGE_ROOT);

    fsState.files.set(
      storageFile,
      Buffer.from(
        JSON.stringify([
          {
            id: "p1",
            name: "Broken",
            description: "Test",
            type: "blank",
            status: "oops",
            path: "/tmp/broken",
            createdAt: "2026-05-15T00:00:00.000Z",
          },
        ]),
        "utf8"
      )
    );

    const projects = await service.loadProjects();

    assert.equal(projects.length, 0);
    assert.equal(vscodeApi.__messages.warning.length > 0, true);
  } finally {
    Module._load = originalLoad;
  }
});

test("ProjectStoreService aplica una sola activo", async () => {
  const fixture = createStoreServiceFixture([
    createProjectMetadata({
      id: "p1",
      name: "Uno",
      description: "Test",
      type: "blank",
      status: "active",
      path: "/tmp/uno",
      createdAt: "2026-05-15T00:00:00.000Z",
    }),
  ]);

  try {
    const newProject = createProjectMetadata({
      id: "p2",
      name: "Dos",
      description: "Test",
      type: "blank",
      status: "active",
      path: "/tmp/dos",
      createdAt: "2026-05-15T00:00:00.000Z",
    });

    await fixture.service.createProject(newProject, true);

    const projects = await fixture.service.loadProjects();
    const active = projects.filter((project) => project.status === "active");
    const paused = projects.filter((project) => project.status === "paused");

    assert.equal(active.length, 1);
    assert.equal(active[0].id, "p2");
    assert.equal(paused.length, 1);
    assert.equal(paused[0].id, "p1");
    assert.equal(
      JSON.parse(fixture.fsState.files.get(fixture.storageFile).toString("utf8"))
        .projects.length,
      2
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("ProjectStoreService cambia estado y limpia pausa", async () => {
  const fixture = createStoreServiceFixture([
    createProjectMetadata({
      id: "p1",
      name: "Uno",
      description: "Test",
      type: "blank",
      status: "paused",
      path: "/tmp/uno",
      createdAt: "2026-05-15T00:00:00.000Z",
      pauseReason: "Esperando feedback",
      pauseNote: "Revisar login",
    }),
    createProjectMetadata({
      id: "p2",
      name: "Dos",
      description: "Test",
      type: "blank",
      status: "active",
      path: "/tmp/dos",
      createdAt: "2026-05-15T00:00:00.000Z",
    }),
  ]);

  try {
    await fixture.service.setProjectStatus("p1", "active", true);

    const projects = await fixture.service.loadProjects();
    const target = projects.find((project) => project.id === "p1");
    const other = projects.find((project) => project.id === "p2");

    assert.equal(target.status, "active");
    assert.equal(target.pauseReason, null);
    assert.equal(target.pauseNote, null);
    assert.equal(typeof target.lastOpenedAt, "string");
    assert.equal(other.status, "paused");
  } finally {
    fixture.restoreLoad();
  }
});

test("ProjectStoreService finaliza proyectos", async () => {
  const fixture = createStoreServiceFixture([
    createProjectMetadata({
      id: "p1",
      name: "Uno",
      description: "Test",
      type: "blank",
      status: "active",
      path: "/tmp/uno",
      createdAt: "2026-05-15T00:00:00.000Z",
      pauseReason: "Esperando feedback",
      pauseNote: "Revisar login",
    }),
  ]);

  try {
    await fixture.service.setProjectStatus("p1", "finished", true);

    const project = await fixture.service.getProject("p1");
    assert.equal(project.status, "finished");
    assert.equal(project.pauseReason, null);
    assert.equal(project.pauseNote, null);
    assert.equal(project.finishedAt !== null, true);
  } finally {
    fixture.restoreLoad();
  }
});

test("ProjectStoreService mantiene pausa al pausar", async () => {
  const fixture = createStoreServiceFixture([
    createProjectMetadata({
      id: "p1",
      name: "Uno",
      description: "Test",
      type: "blank",
      status: "active",
      path: "/tmp/uno",
      createdAt: "2026-05-15T00:00:00.000Z",
      pauseReason: "Esperando feedback",
      pauseNote: "Revisar login",
    }),
  ]);

  try {
    await fixture.service.setProjectStatus("p1", "paused", true);

    const project = await fixture.service.getProject("p1");
    assert.equal(project.status, "paused");
    assert.equal(project.pauseReason, "Esperando feedback");
    assert.equal(project.pauseNote, "Revisar login");
    assert.equal(project.finishedAt, null);
  } finally {
    fixture.restoreLoad();
  }
});

test("ProjectStoreService congela proyectos", async () => {
  const fixture = createStoreServiceFixture([
    createProjectMetadata({
      id: "p1",
      name: "Uno",
      description: "Test",
      type: "blank",
      status: "active",
      path: "/tmp/uno",
      createdAt: "2026-05-15T00:00:00.000Z",
      nextAction: "Crear login",
    }),
  ]);

  try {
    await fixture.service.freezeProject(
      "p1",
      "Esperando feedback",
      "Retomar login",
      "Bloqueado por dependencias externas"
    );

    const project = await fixture.service.getProject("p1");
    assert.equal(project.status, "paused");
    assert.equal(project.pauseReason, "Esperando feedback");
    assert.equal(project.pauseNote, "Bloqueado por dependencias externas");
    assert.equal(project.nextAction, "Retomar login");
    assert.equal(project.finishedAt, null);
  } finally {
    fixture.restoreLoad();
  }
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

test("describeInactivityWarning muestra un texto legible", () => {
  const oldDate = new Date(Date.now() - 15 * 86_400_000).toISOString();

  assert.equal(
    describeInactivityWarning(oldDate, 7, 30),
    "Inactivo hace 15 días"
  );
  assert.equal(
    describeInactivityWarning(oldDate, 7, 10),
    "Obsoleto hace 15 días"
  );
});

test("getInactivityWarning detecta proyectos inactivos", () => {
  const oldDate = new Date(Date.now() - 15 * 86_400_000).toISOString();

  assert.equal(getInactivityWarning(oldDate, 7, 30), "inactive 15d");
  assert.equal(getInactivityWarning(oldDate, 7, 10), "stale 15d");
  assert.equal(getInactivityWarning(undefined, 7, 30), null);
});

test("validateProjectName rechaza nombres vacios e invalidos", () => {
  const originalLoad = Module._load;
  const vscodeApi = createMockVscodeForGenericFs(createMemoryFs());

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return vscodeApi;
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/services/projectCreationService")];
    const { validateProjectName } = require("../out/services/projectCreationService");

    assert.equal(validateProjectName(""), "Escribe un nombre.");
    assert.equal(
      validateProjectName("Proyecto: Malo"),
      "Usa solo letras, numeros, espacios, guiones o puntos."
    );
    assert.equal(validateProjectName("ShipOne"), undefined);
  } finally {
    Module._load = originalLoad;
  }
});

test("sanitizeFolderName limpia caracteres raros", () => {
  const originalLoad = Module._load;
  const vscodeApi = createMockVscodeForGenericFs(createMemoryFs());

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return vscodeApi;
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/services/projectCreationService")];
    const { sanitizeFolderName } = require("../out/services/projectCreationService");

    assert.equal(sanitizeFolderName(" Mi proyecto/1 "), "Mi-proyecto-1");
  } finally {
    Module._load = originalLoad;
  }
});

test("sanitizePackageName normaliza nombre npm", () => {
  const fixture = createTemplateServiceFixture();

  try {
    delete require.cache[require.resolve("../out/services/templateService")];
    const { sanitizePackageName } = require("../out/services/templateService");

    assert.equal(sanitizePackageName("Mi Proyecto API!"), "mi-proyecto-api");
  } finally {
    fixture.restoreLoad();
  }
});

test("TemplateService resuelve plantilla personalizada", async () => {
  const fixture = createTemplateServiceFixture();

  try {
    delete require.cache[require.resolve("../out/services/templateService")];
    const { TemplateService } = require("../out/services/templateService");
    fixture.files.set(
      "C:\\templates\\react-vite\\src\\App.tsx",
      Buffer.from("console.log(\"custom\");", "utf8")
    );

    const service = new TemplateService();
    await service.createSelectedTemplate(
      fixture.vscode.Uri.file("C:\\dest"),
      "ShipOne App",
      "Test",
      "react-vite",
      "npm",
      "C:\\templates"
    );

    assert.equal(
      fixture.files.get("C:\\dest\\src\\App.tsx").toString("utf8"),
      "console.log(\"custom\");"
    );
    assert.equal(
      fixture.files.get("C:\\dest\\package.json").includes("shipone-app"),
      true
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("TodoScannerService encuentra TODO y FIXME", async () => {
  const fixture = createTodoScannerFixture();

  try {
    fixture.directories.set("C:\\repo", [
      ["README.md", fixture.vscode.FileType.File],
      ["src", fixture.vscode.FileType.Directory],
    ]);
    fixture.directories.set("C:\\repo\\src", [
      ["app.ts", fixture.vscode.FileType.File],
    ]);
    fixture.files.set(
      "C:\\repo\\README.md",
      Buffer.from("TODO: revisar\ntexto\nFIXME arreglar", "utf8")
    );
    fixture.files.set(
      "C:\\repo\\src\\app.ts",
      Buffer.from("const x = 1; // FIXME ajustar", "utf8")
    );

    delete require.cache[require.resolve("../out/services/todoScannerService")];
    const { TodoScannerService } = require("../out/services/todoScannerService");
    const service = new TodoScannerService();
    const tasks = await service.scanProjectTodoTasks("C:\\repo");

    assert.equal(tasks.length, 3);
    assert.equal(tasks[0].kind, "TODO");
    assert.equal(tasks[1].kind, "FIXME");
    assert.equal(tasks[2].kind, "FIXME");
  } finally {
    fixture.restoreLoad();
  }
});

test("ProjectHealthService detecta README faltante", async () => {
  const fixture = createHealthServiceFixture({
    readmeExists: false,
    gitTimestamp: Date.now(),
  });

  try {
    const project = fixture.buildProject({
      id: "p1",
      name: "ShipOne",
      description: "Test",
      type: "blank",
      status: "active",
      path: "C:\\tmp\\shipone",
      createdAt: "2026-05-15T00:00:00.000Z",
      nextAction: "Crear login",
    });

    const health = await fixture.service.buildProjectHealth(project, 7, 30);

    assert.equal(health.label, "warning");
    assert.ok(health.issues.includes("no-readme"));
  } finally {
    fixture.restoreLoad();
  }
});

test("ProjectHealthService detecta Git viejo", async () => {
  const oldTimestamp = Date.now() - 40 * 86_400_000;
  const fixture = createHealthServiceFixture({
    readmeExists: true,
    gitTimestamp: oldTimestamp,
  });

  try {
    const project = fixture.buildProject({
      id: "p1",
      name: "ShipOne",
      description: "Test",
      type: "blank",
      status: "active",
      path: "C:\\tmp\\shipone",
      createdAt: "2026-05-15T00:00:00.000Z",
      nextAction: "Crear login",
    });

    const health = await fixture.service.buildProjectHealth(project, 7, 30);

    assert.equal(health.label, "warning");
    assert.deepEqual(health.issues, ["no-recent-commits"]);
  } finally {
    fixture.restoreLoad();
  }
});

test("ProjectHealthService detecta next action faltante", async () => {
  const fixture = createHealthServiceFixture({
    readmeExists: true,
    gitTimestamp: Date.now(),
  });

  try {
    const project = fixture.buildProject({
      id: "p1",
      name: "ShipOne",
      description: "Test",
      type: "blank",
      status: "idea",
      path: "C:\\tmp\\shipone",
      createdAt: "2026-05-15T00:00:00.000Z",
    });

    const health = await fixture.service.buildProjectHealth(project, 7, 30);

    assert.equal(health.label, "warning");
    assert.ok(health.issues.includes("missing-next-action"));
  } finally {
    fixture.restoreLoad();
  }
});

test("buildProjectDescription muestra la salud visible", () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          l10n: {
            t: () => "",
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/localization/localizationService")];
    delete require.cache[require.resolve("../out/localization/index")];
    delete require.cache[require.resolve("../out/providers/projectHealthRenderer")];

    const { ProjectHealthRenderer } = require("../out/providers/projectHealthRenderer");
    const renderer = new ProjectHealthRenderer();

    const description = renderer.buildProjectDescription(
      {
        type: "blank",
        nextAction: "Crear login",
      },
      { label: "warning", issues: ["missing-next-action"] },
      "Inactivo hace 15 días"
    );

    assert.equal(
      description,
      "Blank · Salud: warning · Siguiente: Crear login · Inactivo hace 15 días"
    );
  } finally {
    Module._load = originalLoad;
  }
});

test("getRootNodes en focus mode muestra un unico nodo", async () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return createMockVscode();
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/providers/treeRendererService")];
    delete require.cache[require.resolve("../out/providers/treeNodes/focusNode")];

    const { TreeRendererService } = require("../out/providers/treeRendererService");

    const renderer = new TreeRendererService(
      {
        loadProjects: async () => [
          {
            id: "p1",
            name: "ShipOne",
            description: "Test",
            type: "blank",
            status: "active",
            path: "/tmp/shipone",
            createdAt: "2026-05-15T00:00:00.000Z",
            lastOpenedAt: "2026-05-01T00:00:00.000Z",
            nextAction: "Crear login",
          },
        ],
        getProjectsByStatus: async () => ({}),
      },
      {
        getSettings: () => ({
          inactiveWarningDays: 7,
          staleWarningDays: 30,
          showFinishedProjects: true,
        }),
      },
      {
        buildProjectHealth: async () => ({
          label: "warning",
          issues: ["missing-next-action"],
        }),
        getMetrics: () => ({
          total: 1,
          idea: 0,
          active: 1,
          paused: 0,
          finished: 0,
          finishRatio: 0,
        }),
        getInactivityWarning: () => null,
      },
      {
        getFocusIcon: () => "eye",
        getGroupIcon: () => "play",
        getMetricsIcon: () => "graph",
        getMetricItemIcon: () => "symbol-numeric",
        getEmptyStateIcon: () => "info",
        getWarningIcon: () => "alert",
        getProjectIcon: () => "eye",
      },
      {
        buildFocusTooltip: () => "tooltip",
        buildGroupTooltip: () => "tooltip",
        buildEmptyStateTooltip: () => "tooltip",
        buildWarningTooltip: () => "tooltip",
        buildProjectTooltip: () => "tooltip",
      },
      {
        buildProjectDescription: () => "Modo foco: ShipOne · Siguiente: Crear login",
      }
    );

    const nodes = await renderer.getRootNodes(true);

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].label, "Focus mode: ShipOne");
    assert.equal(
      nodes[0].description,
      "Modo foco: ShipOne · Siguiente: Crear login"
    );
  } finally {
    Module._load = originalLoad;
  }
});

test("buildPausedProjectDescription muestra contexto de pausa", () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          l10n: {
            t: () => "",
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/localization/localizationService")];
    delete require.cache[require.resolve("../out/localization/index")];
    delete require.cache[require.resolve("../out/utils/projectReviewDisplay")];

    const { buildPausedProjectDescription } = require("../out/utils/projectReviewDisplay");

    assert.equal(
      buildPausedProjectDescription(
        "Esperando feedback",
        "Retomar login",
        "Bloqueado por dependencias externas"
      ),
      "Pausado · Motivo: Esperando feedback · Siguiente: Retomar login · Nota: Bloqueado por dependencias externas"
    );
  } finally {
    Module._load = originalLoad;
  }
});

function createMockVscode() {
  return {
    l10n: {
      t: formatMessage,
    },
    TreeItem: class {
      constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
      }
    },
    TreeItemCollapsibleState: {
      None: 0,
    },
    ThemeIcon: class {
      constructor(id) {
        this.id = id;
      }
    },
  };
}

function createMockVscodeForStorage(fsState) {
  const messages = {
    warning: [],
    error: [],
    info: [],
  };

  const uriApi = {
    file: (value) => ({
      fsPath: value,
      toString: () => value,
    }),
    joinPath: (base, ...parts) => {
      const joined = require("node:path").win32.join(base.fsPath, ...parts);
      return uriApi.file(joined);
    },
  };

  return {
    __messages: messages,
    l10n: {
      t: formatMessage,
    },
    Uri: uriApi,
    TreeItem: class {
      constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
      }
    },
    TreeItemCollapsibleState: {
      None: 0,
    },
    ThemeIcon: class {
      constructor(id) {
        this.id = id;
      }
    },
    window: {
      createOutputChannel: () => ({
        appendLine: () => {},
      }),
      showWarningMessage: async (...args) => {
        messages.warning.push(args);
        return undefined;
      },
      showErrorMessage: async (...args) => {
        messages.error.push(args);
        return undefined;
      },
      showInformationMessage: async (...args) => {
        messages.info.push(args);
        return undefined;
      },
    },
    workspace: {
      fs: {
        createDirectory: async () => {},
        readFile: async (uri) => {
          const file = fsState.files.get(uri.fsPath);
          if (!file) {
            throw new Error("ENOENT");
          }

          return file;
        },
        writeFile: async (uri, data) => {
          fsState.files.set(uri.fsPath, Buffer.from(data));
        },
        rename: async (from, to) => {
          const data = fsState.files.get(from.fsPath);
          if (!data) {
            throw new Error("ENOENT");
          }

          fsState.files.set(to.fsPath, Buffer.from(data));
          fsState.files.delete(from.fsPath);
        },
        copy: async (from, to) => {
          const data = fsState.files.get(from.fsPath);
          if (!data) {
            throw new Error("ENOENT");
          }

          fsState.files.set(to.fsPath, Buffer.from(data));
        },
        stat: async (uri) => {
          if (!fsState.files.has(uri.fsPath)) {
            throw new Error("ENOENT");
          }
        },
        delete: async (uri) => {
          fsState.files.delete(uri.fsPath);
        },
      },
    },
  };
}

function createMockVscodeForHealth(readmeExists) {
  const uriApi = {
    file: (value) => ({
      fsPath: value,
      toString: () => value,
    }),
    joinPath: (base, ...parts) => {
      const joined = require("node:path").win32.join(base.fsPath, ...parts);
      return uriApi.file(joined);
    },
  };

  return {
    l10n: {
      t: formatMessage,
    },
    Uri: uriApi,
    workspace: {
      fs: {
        stat: async (uri) => {
          if (readmeExists && uri.fsPath.endsWith("README.md")) {
            return true;
          }

          throw new Error("ENOENT");
        },
      },
    },
  };
}

function createMemoryFs() {
  return {
    files: new Map(),
    dirs: new Set(),
    directories: new Map(),
  };
}

function createTemplateServiceFixture() {
  const fsState = createMemoryFs();
  const originalLoad = Module._load;
  const vscodeApi = createMockVscodeForGenericFs(fsState);

  fsState.dirs.add("C:\\templates");
  fsState.dirs.add("C:\\templates\\react-vite");
  fsState.dirs.add("C:\\templates\\react-vite\\src");
  fsState.directories.set("C:\\templates", [
    ["react-vite", vscodeApi.FileType.Directory],
  ]);
  fsState.directories.set("C:\\templates\\react-vite", [
    ["src", vscodeApi.FileType.Directory],
  ]);
  fsState.directories.set("C:\\templates\\react-vite\\src", [
    ["App.tsx", vscodeApi.FileType.File],
  ]);
  fsState.files.set(
    "C:\\templates\\react-vite\\src\\App.tsx",
    Buffer.from("console.log(\"custom\");", "utf8")
  );

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeApi;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  return {
    files: fsState.files,
    directories: fsState.directories,
    vscode: vscodeApi,
    restoreLoad: () => {
      Module._load = originalLoad;
    },
  };
}

function createTodoScannerFixture() {
  const fsState = createMemoryFs();
  const originalLoad = Module._load;
  const vscodeApi = createMockVscodeForGenericFs(fsState);

  fsState.dirs.add("C:\\repo");
  fsState.dirs.add("C:\\repo\\src");
  fsState.directories.set("C:\\repo", [
    ["README.md", vscodeApi.FileType.File],
    ["src", vscodeApi.FileType.Directory],
  ]);
  fsState.directories.set("C:\\repo\\src", []);

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeApi;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  return {
    files: fsState.files,
    directories: fsState.directories,
    restoreLoad: () => {
      Module._load = originalLoad;
    },
    vscode: vscodeApi,
  };
}

function createMockVscodeForGenericFs(fsState) {
  const uriApi = {
    file: (value) => ({
      fsPath: value,
      toString: () => value,
    }),
    joinPath: (base, ...parts) => {
      const joined = require("node:path").win32.join(base.fsPath, ...parts);
      return uriApi.file(joined);
    },
  };

  const FileType = {
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
  };

  return {
    l10n: {
      t: formatMessage,
    },
    Uri: uriApi,
    FileType,
    workspace: {
      fs: {
        createDirectory: async (uri) => {
          fsState.dirs.add(uri.fsPath);
        },
        readFile: async (uri) => {
          const file = fsState.files.get(uri.fsPath);
          if (!file) {
            throw new Error("ENOENT");
          }

          return file;
        },
        writeFile: async (uri, data) => {
          fsState.files.set(uri.fsPath, Buffer.from(data));
        },
        rename: async (from, to) => {
          const data = fsState.files.get(from.fsPath);
          if (!data) {
            throw new Error("ENOENT");
          }

          fsState.files.set(to.fsPath, Buffer.from(data));
          fsState.files.delete(from.fsPath);
        },
        copy: async (from, to) => {
          const data = fsState.files.get(from.fsPath);
          if (!data) {
            throw new Error("ENOENT");
          }

          fsState.files.set(to.fsPath, Buffer.from(data));
        },
        stat: async (uri) => {
          if (fsState.files.has(uri.fsPath) || fsState.dirs.has(uri.fsPath)) {
            return true;
          }

          throw new Error("ENOENT");
        },
        delete: async (uri) => {
          fsState.files.delete(uri.fsPath);
          fsState.dirs.delete(uri.fsPath);
        },
        readDirectory: async (uri) => {
          return fsState.directories.get(uri.fsPath) ?? [];
        },
      },
      asRelativePath: (uri) => {
        const path = require("node:path").win32;
        return path.basename(uri.fsPath);
      },
    },
    window: {
      createOutputChannel: () => ({
        appendLine: () => {},
      }),
      showWarningMessage: async () => undefined,
      showErrorMessage: async () => undefined,
      showInformationMessage: async () => undefined,
    },
  };
}

function createHealthServiceFixture(options) {
  const vscodeApi = createMockVscodeForHealth(options.readmeExists);
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeApi;
    }

    if (request === "child_process") {
      return {
        execFile: (_command, _args, execOptions, callback) => {
          if (typeof execOptions === "function") {
            callback = execOptions;
          }

          if (typeof options.gitTimestamp === "number") {
            callback(null, `${Math.floor(options.gitTimestamp / 1000)}\n`, "");
            return;
          }

          callback(new Error("git error"));
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[require.resolve("../out/services/projectHealthService")];
  const { ProjectHealthService } = require("../out/services/projectHealthService");

  return {
    service: new ProjectHealthService(),
    restoreLoad: () => {
      Module._load = originalLoad;
    },
    buildProject: (project) => project,
  };
}

function createStoreServiceFixture(projects) {
  const fsState = createMemoryFs();
  const vscodeApi = createMockVscodeForStorage(fsState);
  const storageFile = storageFilePath(STORAGE_ROOT);
  fsState.files.set(
    storageFile,
    Buffer.from(
      JSON.stringify(
        {
          version: 2,
          projects,
        },
        null,
        2
      ),
      "utf8"
    )
  );

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeApi;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[require.resolve("../out/services/projectStoreService")];
  const { ProjectStoreService } = require("../out/services/projectStoreService");

  return {
    service: new ProjectStoreService({
      globalStorageUri: vscodeApi.Uri.file(STORAGE_ROOT),
    }),
    fsState,
    storageFile,
    restoreLoad: () => {
      Module._load = originalLoad;
    },
  };
}

function storageFilePath(root) {
  return require("node:path").win32.join(root, "projects.json");
}

function storageBackupPath(root) {
  return require("node:path").win32.join(root, "projects.json.bak");
}

function formatMessage(message, ...values) {
  return message.replace(/\{(\d+)\}/g, (_match, index) => {
    const value = values[Number(index)];
    return value === undefined ? _match : String(value);
  });
}

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
