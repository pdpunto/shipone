import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { dirname } from "path";
import { promisify } from "util";
import { ProjectMetadata, ProjectStatus } from "../models/project";
import { ShipOneSettings } from "../models/settings";
import { ProjectStoreService } from "./projectStoreService";

const PROJECT_TYPES = [
  { label: "Blank", value: "blank" },
  { label: "React Vite", value: "react-vite" },
  { label: "Next.js", value: "nextjs" },
  { label: "Python", value: "python" },
] as const;

const STATUS_FILE_NAME = "STATUS.md";
const execFileAsync = promisify(execFile);

type GitChoice = { label: string; value: boolean; picked?: boolean };
type GithubChoice = { create: boolean; visibility: "private" | "public" };
type TemplateFile = { uri: vscode.Uri; content: string };
type TemplateContext = {
  folderUri: vscode.Uri;
  projectName: string;
  description: string;
  packageManager: ShipOneSettings["defaultPackageManager"];
  gitignore: string;
};
type TemplateDefinition = {
  type: ShipOneSettings["defaultProjectType"];
  buildFiles: (context: TemplateContext) => TemplateFile[];
};

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    type: "blank",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "README.md"),
        content: [
          `# ${context.projectName}`,
          "",
          context.description || "Proyecto creado con ShipOne.",
          "",
          "## Proximo paso",
          "- Define el primer objetivo.",
          "",
        ].join("\n"),
      },
      { uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"), content: context.gitignore },
    ],
  },
  {
    type: "react-vite",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "package.json"),
        content: JSON.stringify(
          {
            name: sanitizePackageName(context.projectName),
            private: true,
            version: "0.0.0",
            packageManager: formatPackageManager(context.packageManager),
            scripts: {
              dev: "vite",
              build: "vite build",
              preview: "vite preview",
            },
          },
          null,
          2
        ),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "index.html"),
        content: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${context.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "src", "main.tsx"),
        content: `import "./style.css";

const root = document.getElementById("root");

if (root) {
  root.innerHTML = \`
    <main class="app">
      <h1>${context.projectName}</h1>
      <p>Proyecto creado con ShipOne.</p>
    </main>
  \`;
}
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "src", "style.css"),
        content: `body {
  font-family: system-ui, sans-serif;
  margin: 0;
}

.app {
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
}
`,
      },
      { uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"), content: context.gitignore },
    ],
  },
  {
    type: "nextjs",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "package.json"),
        content: JSON.stringify(
          {
            name: sanitizePackageName(context.projectName),
            private: true,
            version: "0.0.0",
            packageManager: formatPackageManager(context.packageManager),
            scripts: {
              dev: "next dev",
              build: "next build",
              start: "next start",
            },
          },
          null,
          2
        ),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "app", "layout.tsx"),
        content: `export const metadata = {
  title: "${context.projectName}",
  description: "${escapeForTsx(context.description || "Proyecto creado con ShipOne.")}",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "app", "page.tsx"),
        content: `export default function Page() {
  return (
    <main>
      <h1>${context.projectName}</h1>
      <p>${escapeForTsx(context.description || "Proyecto creado con ShipOne.")}</p>
    </main>
  );
}
`,
      },
      { uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"), content: context.gitignore },
    ],
  },
  {
    type: "python",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "main.py"),
        content: [
          '"""',
          context.projectName,
          context.description || "Proyecto creado con ShipOne.",
          '"""',
          "",
          "def main() -> None:",
          `    print("${escapeForPython(context.projectName)}")`,
          "",
          "",
          'if __name__ == "__main__":',
          "    main()",
          "",
        ].join("\n"),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "requirements.txt"),
        content: "# Requisitos del proyecto\n",
      },
      { uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"), content: context.gitignore },
    ],
  },
  {
    type: "node-api",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "package.json"),
        content: JSON.stringify(
          {
            name: sanitizePackageName(context.projectName),
            private: true,
            version: "0.0.0",
            packageManager: formatPackageManager(context.packageManager),
            scripts: {
              dev: "node --watch src/index.ts",
              start: "node src/index.ts",
            },
          },
          null,
          2
        ),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "src", "index.ts"),
        content: `import http from "http";

const port = Number(process.env.PORT ?? 3000);

const server = http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("ShipOne API");
});

server.listen(port, () => {
  console.log("ShipOne API running on http://localhost:" + port);
});
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "tsconfig.json"),
        content: JSON.stringify(
          {
            compilerOptions: {
              target: "ES2020",
              module: "NodeNext",
              moduleResolution: "NodeNext",
              outDir: "dist",
              rootDir: "src",
            },
            include: ["src"],
          },
          null,
          2
        ),
      },
      { uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"), content: context.gitignore },
    ],
  },
];

export class ProjectCreationService {
  constructor(private readonly projectStore: ProjectStoreService) {}

  async connectGithub(): Promise<void> {
    const ghInstalled = await this.isGithubCliInstalled();

    if (!ghInstalled) {
      vscode.window.showErrorMessage("GitHub CLI no esta instalado. Instala 'gh' y prueba otra vez.");
      return;
    }

    const githubReady = await this.isGithubAuthenticated();

    if (githubReady) {
      vscode.window.showInformationMessage("GitHub ya esta conectado.");
      return;
    }

    const terminal = vscode.window.createTerminal("ShipOne GitHub");
    terminal.show(true);
    terminal.sendText("gh auth login -h github.com");
    vscode.window.showInformationMessage("Abre la terminal para conectar GitHub.");
  }

  async createProject(settings: ShipOneSettings): Promise<ProjectMetadata | undefined> {
    const name = await vscode.window.showInputBox({
      prompt: "Nombre del proyecto",
      placeHolder: "my-saas-app",
      validateInput: validateProjectName,
    });

    if (!name) {
      return undefined;
    }

    const type = await this.pickProjectType(settings.defaultProjectType);
    if (!type) {
      return undefined;
    }

    const description =
      (await vscode.window.showInputBox({
        prompt: "Descripcion",
        placeHolder: "Proyecto simple para ShipOne",
      })) ?? "";

    const destinationFolder = await this.pickDestinationFolder(settings.projectsRoot);
    if (!destinationFolder) {
      return undefined;
    }

    const packageManager = await this.pickPackageManager(settings.defaultPackageManager);
    if (!packageManager) {
      return undefined;
    }

    const gitChoice = await this.pickGitChoiceWithDefault(settings.createGitRepoByDefault);
    if (!gitChoice) {
      return undefined;
    }

    let githubChoice: GithubChoice | undefined;
    if (gitChoice.value) {
      const githubReady = await this.isGithubAuthenticated();

      if (githubReady) {
        githubChoice = await this.pickGithubChoice(
          settings.createGitHubRepoByDefault,
          settings.defaultVisibility
        );

        if (githubChoice === undefined) {
          return undefined;
        }
      } else {
        vscode.window.showWarningMessage(
          "GitHub no está autenticado. Se omitirá la creación del repo."
        );
      }
    }

    const folderName = sanitizeFolderName(name);
    const folderUri = vscode.Uri.joinPath(destinationFolder, folderName);
    const projectExists = await this.pathExists(folderUri);

    if (projectExists) {
      vscode.window.showErrorMessage("Ya existe una carpeta con ese nombre. Prueba otro nombre o elige otra carpeta.");
      return undefined;
    }

    await this.projectStore.createProjectFolder(folderUri);
    if (settings.createStatusFileByDefault) {
      await this.writeStatusFile(folderUri, name, description);
    }
    await this.createSelectedTemplate(folderUri, name, description, type, packageManager);

    let gitInitialized = false;
    if (gitChoice.value) {
      gitInitialized = await this.tryInitializeGit(folderUri);

      if (!gitInitialized) {
        vscode.window.showWarningMessage(
          "No se pudo inicializar Git, pero el proyecto fue creado. Puedes hacerlo luego."
        );
      } else {
        const committed = await this.tryCreateInitialCommit(folderUri);
        if (!committed) {
          vscode.window.showWarningMessage(
            "Git se inicializó, pero no se pudo crear el commit inicial."
          );
        }
      }
    }

    let repoUrl: string | null = null;
    if (gitInitialized && githubChoice?.create) {
      repoUrl = await this.tryCreateGithubRepo(folderUri, folderName, githubChoice.visibility);

      if (!repoUrl) {
        vscode.window.showWarningMessage(
          "No se pudo crear el repo de GitHub, pero el proyecto local sí fue creado."
        );
      }
    }

    const project: ProjectMetadata = {
      id: randomUUID(),
      name,
      description,
      type,
      status: "active" as ProjectStatus,
      path: folderUri.fsPath,
      repoUrl,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      finishedAt: null,
      nextAction: null,
      favorite: false,
      tags: [],
      mvpTasks: [],
      pauseReason: null,
      pauseNote: null,
    };

    await this.projectStore.createProject(project, settings.enforceOneActiveProject);

    if (settings.openAfterCreate) {
      await vscode.commands.executeCommand("vscode.openFolder", folderUri, false);
    }

    return project;
  }

  async createSampleIdea(settings: ShipOneSettings): Promise<ProjectMetadata | undefined> {
    const name = "Mi primera idea";
    const description = "Describe la idea principal aqui.";
    const type: ShipOneSettings["defaultProjectType"] = "blank";
    const packageManager = settings.defaultPackageManager;

    const destinationFolder = vscode.Uri.file(settings.projectsRoot);
    const baseFolderName = sanitizeFolderName(name);
    const folderUri = await this.findAvailableFolderUri(destinationFolder, baseFolderName);

    await this.projectStore.createProjectFolder(folderUri);
    if (settings.createStatusFileByDefault) {
      await this.writeStatusFile(folderUri, name, description);
    }
    await this.createSelectedTemplate(folderUri, name, description, type, packageManager);

    const project: ProjectMetadata = {
      id: randomUUID(),
      name,
      description,
      type,
      status: "idea" as ProjectStatus,
      path: folderUri.fsPath,
      repoUrl: null,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      finishedAt: null,
      nextAction: null,
      favorite: false,
      tags: [],
      mvpTasks: [],
      pauseReason: null,
      pauseNote: null,
    };

    await this.projectStore.createProject(project, settings.enforceOneActiveProject);
    return project;
  }

  private async pickProjectType(
    defaultProjectType: ShipOneSettings["defaultProjectType"]
  ): Promise<ShipOneSettings["defaultProjectType"] | undefined> {
    const choices = PROJECT_TYPES.map((item) => ({
      ...item,
      picked: item.value === defaultProjectType,
    }));

    const choice = await vscode.window.showQuickPick(choices, {
      title: "Tipo de proyecto",
      placeHolder: "Elige un starter",
    });

    return choice?.value as ShipOneSettings["defaultProjectType"] | undefined;
  }

  private async pickGitChoiceWithDefault(
    defaultGitRepoByDefault: boolean
  ): Promise<GitChoice | undefined> {
    return vscode.window.showQuickPick<GitChoice>(
      [
        { label: "Sí", value: true, picked: defaultGitRepoByDefault },
        { label: "No", value: false, picked: !defaultGitRepoByDefault },
      ],
      {
        title: "Git local",
        placeHolder: "¿Quieres inicializar Git en este proyecto?",
      }
    );
  }

  private async pickDestinationFolder(projectsRoot: string): Promise<vscode.Uri | undefined> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(projectsRoot),
      title: "Carpeta destino",
      openLabel: "Usar carpeta",
    });

    return picked?.[0];
  }

  private async pickGitChoice(): Promise<GitChoice | undefined> {
    return vscode.window.showQuickPick<GitChoice>(
      [
        { label: "Sí", value: true },
        { label: "No", value: false },
      ],
      {
        title: "Git local",
        placeHolder: "¿Quieres inicializar Git en este proyecto?",
      }
    );
  }

  private async pickPackageManager(
    defaultPackageManager: ShipOneSettings["defaultPackageManager"]
  ): Promise<ShipOneSettings["defaultPackageManager"] | undefined> {
    const choices: Array<{
      label: string;
      value: ShipOneSettings["defaultPackageManager"];
      picked?: boolean;
    }> = [
      { label: "npm", value: "npm", picked: defaultPackageManager === "npm" },
      { label: "pnpm", value: "pnpm", picked: defaultPackageManager === "pnpm" },
      { label: "yarn", value: "yarn", picked: defaultPackageManager === "yarn" },
    ];

    const choice = await vscode.window.showQuickPick(choices, {
      title: "Package manager",
      placeHolder: "Elige una opcion",
    });

    return choice?.value;
  }

  private async pickGithubChoice(
    defaultCreateGithubRepoByDefault: boolean,
    defaultVisibility: "private" | "public"
  ): Promise<GithubChoice | undefined> {
    const createChoice = await vscode.window.showQuickPick(
      [
        { label: "Sí", value: true, picked: defaultCreateGithubRepoByDefault },
        { label: "No", value: false, picked: !defaultCreateGithubRepoByDefault },
      ],
      {
        title: "GitHub",
        placeHolder: "¿Quieres crear un repo de GitHub?",
      }
    );

    if (!createChoice?.value) {
      return { create: false, visibility: "private" };
    }

    const visibilityOptions =
      defaultVisibility === "private"
        ? [
            { label: "Privado", value: "private" as const },
            { label: "P?blico", value: "public" as const },
          ]
        : [
            { label: "P?blico", value: "public" as const },
            { label: "Privado", value: "private" as const },
          ];

    const visibility = await vscode.window.showQuickPick(visibilityOptions, {
      title: "Visibilidad",
      placeHolder: "?Privado o p?blico?",
    });

    if (!visibility) {
      return undefined;
    }

    return { create: true, visibility: visibility.value };
  }

  private async pathExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private async writeStatusFile(
    folderUri: vscode.Uri,
    projectName: string,
    description: string
  ): Promise<void> {
    const content = [
      "# Estado actual",
      "",
      "## Objetivo",
      description || "Describe el objetivo principal aqui.",
      "",
      "## MVP",
      "- [ ]",
      "- [ ]",
      "- [ ]",
      "",
      "## Proximo paso",
      "Define el siguiente paso aqui.",
      "",
      "## Bloqueos",
      "- Ninguno por ahora",
      "",
      "## Proyecto",
      projectName,
      "",
      "## Actualizado",
      new Date().toISOString().slice(0, 10),
      "",
    ].join("\n");

    const statusFileUri = vscode.Uri.joinPath(folderUri, STATUS_FILE_NAME);
    const bytes = new TextEncoder().encode(content);
    await vscode.workspace.fs.writeFile(statusFileUri, bytes);
  }

  private async createSelectedTemplate(
    folderUri: vscode.Uri,
    projectName: string,
    description: string,
    type: ShipOneSettings["defaultProjectType"],
    packageManager: ShipOneSettings["defaultPackageManager"]
  ): Promise<void> {
    const templates = this.getTemplateFiles(folderUri, projectName, description, type, packageManager);

    for (const file of templates) {
      await this.writeFileIfMissing(file.uri, file.content);
    }
  }

  private getTemplateFiles(
    folderUri: vscode.Uri,
    projectName: string,
    description: string,
    type: ShipOneSettings["defaultProjectType"],
    packageManager: ShipOneSettings["defaultPackageManager"]
  ): Array<{ uri: vscode.Uri; content: string }> {
    const gitignore = [
      "node_modules/",
      ".venv/",
      "__pycache__/",
      ".DS_Store",
      ".env",
      "",
    ].join("\n");
    const definition = TEMPLATE_DEFINITIONS.find((item) => item.type === type) ?? TEMPLATE_DEFINITIONS[0];
    return definition.buildFiles({
      folderUri,
      projectName,
      description,
      packageManager,
      gitignore,
    });
  }

  private async writeFileIfMissing(uri: vscode.Uri, content: string): Promise<void> {
    if (await this.pathExists(uri)) {
      return;
    }

    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirname(uri.fsPath)));
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  }

  private buildBlankReadme(projectName: string, description: string): string {
    return [
      `# ${projectName}`,
      "",
      description || "Proyecto creado con ShipOne.",
      "",
      "## Proximo paso",
      "- Define el primer objetivo.",
      "",
    ].join("\n");
  }

  private buildReactVitePackageJson(
    projectName: string,
    packageManager: ShipOneSettings["defaultPackageManager"]
  ): string {
    return JSON.stringify(
      {
        name: sanitizePackageName(projectName),
        private: true,
        version: "0.0.0",
        packageManager: formatPackageManager(packageManager),
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
      },
      null,
      2
    );
  }

  private buildReactViteIndexHtml(projectName: string): string {
    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
  }

  private buildReactViteMainTsx(projectName: string): string {
    return `import "./style.css";

const root = document.getElementById("root");

if (root) {
  root.innerHTML = \`
    <main class="app">
      <h1>${projectName}</h1>
      <p>Proyecto creado con ShipOne.</p>
    </main>
  \`;
}
`;
  }

  private buildReactViteStyleCss(): string {
    return `body {
  font-family: system-ui, sans-serif;
  margin: 0;
}

.app {
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
}
`;
  }

  private buildNextJsPackageJson(
    projectName: string,
    packageManager: ShipOneSettings["defaultPackageManager"]
  ): string {
    return JSON.stringify(
      {
        name: sanitizePackageName(projectName),
        private: true,
        version: "0.0.0",
        packageManager: formatPackageManager(packageManager),
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
      },
      null,
      2
    );
  }

  private buildNextJsLayoutTsx(projectName: string, description: string): string {
    return `export const metadata = {
  title: "${projectName}",
  description: "${escapeForTsx(description || "Proyecto creado con ShipOne.")}",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
`;
  }

  private buildNextJsPageTsx(projectName: string, description: string): string {
    return `export default function Page() {
  return (
    <main>
      <h1>${projectName}</h1>
      <p>${escapeForTsx(description || "Proyecto creado con ShipOne.")}</p>
    </main>
  );
}
`;
  }

  private buildPythonMainPy(projectName: string, description: string): string {
    return [
      '"""',
      projectName,
      description || "Proyecto creado con ShipOne.",
      '"""',
      "",
      'def main() -> None:',
      `    print("${escapeForPython(projectName)}")`,
      "",
      "",
      'if __name__ == "__main__":',
      "    main()",
      "",
    ].join("\n");
  }

  private buildNodeApiPackageJson(
    projectName: string,
    packageManager: ShipOneSettings["defaultPackageManager"]
  ): string {
    return JSON.stringify(
      {
        name: sanitizePackageName(projectName),
        private: true,
        version: "0.0.0",
        packageManager: formatPackageManager(packageManager),
        scripts: {
          dev: "node --watch src/index.ts",
          start: "node src/index.ts",
        },
      },
      null,
      2
    );
  }

  private buildNodeApiIndexTs(projectName: string): string {
    return `import http from "http";

const server = http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ project: "${escapeForTsx(projectName)}", status: "ok" }));
});

server.listen(3000, () => {
  console.log("ShipOne API running on http://localhost:3000");
});
`;
  }

  private buildNodeApiTsconfig(): string {
    return JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          outDir: "dist",
          rootDir: "src",
        },
        include: ["src"],
      },
      null,
      2
    );
  }

  private async findAvailableFolderUri(baseFolder: vscode.Uri, folderName: string): Promise<vscode.Uri> {
    let candidate = vscode.Uri.joinPath(baseFolder, folderName);
    let suffix = 2;

    while (await this.pathExists(candidate)) {
      candidate = vscode.Uri.joinPath(baseFolder, `${folderName}-${suffix}`);
      suffix += 1;
    }

    return candidate;
  }

  private async tryInitializeGit(folderUri: vscode.Uri): Promise<boolean> {
    try {
      await execFileAsync("git", ["init"], { cwd: folderUri.fsPath });
      return true;
    } catch {
      return false;
    }
  }

  private async tryCreateInitialCommit(folderUri: vscode.Uri): Promise<boolean> {
    try {
      await execFileAsync("git", ["add", "."], { cwd: folderUri.fsPath });
      await execFileAsync("git", ["commit", "-m", "chore: initial commit"], {
        cwd: folderUri.fsPath,
      });
      await execFileAsync("git", ["branch", "-M", "main"], { cwd: folderUri.fsPath });
      return true;
    } catch {
      return false;
    }
  }

  private async tryCreateGithubRepo(
    folderUri: vscode.Uri,
    repoName: string,
    visibility: "private" | "public"
  ): Promise<string | null> {
    try {
      await execFileAsync(
        "gh",
        [
          "repo",
          "create",
          repoName,
          visibility === "private" ? "--private" : "--public",
          "--source",
          ".",
          "--remote",
          "origin",
          "--push",
          "--confirm",
        ],
        { cwd: folderUri.fsPath }
      );

      const { stdout } = await execFileAsync(
        "gh",
        ["repo", "view", "--json", "url", "--jq", ".url"],
        { cwd: folderUri.fsPath }
      );

      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  private async isGithubAuthenticated(): Promise<boolean> {
    try {
      await execFileAsync("gh", ["auth", "status", "-h", "github.com"]);
      return true;
    } catch {
      return false;
    }
  }

  private async isGithubCliInstalled(): Promise<boolean> {
    try {
      await execFileAsync("gh", ["--version"]);
      return true;
    } catch {
      return false;
    }
  }
}

function validateProjectName(value: string): string | undefined {
  if (!value.trim()) {
    return "Escribe un nombre.";
  }

  if (!/^[a-zA-Z0-9 _.-]+$/.test(value)) {
    return "Usa solo letras, numeros, espacios, guiones o puntos.";
  }

  return undefined;
}

function sanitizeFolderName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9 _.-]/g, "-").replace(/\s+/g, "-");
}

function sanitizePackageName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "shipone-project";
}

function escapeForTsx(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
}

function escapeForPython(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatPackageManager(value: "npm" | "pnpm" | "yarn"): string {
  return `${value}@latest`;
}
