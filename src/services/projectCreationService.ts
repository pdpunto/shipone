import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { t } from "../localization";
import { ProjectMetadata, ProjectStatus } from "../models/project";
import { ShipOneSettings } from "../models/settings";
import { ProjectStoreService } from "./projectStoreService";
import { GitService } from "./gitService";
import { GithubService } from "./githubService";
import { TemplateService } from "./templateService";
import { ProjectContextService } from "./projectContextService";
import { StatusFileService } from "./statusFileService";

const PROJECT_TYPES = [
  { label: t("Blank"), value: "blank" },
  { label: t("React Vite"), value: "react-vite" },
  { label: t("Next.js"), value: "nextjs" },
  { label: t("Python"), value: "python" },
] as const;

type GitChoice = { label: string; value: boolean; picked?: boolean };
type GithubChoice = { create: boolean; visibility: "private" | "public" };

export class ProjectCreationService {
  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly statusFileService: StatusFileService,
    private readonly projectContextService: ProjectContextService,
    private readonly templateService = new TemplateService(),
    private readonly gitService = new GitService(),
    private readonly githubService = new GithubService()
  ) {}

  async connectGithub(): Promise<void> {
    await this.githubService.connectGithub();
  }

  async createProject(
    settings: ShipOneSettings
  ): Promise<ProjectMetadata | undefined> {
    const name = await vscode.window.showInputBox({
      prompt: t("Nombre del proyecto"),
      placeHolder: t("my-saas-app"),
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
        prompt: t("Descripcion"),
        placeHolder: t("Proyecto simple para ShipOne"),
      })) ?? "";

    const destinationFolder = await this.pickDestinationFolder(
      settings.projectsRoot
    );
    if (!destinationFolder) {
      return undefined;
    }

    const packageManager = await this.pickPackageManager(
      settings.defaultPackageManager
    );
    if (!packageManager) {
      return undefined;
    }

    const gitChoice = await this.pickGitChoiceWithDefault(
      settings.createGitRepoByDefault
    );
    if (!gitChoice) {
      return undefined;
    }

    let githubChoice: GithubChoice | undefined;
    if (gitChoice.value) {
      const githubReady = await this.githubService.isGithubAuthenticated();

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
          t("GitHub no esta autenticado. Se omitira la creacion del repo.")
        );
      }
    }

    const folderName = sanitizeFolderName(name);
    const folderUri = vscode.Uri.joinPath(destinationFolder, folderName);
    const projectExists = await this.pathExists(folderUri);

    if (projectExists) {
      vscode.window.showErrorMessage(
        t(
          "Ya existe una carpeta con ese nombre. Prueba otro nombre o elige otra carpeta."
        )
      );
      return undefined;
    }

    await this.projectStore.createProjectFolder(folderUri);

    const project: ProjectMetadata = {
      id: randomUUID(),
      name,
      description,
      type,
      status: "active" as ProjectStatus,
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

    if (settings.createStatusFileByDefault) {
      await this.statusFileService.syncStatusFile(project);
    }

    await this.templateService.createSelectedTemplate(
      folderUri,
      name,
      description,
      type,
      packageManager,
      settings.customTemplateFolder
    );

    let gitInitialized = false;
    if (gitChoice.value) {
      gitInitialized = await this.gitService.initializeGit(folderUri);

      if (!gitInitialized) {
        vscode.window.showWarningMessage(
          t(
            "No se pudo inicializar Git, pero el proyecto fue creado. Puedes hacerlo luego."
          )
        );
      } else {
        const committed = await this.gitService.createInitialCommit(folderUri);
        if (!committed) {
          vscode.window.showWarningMessage(
            t("Git se inicializo, pero no se pudo crear el commit inicial.")
          );
        }
      }
    }

    if (gitInitialized && githubChoice?.create) {
      project.repoUrl = await this.githubService.createGithubRepo(
        folderUri,
        folderName,
        githubChoice.visibility
      );

      if (!project.repoUrl) {
        vscode.window.showWarningMessage(
          t(
            "No se pudo crear el repo de GitHub, pero el proyecto local si fue creado."
          )
        );
      }
    }

    await this.projectStore.createProject(
      project,
      settings.enforceOneActiveProject
    );

    if (settings.openAfterCreate) {
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        folderUri,
        false
      );
    }

    return project;
  }

  async createSampleIdea(
    settings: ShipOneSettings
  ): Promise<ProjectMetadata | undefined> {
    const name = t("Mi primera idea");
    const description = t("Describe la idea principal aqui.");
    const type: ShipOneSettings["defaultProjectType"] = "blank";
    const packageManager = settings.defaultPackageManager;

    const destinationFolder = vscode.Uri.file(settings.projectsRoot);
    const baseFolderName = sanitizeFolderName(name);
    const folderUri = await this.findAvailableFolderUri(
      destinationFolder,
      baseFolderName
    );

    await this.projectStore.createProjectFolder(folderUri);

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

    if (settings.createStatusFileByDefault) {
      await this.statusFileService.syncStatusFile(project);
    }

    await this.templateService.createSelectedTemplate(
      folderUri,
      name,
      description,
      type,
      packageManager,
      settings.customTemplateFolder
    );

    await this.projectStore.createProject(
      project,
      settings.enforceOneActiveProject
    );
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
      title: t("Tipo de proyecto"),
      placeHolder: t("Elige un starter"),
    });

    return choice?.value as ShipOneSettings["defaultProjectType"] | undefined;
  }

  private async pickGitChoiceWithDefault(
    defaultGitRepoByDefault: boolean
  ): Promise<GitChoice | undefined> {
    return vscode.window.showQuickPick<GitChoice>(
      [
        { label: t("Si"), value: true, picked: defaultGitRepoByDefault },
        { label: t("No"), value: false, picked: !defaultGitRepoByDefault },
      ],
      {
        title: t("Git local"),
        placeHolder: t("Quieres inicializar Git en este proyecto?"),
      }
    );
  }

  private async pickDestinationFolder(
    projectsRoot: string
  ): Promise<vscode.Uri | undefined> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(projectsRoot),
      title: t("Carpeta destino"),
      openLabel: t("Usar carpeta"),
    });

    return picked?.[0];
  }

  private async pickPackageManager(
    defaultPackageManager: ShipOneSettings["defaultPackageManager"]
  ): Promise<ShipOneSettings["defaultPackageManager"] | undefined> {
    const choices: Array<{
      label: string;
      value: ShipOneSettings["defaultPackageManager"];
      picked?: boolean;
    }> = [
      {
        label: t("npm"),
        value: "npm",
        picked: defaultPackageManager === "npm",
      },
      {
        label: t("pnpm"),
        value: "pnpm",
        picked: defaultPackageManager === "pnpm",
      },
      {
        label: t("yarn"),
        value: "yarn",
        picked: defaultPackageManager === "yarn",
      },
    ];

    const choice = await vscode.window.showQuickPick(choices, {
      title: t("Package manager"),
      placeHolder: t("Elige una opcion"),
    });

    return choice?.value;
  }

  private async pickGithubChoice(
    defaultCreateGithubRepoByDefault: boolean,
    defaultVisibility: "private" | "public"
  ): Promise<GithubChoice | undefined> {
    const createChoice = await vscode.window.showQuickPick(
      [
        {
          label: t("Si"),
          value: true,
          picked: defaultCreateGithubRepoByDefault,
        },
        {
          label: t("No"),
          value: false,
          picked: !defaultCreateGithubRepoByDefault,
        },
      ],
      {
        title: t("GitHub"),
        placeHolder: t("Quieres crear un repo de GitHub?"),
      }
    );

    if (!createChoice?.value) {
      return { create: false, visibility: "private" };
    }

    const visibilityOptions =
      defaultVisibility === "private"
        ? [
            { label: t("Privado"), value: "private" as const },
            { label: t("Público"), value: "public" as const },
          ]
        : [
            { label: t("Público"), value: "public" as const },
            { label: t("Privado"), value: "private" as const },
          ];

    const visibility = await vscode.window.showQuickPick(visibilityOptions, {
      title: t("Visibilidad"),
      placeHolder: t("Privado o público?"),
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

  private async findAvailableFolderUri(
    baseFolder: vscode.Uri,
    folderName: string
  ): Promise<vscode.Uri> {
    let candidate = vscode.Uri.joinPath(baseFolder, folderName);
    let suffix = 2;

    while (await this.pathExists(candidate)) {
      candidate = vscode.Uri.joinPath(baseFolder, `${folderName}-${suffix}`);
      suffix += 1;
    }

    return candidate;
  }
}

function validateProjectName(value: string): string | undefined {
  if (!value.trim()) {
    return t("Escribe un nombre.");
  }

  if (!/^[a-zA-Z0-9 _.-]+$/.test(value)) {
    return t("Usa solo letras, numeros, espacios, guiones o puntos.");
  }

  return undefined;
}

function sanitizeFolderName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9 _.-]/g, "-")
    .replace(/\s+/g, "-");
}
