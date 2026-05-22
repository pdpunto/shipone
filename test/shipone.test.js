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
  applyProjectMetadataMigrations,
} = require("../out/models/projectMigrations");
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

test("buildStatusFileContent genera STATUS.md", () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          l10n: {
            t: formatMessage,
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/commands/projects/projectOpsHelpers")];
    const { buildStatusFileContent } = require("../out/commands/projects/projectOpsHelpers");

    const content = buildStatusFileContent({
      name: "ShipOne",
      description: "Test",
      nextAction: "Crear login",
      mvpTasks: [{ id: "1", text: "Login", done: false }],
    });

    assert.ok(content.includes("# Estado actual"));
    assert.ok(content.includes("## Proximo paso"));
    assert.ok(content.includes("Crear login"));
  } finally {
    Module._load = originalLoad;
  }
});

test("buildAiContextContent genera AI_CONTEXT.md", () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          l10n: {
            t: formatMessage,
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/commands/projects/projectOpsHelpers")];
    const { buildAiContextContent } = require("../out/commands/projects/projectOpsHelpers");

    const content = buildAiContextContent(
      {
        name: "ShipOne",
        status: "active",
        type: "blank",
        path: "C:\\tmp\\shipone",
        favorite: false,
        description: "Test",
        nextAction: "Crear login",
        mvpTasks: [{ id: "1", text: "Login", done: true }],
      },
      ["README faltante"]
    );

    assert.ok(content.includes("# ShipOne AI Context"));
    assert.ok(content.includes("## Proyecto"));
    assert.ok(content.includes("## Next action"));
    assert.ok(content.includes("Crear login"));
    assert.ok(content.includes("- README faltante"));
  } finally {
    Module._load = originalLoad;
  }
});

test("buildWeeklyReviewSummaryLines genera el resumen", () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          l10n: {
            t: formatMessage,
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/utils/projectReviewDisplay")];
    const { buildWeeklyReviewSummaryLines } = require("../out/utils/projectReviewDisplay");

    const summary = buildWeeklyReviewSummaryLines({
      activeName: "ShipOne",
      pausedCount: 2,
      finishedThisWeekCount: 1,
    });

    assert.equal(
      summary,
      "Activo: ShipOne | Pausados: 2 | Terminados esta semana: 1"
    );
  } finally {
    Module._load = originalLoad;
  }
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

test("applyProjectMetadataMigrations migra versiones encadenadas", () => {
  const project = applyProjectMetadataMigrations({
    schemaVersion: 1,
    id: "p1",
    name: "ShipOne",
    description: "Test",
    type: "blank",
    status: "idea",
    path: "/tmp/shipone",
    createdAt: "2026-05-15T00:00:00.000Z",
    tags: ["ui", "ui", "  docs  "],
    mvpTasks: [
      { id: "1", text: "Login", done: false },
      { id: "2", text: "Deploy", done: true },
      { id: "broken", text: 123, done: true },
    ],
  });

  assert.equal(project.schemaVersion, 2);
  assert.deepEqual(project.tags, ["ui", "docs"]);
  assert.equal(project.mvpTasks.length, 2);
  assert.equal(project.mvpTasks[0].text, "Login");
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

test("confirmCanActivateProject bloquea otro activo", async () => {
  const fixture = createIntegrationFixture();

  try {
    const projectOpsHelpersPath = require.resolve(
      "../out/commands/projects/projectOpsHelpers"
    );
    delete require.cache[projectOpsHelpersPath];
    const { confirmCanActivateProject } = require(projectOpsHelpersPath);

    fixture.projectStore.projects = [
      {
        id: "p1",
        name: "Uno",
        status: "active",
      },
    ];

    const result = await confirmCanActivateProject(
      {
        loadProjects: async () => fixture.projectStore.projects,
      },
      "p2"
    );

    assert.equal(result, false);
    assert.equal(fixture.messages.warning.length, 1);
    assert.equal(
      fixture.messages.warning[0][0],
      "Ya hay un proyecto activo: Uno."
    );
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

test("TemplateService prefiere la plantilla custom del tipo", async () => {
  const fixture = createTemplateServiceFixture();

  try {
    delete require.cache[require.resolve("../out/services/templateService")];
    const { TemplateService } = require("../out/services/templateService");

    fixture.files.set(
      "C:\\templates\\react-vite\\react-vite\\src\\App.tsx",
      Buffer.from("console.log(\"typed\");", "utf8")
    );
    fixture.directories.set("C:\\templates\\react-vite\\react-vite", [
      ["src", fixture.vscode.FileType.Directory],
    ]);
    fixture.directories.set("C:\\templates\\react-vite\\react-vite\\src", [
      ["App.tsx", fixture.vscode.FileType.File],
    ]);
    await fixture.vscode.workspace.fs.createDirectory(
      fixture.vscode.Uri.file("C:\\templates\\react-vite\\react-vite")
    );
    await fixture.vscode.workspace.fs.createDirectory(
      fixture.vscode.Uri.file("C:\\templates\\react-vite\\react-vite\\src")
    );

    const service = new TemplateService();
    await service.createSelectedTemplate(
      fixture.vscode.Uri.file("C:\\dest"),
      "ShipOne App",
      "Test",
      "react-vite",
      "npm",
      "C:\\templates\\react-vite"
    );

    assert.equal(
      fixture.files.get("C:\\dest\\src\\App.tsx").toString("utf8"),
      "console.log(\"typed\");"
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("TemplateService genera un node-api ejecutable", async () => {
  const fixture = createTemplateServiceFixture();

  try {
    delete require.cache[require.resolve("../out/services/templateService")];
    const { TemplateService } = require("../out/services/templateService");

    const service = new TemplateService();
    await service.createSelectedTemplate(
      fixture.vscode.Uri.file("C:\\dest"),
      "ShipOne API",
      "API demo",
      "node-api",
      "npm",
      "C:\\templates"
    );

    const packageJson = JSON.parse(
      fixture.files.get("C:\\dest\\package.json").toString("utf8")
    );

    assert.equal(packageJson.scripts.dev, "node --watch src/index.js");
    assert.equal(packageJson.scripts.start, "node src/index.js");
    assert.equal(
      fixture.files.get("C:\\dest\\src\\index.js").toString("utf8").includes('const http = require("http");'),
      true
    );
    assert.equal(fixture.files.has("C:\\dest\\src\\index.ts"), false);
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

test("TodoScannerService cachea scans repetidos", async () => {
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

    const first = await service.scanProjectTodoTasks("C:\\repo");
    const second = await service.scanProjectTodoTasks("C:\\repo");

    assert.deepEqual(first, second);
    assert.equal(fixture.counters.readDirectory, 2);
    assert.equal(fixture.counters.readFile, 2);
  } finally {
    fixture.restoreLoad();
  }
});

test("TodoScannerService ignora carpetas pesadas", async () => {
  const fixture = createTodoScannerFixture();

  try {
    fixture.directories.set("C:\\repo", [
      ["src", fixture.vscode.FileType.Directory],
      [".git", fixture.vscode.FileType.Directory],
      ["node_modules", fixture.vscode.FileType.Directory],
      ["out", fixture.vscode.FileType.Directory],
      ["dist", fixture.vscode.FileType.Directory],
    ]);
    fixture.directories.set("C:\\repo\\src", [
      ["app.ts", fixture.vscode.FileType.File],
    ]);
    fixture.directories.set("C:\\repo\\.git", [
      ["ignored.ts", fixture.vscode.FileType.File],
    ]);
    fixture.directories.set("C:\\repo\\node_modules", [
      ["ignored.ts", fixture.vscode.FileType.File],
    ]);
    fixture.directories.set("C:\\repo\\out", [
      ["ignored.ts", fixture.vscode.FileType.File],
    ]);
    fixture.directories.set("C:\\repo\\dist", [
      ["ignored.ts", fixture.vscode.FileType.File],
    ]);
    fixture.files.set(
      "C:\\repo\\src\\app.ts",
      Buffer.from("TODO: revisar", "utf8")
    );
    fixture.files.set(
      "C:\\repo\\.git\\ignored.ts",
      Buffer.from("TODO: no contar", "utf8")
    );
    fixture.files.set(
      "C:\\repo\\node_modules\\ignored.ts",
      Buffer.from("TODO: no contar", "utf8")
    );
    fixture.files.set(
      "C:\\repo\\out\\ignored.ts",
      Buffer.from("TODO: no contar", "utf8")
    );
    fixture.files.set(
      "C:\\repo\\dist\\ignored.ts",
      Buffer.from("TODO: no contar", "utf8")
    );

    delete require.cache[require.resolve("../out/services/todoScannerService")];
    const { TodoScannerService } = require("../out/services/todoScannerService");
    const service = new TodoScannerService();

    const tasks = await service.scanProjectTodoTasks("C:\\repo");

    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].fileName, "app.ts");
    assert.equal(fixture.counters.readDirectory, 2);
    assert.equal(fixture.counters.readFile, 1);
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

test("ProjectHealthService cachea comprobaciones de salud", async () => {
  const fixture = createHealthServiceFixture({
    readmeExists: true,
    gitTimestamp: Date.now(),
    counters: {
      readme: 0,
      git: 0,
    },
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

    const first = await fixture.service.buildProjectHealth(project, 7, 30);
    const second = await fixture.service.buildProjectHealth(project, 7, 30);

    assert.deepEqual(first, second);
    assert.equal(fixture.counters.readme, 1);
    assert.equal(fixture.counters.git, 1);
  } finally {
    fixture.restoreLoad();
  }
});

test("ProjectHealthService resume salud del conjunto", async () => {
  const fixture = createHealthServiceFixture({
    readmeExists: true,
    gitTimestamp: Date.now(),
  });

  try {
    const projects = [
      { id: "p1", health: "healthy" },
      { id: "p2", health: "warning" },
      { id: "p3", health: "bad" },
    ];

    fixture.service.buildProjectHealth = async (project) => ({
      label: project.health,
      issues: [],
    });

    const summary = await fixture.service.getHealthSummary(projects, 7, 30);

    assert.equal(summary.healthy, 1);
    assert.equal(summary.warning, 1);
    assert.equal(summary.bad, 1);
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
          inactiveWarningDays: 999,
          staleWarningDays: 1000,
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

test("getRootNodes muestra grupos mas compactos", async () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return createMockVscode();
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/providers/treeRendererService")];

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
            lastOpenedAt: "2026-05-15T00:00:00.000Z",
            nextAction: "Crear login",
          },
          {
            id: "p2",
            name: "Paused",
            description: "Test",
            type: "blank",
            status: "paused",
            path: "/tmp/paused",
            createdAt: "2026-05-15T00:00:00.000Z",
          },
        ],
        getProjectsByStatus: async () => ({}),
      },
      {
        getSettings: () => ({
          inactiveWarningDays: 999,
          staleWarningDays: 1000,
          showFinishedProjects: true,
        }),
      },
      {
        buildProjectHealth: async () => ({ label: "ok", issues: [] }),
        getMetrics: () => ({
          total: 2,
          idea: 0,
          active: 1,
          paused: 1,
          finished: 0,
          finishRatio: 0,
        }),
        getInactivityWarning: () => null,
        getHealthSummary: async () => ({
          healthy: 2,
          warning: 0,
          bad: 0,
        }),
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
        buildProjectDescription: () => "desc",
      },
      () => false
    );

    const nodes = await renderer.getRootNodes(false);

    assert.equal(nodes.length, 5);
    assert.equal(nodes[1].description, undefined);
    assert.equal(nodes[2].description, undefined);
  } finally {
    Module._load = originalLoad;
  }
});

test("getMetricsNodes muestra salud y resumen", async () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return createMockVscode();
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/providers/treeRendererService")];

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
            lastOpenedAt: "2026-05-15T00:00:00.000Z",
            nextAction: "Crear login",
          },
          {
            id: "p2",
            name: "Paused",
            description: "Test",
            type: "blank",
            status: "paused",
            path: "/tmp/paused",
            createdAt: "2026-05-15T00:00:00.000Z",
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
        buildProjectHealth: async () => ({ label: "warning", issues: [] }),
        getMetrics: () => ({
          total: 2,
          idea: 0,
          active: 1,
          paused: 1,
          finished: 0,
          finishRatio: 0,
        }),
        getInactivityWarning: () => null,
        getHealthSummary: async () => ({
          healthy: 1,
          warning: 1,
          bad: 0,
        }),
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
        buildProjectDescription: () => "desc",
      },
      () => false
    );

    const nodes = await renderer.getMetricsNodes();

    assert.equal(nodes.length, 9);
    assert.equal(nodes[0].label, "Total");
    assert.equal(nodes[0].description, "2");
    assert.equal(nodes[6].label, "healthy");
    assert.equal(nodes[6].description, "1");
    assert.equal(nodes[7].label, "warning");
    assert.equal(nodes[7].description, "1");
  } finally {
    Module._load = originalLoad;
  }
});

test("ShipOneProjectsTreeDataProvider agrupa refresh seguidos", async () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          ...createMockVscode(),
          EventEmitter: class {
            constructor() {
              this.handlers = [];
            }

            event = (handler) => {
              this.handlers.push(handler);
              return { dispose: () => {} };
            };

            fire() {
              for (const handler of this.handlers) {
                handler();
              }
            }
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/providers/shiponeProjectsTreeDataProvider")];
    const { ShipOneProjectsTreeDataProvider } = require("../out/providers/shiponeProjectsTreeDataProvider");

    const provider = new ShipOneProjectsTreeDataProvider(
      {
        loadProjects: async () => [],
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
        buildProjectHealth: async () => ({ label: "ok", issues: [] }),
        clearCache: () => {},
        getMetrics: () => ({
          total: 0,
          idea: 0,
          active: 0,
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
        buildProjectDescription: () => "desc",
      },
      () => false
    );

    let refreshCount = 0;
    provider.onDidChangeTreeData(() => {
      refreshCount += 1;
    });

    provider.refresh();
    provider.refresh();
    provider.refresh();

    await Promise.resolve();

    assert.equal(refreshCount, 1);
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

function createMockVscodeForHealth(readmeExists, demoExists, counters) {
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
          if (counters) {
            counters.readme += 1;
          }
          if (demoExists && uri.fsPath.endsWith(".shipone-demo")) {
            return true;
          }
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
  const counters = { readDirectory: 0, readFile: 0 };
  const vscodeApi = createMockVscodeForGenericFs(fsState, counters);

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
    counters,
    files: fsState.files,
    directories: fsState.directories,
    restoreLoad: () => {
      Module._load = originalLoad;
    },
    vscode: vscodeApi,
  };
}

function createMockVscodeForGenericFs(fsState, counters) {
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
          if (counters) {
            counters.readFile += 1;
          }
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
          if (counters) {
            counters.readDirectory += 1;
          }
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
  const counters = options.counters ?? { readme: 0, git: 0 };
  const vscodeApi = createMockVscodeForHealth(
    options.readmeExists,
    options.demoExists ?? false,
    counters
  );
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

          counters.git += 1;
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
    counters,
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

function createIntegrationFixture() {
  return createIntegrationFixtureWithOptions();
}

function createIntegrationFixtureWithOptions(options = {}) {
  const fsState = createMemoryFs();
  const originalLoad = Module._load;
  const commandHandlers = new Map();
  const inputQueue = [];
  const quickPickQueue = [];
  const infoQueue = [];
  const warningQueue = [];
  const errorQueue = [];
  const execCalls = [];
  const commandExecCalls = [];
  const calls = { refresh: [], openTextDocument: [], showTextDocument: [] };

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

  const vscodeApi = {
    l10n: {
      t: formatMessage,
    },
    Uri: uriApi,
    FileType,
    ThemeIcon: class {
      constructor(id) {
        this.id = id;
      }
    },
    Range: class {
      constructor(startLine, startChar, endLine, endChar) {
        this.startLine = startLine;
        this.startChar = startChar;
        this.endLine = endLine;
        this.endChar = endChar;
      }
    },
    Selection: class {
      constructor(startLine, startChar, endLine, endChar) {
        this.startLine = startLine;
        this.startChar = startChar;
        this.endLine = endLine;
        this.endChar = endChar;
      }
    },
    TextEditorRevealType: {
      InCenter: 1,
    },
    commands: {
      registerCommand: (name, handler) => {
        commandHandlers.set(name, handler);
        return { dispose: () => {} };
      },
      executeCommand: async (name, ...args) => {
        commandExecCalls.push({ name, args });
        const handler = commandHandlers.get(name);
        if (handler) {
          return handler(...args);
        }
        return undefined;
      },
    },
    window: {
      createOutputChannel: () => ({
        appendLine: () => {},
      }),
      showInputBox: async () => {
        const next = inputQueue.shift();
        return typeof next === "function" ? next() : next;
      },
      showQuickPick: async (items, options) => {
        const next = quickPickQueue.shift();
        return typeof next === "function" ? next(items, options) : next;
      },
      showInformationMessage: async (...args) => {
        infoQueue.push(args);
        return undefined;
      },
      showWarningMessage: async (...args) => {
        warningQueue.push(args);
        return undefined;
      },
      showErrorMessage: async (...args) => {
        errorQueue.push(args);
        return undefined;
      },
      withProgress: async (_options, task) => task({ report: () => {} }),
      showOpenDialog: async () => undefined,
      showTextDocument: async (document, options) => {
        calls.showTextDocument.push({ document, options });
        return undefined;
      },
      openTextDocument: async (uri) => {
        const document = { uri };
        calls.openTextDocument.push(uri);
        return document;
      },
      createTerminal: () => ({
        show: () => {},
        sendText: () => {},
      }),
    },
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
        readDirectory: async (uri) => fsState.directories.get(uri.fsPath) ?? [],
      },
      asRelativePath: (uri) => require("node:path").win32.basename(uri.fsPath),
    },
  };

  const childProcessStub = {
    execFile: (command, args, options, callback) => {
      let cwd = undefined;
      let cb = callback;

      if (typeof options === "function") {
        cb = options;
      } else if (options && typeof options === "object") {
        cwd = options.cwd;
      }

      execCalls.push({ command, args, cwd });

      if (typeof cb !== "function") {
        return;
      }

      if (options.failGitInit && command === "git" && args[0] === "init") {
        cb(new Error("git missing"), "", "git missing");
        return;
      }

      if (command === "gh" && args[0] === "repo" && args[1] === "view") {
        cb(null, "https://github.com/pdpunto/shipone\n", "");
        return;
      }

      if (
        options.failGitHubRepoCreate &&
        command === "gh" &&
        args[0] === "repo" &&
        args[1] === "create"
      ) {
        cb(new Error("offline"), "", "offline");
        return;
      }

      cb(null, "", "");
    },
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeApi;
    }

    if (request === "child_process") {
      return childProcessStub;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  const projectStore = {
    projects: [],
    projectsById: new Map(),
    createdProjects: [],
    markProjectOpenedCalls: [],
    setNextActionCalls: [],
    setProjectStatusCalls: [],
    createProjectFolder: async (uri) => {
      fsState.dirs.add(uri.fsPath);
    },
    createProject: async (project) => {
      projectStore.createdProjects.push({ project });
      projectStore.projects.push(project);
      projectStore.projectsById.set(project.id, project);
    },
    loadProjects: async () => projectStore.projects,
    getProject: async (projectId) => projectStore.projectsById.get(projectId),
    markProjectOpened: async (projectId) => {
      projectStore.markProjectOpenedCalls.push(projectId);
    },
    setNextAction: async (projectId, nextAction) => {
      projectStore.setNextActionCalls.push([projectId, nextAction]);
    },
    setProjectStatus: async (projectId, status) => {
      projectStore.setProjectStatusCalls.push([projectId, status]);
    },
    toggleFavorite: async () => {},
    setMvpTasks: async () => {},
    markMvpTaskDone: async () => {},
    freezeProject: async () => {},
  };

  const workspaceState = new Map();
  const context = {
    subscriptions: [],
    workspaceState: {
      get: (key, defaultValue) =>
        workspaceState.has(key) ? workspaceState.get(key) : defaultValue,
      update: async (key, value) => {
        workspaceState.set(key, value);
      },
    },
  };

  return {
    vscode: vscodeApi,
    files: fsState.files,
    dirs: fsState.dirs,
    directories: fsState.directories,
    execCalls,
    commandExecCalls,
    commandHandlers,
    projectStore,
    context,
    settings: {
      projectsRoot: "C:\\tmp\\shipone-projects",
      defaultProjectType: "blank",
      defaultPackageManager: "npm",
      createGitRepoByDefault: true,
      createGitHubRepoByDefault: true,
      defaultVisibility: "private",
      createStatusFileByDefault: true,
      openAfterCreate: false,
      enforceOneActiveProject: true,
      customTemplateFolder: "",
      showFinishedProjects: true,
      inactiveWarningDays: 7,
      staleWarningDays: 30,
    },
    calls,
    messages: {
      info: infoQueue,
      warning: warningQueue,
      error: errorQueue,
    },
    calls,
    enqueueInput: (value) => inputQueue.push(value),
    enqueueQuickPick: (value) => quickPickQueue.push(value),
    restoreLoad: () => {
      Module._load = originalLoad;
    },
  };
}

function createGitHubCliFixture() {
  const originalLoad = Module._load;
  const messages = {
    warning: [],
    info: [],
  };
  const commandsExecuted = [];

  const vscodeApi = {
    l10n: {
      t: formatMessage,
    },
    window: {
      createOutputChannel: () => ({
        appendLine: () => {},
      }),
      showWarningMessage: async (...args) => {
        messages.warning.push(args);
        return args[1];
      },
      showInformationMessage: async (...args) => {
        messages.info.push(args);
        return undefined;
      },
      createTerminal: () => ({
        show: () => {},
        sendText: () => {},
      }),
    },
    commands: {
      executeCommand: async (...args) => {
        commandsExecuted.push(args);
      },
    },
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeApi;
    }

    if (request === "child_process") {
      return {
        execFile: (command, args, options, callback) => {
          let cb = callback;

          if (typeof options === "function") {
            cb = options;
          }

          if (command === "gh" && args[0] === "--version") {
            cb(new Error("gh missing"), "", "");
            return;
          }

          cb(null, "", "");
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  return {
    messages,
    commandsExecuted,
    restoreLoad: () => {
      Module._load = originalLoad;
    },
  };
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

test("Create project flow cubre status, git y GitHub", async () => {
  const fixture = createIntegrationFixture();

  try {
    fixture.enqueueInput("ShipOne App");
    fixture.enqueueInput("Proyecto web");
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "react-vite"));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "private"));

    delete require.cache[require.resolve("../out/services/projectCreationService")];
    delete require.cache[require.resolve("../out/services/templateService")];
    delete require.cache[require.resolve("../out/services/gitService")];
    delete require.cache[require.resolve("../out/services/githubService")];
    delete require.cache[require.resolve("../out/services/statusFileService")];

    const { ProjectCreationService } = require("../out/services/projectCreationService");
    const { TemplateService } = require("../out/services/templateService");
    const { GitService } = require("../out/services/gitService");
    const { GitHubService } = require("../out/services/githubService");
    const { StatusFileService } = require("../out/services/statusFileService");

    const service = new ProjectCreationService(
      fixture.context,
      fixture.projectStore,
      new StatusFileService(),
      {},
      new TemplateService(),
      new GitService(),
      new GitHubService()
    );

    const project = await service.createProject(fixture.settings);

    assert.equal(project.name, "ShipOne App");
    assert.equal(fixture.projectStore.createdProjects.length, 1);
    assert.ok(
      fixture.execCalls.some(
        (call) =>
          call.command === "gh" &&
          call.args[0] === "repo" &&
          call.args[1] === "create"
      )
    );
    assert.ok(
      fixture.execCalls.some(
        (call) =>
          call.command === "gh" &&
          call.args[0] === "repo" &&
          call.args[1] === "view"
      )
    );
    assert.ok(fixture.files.has("C:\\tmp\\shipone-projects\\ShipOne-App\\STATUS.md"));
    assert.ok(fixture.execCalls.some((call) => call.command === "git" && call.args[0] === "init"));
  } finally {
    fixture.restoreLoad();
  }
});

test("Create project flow sin Git muestra aviso y sigue", async () => {
  const fixture = createIntegrationFixtureWithOptions({ failGitInit: true });

  try {
    fixture.enqueueInput("ShipOne App");
    fixture.enqueueInput("Proyecto web");
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "react-vite"));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "private"));

    delete require.cache[require.resolve("../out/services/projectCreationService")];
    delete require.cache[require.resolve("../out/services/templateService")];
    delete require.cache[require.resolve("../out/services/gitService")];
    delete require.cache[require.resolve("../out/services/githubService")];
    delete require.cache[require.resolve("../out/services/statusFileService")];

    const { ProjectCreationService } = require("../out/services/projectCreationService");
    const { TemplateService } = require("../out/services/templateService");
    const { GitService } = require("../out/services/gitService");
    const { GitHubService } = require("../out/services/githubService");
    const { StatusFileService } = require("../out/services/statusFileService");

    const service = new ProjectCreationService(
      fixture.context,
      fixture.projectStore,
      new StatusFileService(),
      {},
      new TemplateService(),
      new GitService(),
      new GitHubService()
    );

    const project = await service.createProject(fixture.settings);

    assert.equal(project.name, "ShipOne App");
    assert.equal(fixture.projectStore.createdProjects.length, 1);
    assert.ok(fixture.messages.warning.length > 0);
    assert.equal(project.repoUrl, null);
  } finally {
    fixture.restoreLoad();
  }
});

test("GitHubService avisa si falta GitHub CLI", async () => {
  const fixture = createGitHubCliFixture();

  try {
    delete require.cache[require.resolve("../out/services/githubService")];
    const { GitHubService } = require("../out/services/githubService");
    const service = new GitHubService();

    await service.connectGitHub();

    assert.equal(fixture.messages.warning.length, 1);
    assert.equal(fixture.messages.info.length, 0);
    assert.deepEqual(fixture.commandsExecuted, [
      ["workbench.action.openSettings", "GitHub"],
    ]);
  } finally {
    fixture.restoreLoad();
  }
});

test("GitHubService confirma conexion cuando ya esta autenticado", async () => {
  const fixture = createIntegrationFixture();

  try {
    delete require.cache[require.resolve("../out/services/githubService")];
    const { GitHubService } = require("../out/services/githubService");
    const service = new GitHubService();

    await service.connectGitHub();

    assert.equal(fixture.messages.info.length, 1);
    assert.equal(fixture.messages.warning.length, 0);
  } finally {
    fixture.restoreLoad();
  }
});

test("GitHubService devuelve null si falla la creacion del repo", async () => {
  const fixture = createIntegrationFixture();

  try {
    delete require.cache[require.resolve("../out/services/githubService")];
    const { GitHubService } = require("../out/services/githubService");
    const service = new GitHubService();

    const url = await service.createGitHubRepo(
      fixture.vscode.Uri.file("C:\\tmp\\shipone-projects\\ShipOne-App"),
      "ShipOne-App",
      "private"
    );

    assert.equal(url, null);
    assert.ok(
      fixture.execCalls.some(
        (call) =>
          call.command === "gh" &&
          call.args[0] === "repo" &&
          call.args[1] === "create" &&
          call.args.includes("--yes")
      )
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("Create project flow sin red sigue creando local", async () => {
  const fixture = createIntegrationFixtureWithOptions({
    failGitHubRepoCreate: true,
  });

  try {
    fixture.enqueueInput("ShipOne App");
    fixture.enqueueInput("Proyecto web");
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "react-vite"));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "private"));
    fixture.enqueueQuickPick((items) => items.find((item) => item === "openFolder"));

    delete require.cache[require.resolve("../out/services/projectCreationService")];
    delete require.cache[require.resolve("../out/services/templateService")];
    delete require.cache[require.resolve("../out/services/gitService")];
    delete require.cache[require.resolve("../out/services/githubService")];
    delete require.cache[require.resolve("../out/services/statusFileService")];

    const { ProjectCreationService } = require("../out/services/projectCreationService");
    const { TemplateService } = require("../out/services/templateService");
    const { GitService } = require("../out/services/gitService");
    const { GitHubService } = require("../out/services/githubService");
    const { StatusFileService } = require("../out/services/statusFileService");

    const service = new ProjectCreationService(
      fixture.context,
      fixture.projectStore,
      new StatusFileService(),
      {},
      new TemplateService(),
      new GitService(),
      new GitHubService()
    );

    const project = await service.createProject(fixture.settings);

    assert.equal(project.name, "ShipOne App");
    assert.equal(project.repoUrl, null);
    assert.equal(fixture.projectStore.createdProjects.length, 1);
    assert.ok(fixture.messages.warning.length > 0);
    assert.equal(
      fixture.messages.warning[0][0].includes("nombre del repo"),
      true
    );
    assert.ok(
      fixture.execCalls.some(
        (call) =>
          call.command === "gh" &&
          call.args[0] === "repo" &&
          call.args[1] === "create"
      )
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("Create project flow con ruta con espacios mantiene la carpeta", async () => {
  const fixture = createIntegrationFixtureWithOptions();
  fixture.settings.projectsRoot = "C:\\tmp\\shipone projects";
  fixture.settings.openAfterCreate = true;

  try {
    fixture.enqueueInput("ShipOne App");
    fixture.enqueueInput("Proyecto web");
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "react-vite"));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "private"));

    delete require.cache[require.resolve("../out/services/projectCreationService")];
    delete require.cache[require.resolve("../out/services/templateService")];
    delete require.cache[require.resolve("../out/services/gitService")];
    delete require.cache[require.resolve("../out/services/githubService")];
    delete require.cache[require.resolve("../out/services/statusFileService")];

    const { ProjectCreationService } = require("../out/services/projectCreationService");
    const { TemplateService } = require("../out/services/templateService");
    const { GitService } = require("../out/services/gitService");
    const { GitHubService } = require("../out/services/githubService");
    const { StatusFileService } = require("../out/services/statusFileService");

    const service = new ProjectCreationService(
      fixture.context,
      fixture.projectStore,
      new StatusFileService(),
      {},
      new TemplateService(),
      new GitService(),
      new GitHubService()
    );

    const project = await service.createProject(fixture.settings);

    assert.equal(project.name, "ShipOne App");
    assert.equal(project.path, "C:\\tmp\\shipone projects\\ShipOne-App");
    assert.ok(
      fixture.files.has("C:\\tmp\\shipone projects\\ShipOne-App\\STATUS.md")
    );
    assert.ok(
      fixture.commandExecCalls.some(
        (call) =>
          call.name === "vscode.openFolder" &&
          call.args[0]?.fsPath === "C:\\tmp\\shipone projects\\ShipOne-App"
      )
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("Create project flow evita colision de carpeta", async () => {
  const fixture = createIntegrationFixtureWithOptions();
  fixture.settings.openAfterCreate = true;
  fixture.dirs.add("C:\\tmp\\shipone-projects\\ShipOne-App");

  try {
    fixture.enqueueInput("ShipOne App");
    fixture.enqueueInput("Proyecto web");
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "react-vite"));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "private"));

    delete require.cache[require.resolve("../out/services/projectCreationService")];
    delete require.cache[require.resolve("../out/services/templateService")];
    delete require.cache[require.resolve("../out/services/gitService")];
    delete require.cache[require.resolve("../out/services/githubService")];
    delete require.cache[require.resolve("../out/services/statusFileService")];

    const { ProjectCreationService } = require("../out/services/projectCreationService");
    const { TemplateService } = require("../out/services/templateService");
    const { GitService } = require("../out/services/gitService");
    const { GitHubService } = require("../out/services/githubService");
    const { StatusFileService } = require("../out/services/statusFileService");

    const service = new ProjectCreationService(
      fixture.context,
      fixture.projectStore,
      new StatusFileService(),
      {},
      new TemplateService(),
      new GitService(),
      new GitHubService()
    );

    const project = await service.createProject(fixture.settings);

    assert.equal(project.path, "C:\\tmp\\shipone-projects\\ShipOne-App-2");
    assert.ok(
      fixture.files.has("C:\\tmp\\shipone-projects\\ShipOne-App-2\\STATUS.md")
    );
    assert.ok(
      fixture.commandExecCalls.some(
        (call) =>
          call.name === "vscode.openFolder" &&
          call.args[0]?.fsPath === "C:\\tmp\\shipone-projects\\ShipOne-App-2"
      )
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("Create project flow con ruta unicode mantiene la carpeta", async () => {
  const fixture = createIntegrationFixtureWithOptions();
  fixture.settings.projectsRoot = "C:\\tmp\\proyectos-ñ";
  fixture.settings.openAfterCreate = true;

  try {
    fixture.enqueueInput("ShipOne App");
    fixture.enqueueInput("Proyecto web");
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "react-vite"));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === true));
    fixture.enqueueQuickPick((items) => items.find((item) => item.value === "private"));

    delete require.cache[require.resolve("../out/services/projectCreationService")];
    delete require.cache[require.resolve("../out/services/templateService")];
    delete require.cache[require.resolve("../out/services/gitService")];
    delete require.cache[require.resolve("../out/services/githubService")];
    delete require.cache[require.resolve("../out/services/statusFileService")];

    const { ProjectCreationService } = require("../out/services/projectCreationService");
    const { TemplateService } = require("../out/services/templateService");
    const { GitService } = require("../out/services/gitService");
    const { GitHubService } = require("../out/services/githubService");
    const { StatusFileService } = require("../out/services/statusFileService");

    const service = new ProjectCreationService(
      fixture.context,
      fixture.projectStore,
      new StatusFileService(),
      {},
      new TemplateService(),
      new GitService(),
      new GitHubService()
    );

    const project = await service.createProject(fixture.settings);

    assert.equal(project.name, "ShipOne App");
    assert.equal(project.path, "C:\\tmp\\proyectos-ñ\\ShipOne-App");
    assert.ok(fixture.files.has("C:\\tmp\\proyectos-ñ\\ShipOne-App\\STATUS.md"));
    assert.ok(
      fixture.commandExecCalls.some(
        (call) =>
          call.name === "vscode.openFolder" &&
          call.args[0]?.fsPath === "C:\\tmp\\proyectos-ñ\\ShipOne-App"
      )
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("Open project flow abre la carpeta y marca acceso", async () => {
  const fixture = createIntegrationFixture();

  try {
    delete require.cache[require.resolve("../out/commands/projects/registerProjectCommands")];
    const { registerProjectCommands } = require("../out/commands/projects/registerProjectCommands");

    fixture.projectStore.projectsById.set("p1", {
      id: "p1",
      name: "ShipOne",
      description: "Test",
      type: "blank",
      status: "active",
      path: "C:\\tmp\\shipone-projects\\ShipOne",
      createdAt: "2026-05-15T00:00:00.000Z",
    });

    registerProjectCommands({
      context: fixture.context,
      projectStore: fixture.projectStore,
      settingsService: { getSettings: () => fixture.settings },
      treeDataProvider: { refresh: () => fixture.calls.refresh.push(true) },
      getSelectedProjectId: () => undefined,
    });

    await fixture.commandHandlers.get("shipone.openProject")("p1");

    assert.deepEqual(fixture.projectStore.markProjectOpenedCalls, ["p1"]);
    assert.ok(
      fixture.commandExecCalls.some((call) => call.name === "vscode.openFolder")
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("Sync status file flow escribe STATUS.md", async () => {
  const fixture = createIntegrationFixture();

  try {
    const projectOpsHelpersPath = require.resolve(
      "../out/commands/projects/projectOpsHelpers"
    );
    delete require.cache[projectOpsHelpersPath];
    const projectOpsHelpers = require(projectOpsHelpersPath);
    projectOpsHelpers.pickProject = async () => fixture.projectStore.projects[0];

    delete require.cache[require.resolve("../out/commands/status/registerStatusCommands")];
    const { registerStatusCommands } = require("../out/commands/status/registerStatusCommands");

    fixture.projectStore.projects = [
      {
        id: "p1",
        name: "ShipOne",
        description: "Test",
        type: "blank",
        status: "active",
        path: "C:\\tmp\\shipone-projects\\ShipOne",
        createdAt: "2026-05-15T00:00:00.000Z",
        nextAction: "Crear login",
      },
    ];
    fixture.projectStore.getProjectsByStatus = async () => ({
      idea: [],
      active: fixture.projectStore.projects,
      paused: [],
      finished: [],
    });

    registerStatusCommands({
      projectStore: fixture.projectStore,
      statusFileService: {
        syncStatusFile: async (project) => {
          const statusPath = `C:\\tmp\\shipone-projects\\${project.name}\\STATUS.md`;
          fixture.files.set(statusPath, Buffer.from("STATUS", "utf8"));
        },
      },
    });

    await fixture.commandHandlers.get("shipone.syncStatusFile")();

    assert.ok(
      fixture.files.has("C:\\tmp\\shipone-projects\\ShipOne\\STATUS.md")
    );
    assert.equal(fixture.messages.info.length, 1);
  } finally {
    fixture.restoreLoad();
  }
});

test("Edit next action flow actualiza la accion", async () => {
  const fixture = createIntegrationFixture();

  try {
    delete require.cache[require.resolve("../out/commands/projects/registerProjectCommands")];
    const { registerProjectCommands } = require("../out/commands/projects/registerProjectCommands");

    fixture.projectStore.projectsById.set("p1", {
      id: "p1",
      name: "ShipOne",
      description: "Test",
      type: "blank",
      status: "active",
      path: "C:\\tmp\\shipone-projects\\ShipOne",
      createdAt: "2026-05-15T00:00:00.000Z",
      nextAction: "Crear login",
    });

    fixture.enqueueInput("Mejorar onboarding");

    registerProjectCommands({
      context: fixture.context,
      projectStore: fixture.projectStore,
      settingsService: { getSettings: () => fixture.settings },
      treeDataProvider: { refresh: () => fixture.calls.refresh.push(true) },
      getSelectedProjectId: () => undefined,
    });

    await fixture.commandHandlers.get("shipone.editNextAction")("p1");

    assert.deepEqual(fixture.projectStore.setNextActionCalls, [["p1", "Mejorar onboarding"]]);
    assert.equal(fixture.calls.refresh.length, 1);
    assert.equal(fixture.messages.info.length, 1);
  } finally {
    fixture.restoreLoad();
  }
});

test("Focus mode flow activa y desactiva modo foco", async () => {
  const fixture = createIntegrationFixture();

  try {
    delete require.cache[require.resolve("../out/commands/focus/registerFocusCommands")];
    const { registerFocusCommands } = require("../out/commands/focus/registerFocusCommands");

    const focusCalls = [];
    registerFocusCommands({
      setFocusMode: async (enabled) => {
        focusCalls.push(enabled);
      },
    });

    await fixture.commandHandlers.get("shipone.focusMode")();
    await fixture.commandHandlers.get("shipone.exitFocusMode")();

    assert.deepEqual(focusCalls, [true, false]);
    assert.equal(fixture.messages.info.length, 2);
  } finally {
    fixture.restoreLoad();
  }
});

test("ShipOneApp no repite focus mode igual", async () => {
  const fixture = createIntegrationFixture();

  try {
    delete require.cache[require.resolve("../out/bootstrap/shiponeApp")];
    const { ShipOneApp } = require("../out/bootstrap/shiponeApp");
    const app = new ShipOneApp(fixture.context);

    await app.setFocusMode(true);
    await app.setFocusMode(true);
    await app.setFocusMode(false);

    assert.equal(fixture.context.workspaceState.get("shipone.focusMode"), false);
    assert.equal(
      fixture.commandExecCalls.filter((call) => call.name === "setContext").length,
      2
    );
  } finally {
    fixture.restoreLoad();
  }
});

test("Weekly review flow pide next action y resume resumen", async () => {
  const fixture = createIntegrationFixture();

  try {
    delete require.cache[require.resolve("../out/commands/review/registerReviewCommands")];
    const { registerReviewCommands } = require("../out/commands/review/registerReviewCommands");

    fixture.projectStore.projects = [
      {
        id: "p1",
        name: "ShipOne",
        description: "Test",
        type: "blank",
        status: "active",
        path: "C:\\tmp\\shipone-projects\\ShipOne",
        createdAt: "2026-05-15T00:00:00.000Z",
        lastOpenedAt: "2026-05-15T00:00:00.000Z",
      },
      {
        id: "p2",
        name: "Pause",
        description: "Test",
        type: "blank",
        status: "paused",
        path: "C:\\tmp\\shipone-projects\\Pause",
        createdAt: "2026-05-15T00:00:00.000Z",
      },
    ];

    fixture.enqueueInput("Crear login");

    registerReviewCommands({
      projectStore: fixture.projectStore,
      settingsService: { getSettings: () => fixture.settings },
      projectCreationService: {},
      getTodoScannerService: () => ({
        scanProjectTodoTasks: async () => [],
      }),
      treeRefresh: () => fixture.calls.refresh.push(true),
    });

    await fixture.commandHandlers.get("shipone.weeklyReview")();

    assert.deepEqual(fixture.projectStore.setNextActionCalls, [["p1", "Crear login"]]);
    assert.equal(fixture.projectStore.setProjectStatusCalls.length, 0);
  } finally {
    fixture.restoreLoad();
  }
});

test("Scan TODOs usa el scanner solo al ejecutar el comando", async () => {
  const fixture = createIntegrationFixture();

  try {
    const projectOpsHelpersPath = require.resolve(
      "../out/commands/projects/projectOpsHelpers"
    );
    delete require.cache[projectOpsHelpersPath];
    const projectOpsHelpers = require(projectOpsHelpersPath);
    projectOpsHelpers.pickProject = async () => fixture.projectStore.projects[0];

    delete require.cache[require.resolve("../out/commands/review/registerReviewCommands")];
    const { registerReviewCommands } = require("../out/commands/review/registerReviewCommands");

    fixture.projectStore.projects = [
      {
        id: "p1",
        name: "ShipOne",
        description: "Test",
        type: "blank",
        status: "active",
        path: "C:\\tmp\\shipone-projects\\ShipOne",
        createdAt: "2026-05-15T00:00:00.000Z",
      },
    ];
    fixture.projectStore.getProjectsByStatus = async () => ({
      active: fixture.projectStore.projects,
    });

    let scannerCalls = 0;
    registerReviewCommands({
      projectStore: fixture.projectStore,
      settingsService: { getSettings: () => fixture.settings },
      projectCreationService: {},
      getTodoScannerService: () => {
        scannerCalls += 1;
        return {
          scanProjectTodoTasks: async () => [],
        };
      },
      treeRefresh: () => fixture.calls.refresh.push(true),
    });

    assert.equal(scannerCalls, 0);
    await fixture.commandHandlers.get("shipone.scanTodos")();
    assert.equal(scannerCalls, 1);
  } finally {
    fixture.restoreLoad();
  }
});
