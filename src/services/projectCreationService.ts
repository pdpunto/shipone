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
  {
    label: t(k.projectCreation.blank),
    description: t(k.projectCreation.blankDescription),
    value: "blank",
  },
  {
    label: t(k.projectCreation.reactVite),
    description: t(k.projectCreation.reactViteDescription),
    value: "react-vite",
  },
  {
    label: t(k.projectCreation.nextJs),
    description: t(k.projectCreation.nextJsDescription),
    value: "nextjs",
  },
  {
    label: t(k.projectCreation.python),
    description: t(k.projectCreation.pythonDescription),
    value: "python",
  },
  {
    label: t(k.projectCreation.nodeApi),
    description: t(k.projectCreation.nodeApiDescription),
    value: "node-api",
  },
] as const;

type GitChoice = { label: string; value: boolean; picked?: boolean };
type GitHubChoice = { create: boolean; visibility: "private" | "public" };
type ProjectCreationDraft = {
  name: string;
  description: string;
  type: ShipOneSettings["defaultProjectType"];
  destinationFolder: vscode.Uri;
  packageManager: ShipOneSettings["defaultPackageManager"];
  gitChoice: GitChoice;
  githubChoice?: GitHubChoice;
};

const LAST_PROJECT_TYPE_KEY = "shipone.lastProjectType";
const LAST_PACKAGE_MANAGER_KEY = "shipone.lastPackageManager";

export class ProjectCreationService {
  constructor(
    private readonly context: vscode.ExtensionContext,
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
    const defaults = this.getCreationDefaults(settings);
    // Primero recogemos la forma minima del proyecto; lo demas depende de esas elecciones.
    const name = await vscode.window.showInputBox({
      prompt: t(k.projectCreation.projectNamePrompt),
      placeHolder: t("my-saas-app"),
      validateInput: validateProjectName,
    });

    if (!name) {
      return undefined;
    }

    const type = await this.pickProjectType(defaults.projectType);
    if (!type) {
      return undefined;
    }

    const description =
      (await vscode.window.showInputBox({
        prompt: t(k.projectCreation.projectDescriptionPrompt),
        placeHolder: t("Proyecto simple para ShipOne"),
      })) ?? "";

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

    return this.createProjectFromDraft(settings, {
      name,
      description,
      type,
      destinationFolder: vscode.Uri.file(settings.projectsRoot),
      packageManager: defaults.packageManager,
      gitChoice,
      githubChoice,
    });
  }

  async createQuickProject(
    settings: ShipOneSettings
  ): Promise<ProjectMetadata | undefined> {
    const defaults = this.getCreationDefaults(settings);
    const name = await vscode.window.showInputBox({
      prompt: t(k.projectCreation.projectNamePrompt),
      placeHolder: t(k.common.projectNamePlaceholder),
      validateInput: validateProjectName,
    });

    if (!name) {
      return undefined;
    }

    const gitChoice: GitChoice = {
      label: t(k.common.yes),
      value: settings.createGitRepoByDefault,
    };

    let githubChoice: GitHubChoice | undefined;
    if (gitChoice.value) {
      const githubReady = await this.githubService.isGitHubAuthenticated();
      if (githubReady) {
        githubChoice = {
          create: settings.createGitHubRepoByDefault,
          visibility: settings.defaultVisibility,
        };
      }
    }

    return this.createProjectFromDraft(settings, {
      name,
      description: "",
      type: defaults.projectType,
      destinationFolder: vscode.Uri.file(settings.projectsRoot),
      packageManager: defaults.packageManager,
      gitChoice,
      githubChoice,
    });
  }

  async createSampleIdea(
    settings: ShipOneSettings
  ): Promise<ProjectMetadata | undefined> {
    const name = t(k.projectCreation.sampleIdeaName);
    const description = t(k.projectCreation.sampleIdeaDescription);
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
      matchOnDescription: true,
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
        title: t(k.projectCreation.gitLocal),
        placeHolder: t(k.common.askGitLocal),
      }
    );
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

  private async createProjectFromDraft(
    settings: ShipOneSettings,
    draft: ProjectCreationDraft
  ): Promise<ProjectMetadata | undefined> {
    const folderName = sanitizeFolderName(draft.name);
    const folderUri = vscode.Uri.joinPath(draft.destinationFolder, folderName);
    const projectExists = await this.pathExists(folderUri);

    if (projectExists) {
      vscode.window.showErrorMessage(
        t(k.projectCreation.projectFolderExists)
      );
      return undefined;
    }

    await this.projectStore.createProjectFolder(folderUri);

    // Guardamos la metadata antes de tocar servicios externos para que el proyecto ya exista en ShipOne.
    const project = createProjectMetadata({
      id: randomUUID(),
      name: draft.name,
      description: draft.description,
      type: draft.type,
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
      draft.name,
      draft.description,
      draft.type,
      draft.packageManager,
      settings.customTemplateFolder
    );

    let gitInitialized = false;
    if (draft.gitChoice.value) {
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

    if (gitInitialized && draft.githubChoice?.create) {
      project.repoUrl = await this.githubService.createGitHubRepo(
        folderUri,
        folderName,
        draft.githubChoice.visibility
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

    await this.updateCreationDefaults(draft.type, draft.packageManager);

    return project;
  }

  private async pathExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private getCreationDefaults(settings: ShipOneSettings): {
    projectType: ShipOneSettings["defaultProjectType"];
    packageManager: ShipOneSettings["defaultPackageManager"];
  } {
    return {
      projectType:
        this.context.workspaceState.get<ShipOneSettings["defaultProjectType"]>(
          LAST_PROJECT_TYPE_KEY,
          settings.defaultProjectType
        ),
      packageManager:
        this.context.workspaceState.get<ShipOneSettings["defaultPackageManager"]>(
          LAST_PACKAGE_MANAGER_KEY,
          settings.defaultPackageManager
        ),
    };
  }

  private async updateCreationDefaults(
    projectType: ShipOneSettings["defaultProjectType"],
    packageManager: ShipOneSettings["defaultPackageManager"]
  ): Promise<void> {
    await this.context.workspaceState.update(
      LAST_PROJECT_TYPE_KEY,
      projectType
    );
    await this.context.workspaceState.update(
      LAST_PACKAGE_MANAGER_KEY,
      packageManager
    );
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
