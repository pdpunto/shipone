import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
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

export class ProjectCreationService {
  constructor(private readonly projectStore: ProjectStoreService) {}

  async connectGithub(): Promise<void> {
    const ghInstalled = await this.isGithubCliInstalled();

    if (!ghInstalled) {
      vscode.window.showErrorMessage("GitHub CLI no esta instalado.");
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

    const gitChoice = await this.pickGitChoiceWithDefault(settings.createGitRepoByDefault);
    if (!gitChoice) {
      return undefined;
    }

    let githubChoice: GithubChoice | undefined;
    if (gitChoice.value) {
      const githubReady = await this.isGithubAuthenticated();

      if (githubReady) {
        githubChoice = await this.pickGithubChoice(settings.defaultVisibility);

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
      vscode.window.showErrorMessage("Ya existe una carpeta con ese nombre.");
      return undefined;
    }

    await this.projectStore.createProjectFolder(folderUri);
    await this.writeStatusFile(folderUri, name, description);

    let gitInitialized = false;
    if (gitChoice.value) {
      gitInitialized = await this.tryInitializeGit(folderUri);

      if (!gitInitialized) {
        vscode.window.showWarningMessage(
          "No se pudo inicializar Git, pero el proyecto fue creado."
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

    await this.projectStore.createProject(project);

    if (settings.openAfterCreate) {
      await vscode.commands.executeCommand("vscode.openFolder", folderUri, false);
    }

    return project;
  }

  private async pickProjectType(defaultProjectType: ShipOneSettings["defaultProjectType"]): Promise<string | undefined> {
    const choices = PROJECT_TYPES.map((item) => ({
      ...item,
      picked: item.value === defaultProjectType,
    }));

    const choice = await vscode.window.showQuickPick(choices, {
      title: "Tipo de proyecto",
      placeHolder: "Elige un starter",
    });

    return choice?.value;
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

  private async pickGithubChoice(
    defaultVisibility: "private" | "public"
  ): Promise<GithubChoice | undefined> {
    const createChoice = await vscode.window.showQuickPick(
      [
        { label: "Sí", value: true },
        { label: "No", value: false },
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
            { label: "Público", value: "public" as const },
          ]
        : [
            { label: "Público", value: "public" as const },
            { label: "Privado", value: "private" as const },
          ];

    const visibility = await vscode.window.showQuickPick(visibilityOptions, {
      title: "Visibilidad",
      placeHolder: "¿Privado o público?",
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
