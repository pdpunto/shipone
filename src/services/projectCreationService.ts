import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { t } from "../localization";
import { translationKeys as k } from "../localization/keys";
import type { ProjectMetadata, ProjectStatus } from "../models/project";
import { createProjectMetadata } from "../models/projectValidation";
import type { ShipOneSettings } from "../models/settings";
import type { ProjectStoreService } from "./projectStoreService";
import { GitService } from "./gitService";
import { GitHubService } from "./githubService";
import { TemplateService } from "./templateService";
import type { ProjectContextService } from "./projectContextService";
import type { StatusFileService } from "./statusFileService";

const PROJECT_TYPES = [
  { label: t(k.projectCreation.blank), value: "blank" },
  { label: t(k.projectCreation.reactVite), value: "react-vite" },
  { label: t(k.projectCreation.nextJs), value: "nextjs" },
  { label: t(k.projectCreation.python), value: "python" },
  { label: t(k.projectCreation.nodeApi), value: "node-api" },
] as const;

type GitChoice = { label: string; value: boolean; picked?: boolean };
type GitHubChoice = { create: boolean; visibility: "private" | "public" };

export class ProjectCreationService {
  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly statusFileService: StatusFileService,
    private readonly projectContextService: ProjectContextService,
    private readonly templateService = new TemplateService(),
    private readonly gitService = new GitService(),
    private readonly githubService = new GitHubService()
  ) {}

  async connectGitHub(): Promise<void> {
    await this.githubService.connectGitHub();
  }

  async createProject(
    settings: ShipOneSettings
  ): Promise<ProjectMetadata | undefined> {
    // Primero recogemos la forma minima del proyecto; lo demas depende de esas elecciones.
    const name = await vscode.window.showInputBox({
      prompt: t("Nombre del proyecto"),
      placeHolder: t(k.common.projectNamePlaceholder),
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
        placeHolder: t(k.common.projectDescriptionPlaceholder),
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

    let githubChoice: GitHubChoice | undefined;
    // GitHub solo tiene sentido si Git local va a existir y el usuario ya esta autenticado.
    if (gitChoice.value) {
      let githubReady = await this.githubService.isGitHubAuthenticated();

      if (!githubReady) {
        const choice = await vscode.window.showWarningMessage(
          t(k.github.notAuthenticated),
          t(k.common.connectGitHub),
          t(k.common.followWithoutGitHub)
        );

        if (choice === t(k.common.connectGitHub)) {
          await this.githubService.connectGitHub();
          githubReady = await this.githubService.isGitHubAuthenticated();
        }
      }

      if (githubReady) {
        githubChoice = await this.pickGitHubChoice(
          settings.createGitHubRepoByDefault,
          settings.defaultVisibility
        );

        if (githubChoice === undefined) {
          return undefined;
        }
      } else {
        vscode.window.showWarningMessage(
          t(k.github.notAuthenticatedSkipped)
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

    // Guardamos la metadata antes de tocar servicios externos para que el proyecto ya exista en ShipOne.
    const project = createProjectMetadata({
      id: randomUUID(),
      name,
      description,
      type,
      status: "active" as ProjectStatus,
      path: folderUri.fsPath,
      repoUrl: null,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    });

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
        const choice = await vscode.window.showWarningMessage(
          t(k.warning.gitInitFailed),
          t(k.common.openFolder),
          t(k.common.followWithoutGit)
        );

        if (choice === t(k.common.openFolder)) {
          await vscode.commands.executeCommand(
            "vscode.openFolder",
            folderUri,
            false
          );
        }
      } else {
        const committed = await this.gitService.createInitialCommit(folderUri);
        if (!committed) {
          const choice = await vscode.window.showWarningMessage(
            t(k.warning.gitCommitFailed),
            t(k.common.openFolder),
            t(k.common.followWithoutCommit)
          );

          if (choice === t(k.common.openFolder)) {
            await vscode.commands.executeCommand(
              "vscode.openFolder",
              folderUri,
              false
            );
          }
        }
      }
    }

    if (gitInitialized && githubChoice?.create) {
      project.repoUrl = await this.githubService.createGitHubRepo(
        folderUri,
        folderName,
        githubChoice.visibility
      );

      if (!project.repoUrl) {
        const choice = await vscode.window.showWarningMessage(
          t(k.warning.githubRepoFailed),
          t(k.common.connectGitHub),
          t(k.common.openFolder)
        );

        if (choice === t(k.common.connectGitHub)) {
          await this.githubService.connectGitHub();
        } else if (choice === t(k.common.openFolder)) {
          await vscode.commands.executeCommand(
            "vscode.openFolder",
            folderUri,
            false
          );
        }
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

    // La idea de ejemplo usa la misma forma que un proyecto real para que el resto del flujo no cambie.
    const project = createProjectMetadata({
      id: randomUUID(),
      name,
      description,
      type,
      status: "idea" as ProjectStatus,
      path: folderUri.fsPath,
      repoUrl: null,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    });

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
      title: t(k.projectCreation.projectType),
      placeHolder: t(k.common.chooseStarter),
    });

    return choice?.value as ShipOneSettings["defaultProjectType"] | undefined;
  }

  private async pickGitChoiceWithDefault(
    defaultGitRepoByDefault: boolean
  ): Promise<GitChoice | undefined> {
    return vscode.window.showQuickPick<GitChoice>(
      [
        { label: t(k.common.yes), value: true, picked: defaultGitRepoByDefault },
        { label: t(k.common.no), value: false, picked: !defaultGitRepoByDefault },
      ],
      {
        title: t("Git local"),
        placeHolder: t(k.common.askGitLocal),
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
      openLabel: t(k.common.useFolder),
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
        label: t(k.common.npm),
        value: "npm",
        picked: defaultPackageManager === "npm",
      },
      {
        label: t(k.common.pnpm),
        value: "pnpm",
        picked: defaultPackageManager === "pnpm",
      },
      {
        label: t(k.common.yarn),
        value: "yarn",
        picked: defaultPackageManager === "yarn",
      },
    ];

    const choice = await vscode.window.showQuickPick(choices, {
      title: t(k.projectCreation.packageManager),
      placeHolder: t(k.common.chooseOption),
    });

    return choice?.value;
  }

  private async pickGitHubChoice(
    defaultCreateGithubRepoByDefault: boolean,
    defaultVisibility: "private" | "public"
  ): Promise<GitHubChoice | undefined> {
    const createChoice = await vscode.window.showQuickPick(
      [
        {
          label: t(k.common.yes),
          value: true,
          picked: defaultCreateGithubRepoByDefault,
        },
        {
          label: t(k.common.no),
          value: false,
          picked: !defaultCreateGithubRepoByDefault,
        },
      ],
      {
        title: t(k.projectCreation.gitHub),
        placeHolder: t(k.projectCreation.askGitHubRepo),
      }
    );

    if (!createChoice?.value) {
      return { create: false, visibility: "private" };
    }

    const visibilityOptions =
      defaultVisibility === "private"
        ? [
            { label: t(k.projectCreation.private), value: "private" as const },
            { label: t(k.projectCreation.public), value: "public" as const },
          ]
        : [
            { label: t(k.projectCreation.public), value: "public" as const },
            { label: t(k.projectCreation.private), value: "private" as const },
          ];

    const visibility = await vscode.window.showQuickPick(visibilityOptions, {
      title: t(k.projectCreation.visibility),
      placeHolder: t(k.common.privateOrPublic),
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
