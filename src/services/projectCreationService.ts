import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
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
import * as path from "path";

const PROJECT_TYPES = [
  {
    label: t(k.projectCreation.blank),
    description: t(k.projectCreation.blankDescription),
    icon: "file",
    value: "blank",
  },
  {
    label: t(k.projectCreation.reactVite),
    description: t(k.projectCreation.reactViteDescription),
    icon: "zap",
    value: "react-vite",
  },
  {
    label: t(k.projectCreation.nextJs),
    description: t(k.projectCreation.nextJsDescription),
    icon: "rocket",
    value: "nextjs",
  },
  {
    label: t(k.projectCreation.python),
    description: t(k.projectCreation.pythonDescription),
    icon: "beaker",
    value: "python",
  },
  {
    label: t(k.projectCreation.nodeApi),
    description: t(k.projectCreation.nodeApiDescription),
    icon: "server-process",
    value: "node-api",
  },
] as const;

const execFileAsync = promisify(execFile);

type GitChoice = { label: string; value: boolean; picked?: boolean };
type GitHubChoice = { create: boolean; visibility: "private" | "public" };
type ImportedProjectType = (typeof PROJECT_TYPES)[number]["value"];
type ImportedProjectStatus = "idea" | "active" | "paused" | "finished";
type ProjectCreationDraft = {
  name: string;
  description: string;
  type: ShipOneSettings["defaultProjectType"];
  destinationFolder: vscode.Uri;
  packageManager: ShipOneSettings["defaultPackageManager"];
  gitChoice: GitChoice;
  githubChoice?: GitHubChoice;
};
type ExistingProjectImportDraft = {
  folderUri: vscode.Uri;
  name: string;
  description: string;
  type: ImportedProjectType;
  status: ImportedProjectStatus;
  nextAction: string | null;
  createStatusFile: boolean;
  generateProjectContext: boolean;
  settings: ShipOneSettings;
};
type ImportedProjectFileOptions = {
  createStatusFile: boolean;
  generateProjectContext: boolean;
};
type ScannedProjectCandidate = {
  folderUri: vscode.Uri;
  name: string;
  type: ImportedProjectType;
  detail: string;
};
type ScannedProjectQuickPickItem = ScannedProjectCandidate &
  vscode.QuickPickItem;

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

  async addExistingProject(
    settings: ShipOneSettings
  ): Promise<ProjectMetadata | undefined> {
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(settings.projectsRoot),
      title: t("Select an existing project folder"),
      openLabel: t("Use folder"),
    });

    const selectedFolder = folderUri?.[0];
    if (!selectedFolder) {
      return undefined;
    }

    const existingProjects = await this.projectStore.loadProjects();
    const selectedPath = this.normalizePath(selectedFolder.fsPath);
    const alreadyTracked = existingProjects.find(
      (project) => this.normalizePath(project.path) === selectedPath
    );

    if (alreadyTracked) {
      const choice = await vscode.window.showInformationMessage(
        t("This project is already tracked by ShipOne. Open it?"),
        t(k.common.openProject)
      );

      if (choice === t(k.common.openProject)) {
        await vscode.commands.executeCommand(
          "shipone.openProject",
          alreadyTracked.id
        );
        return alreadyTracked;
      }

      return undefined;
    }

    const folderName = path.win32.basename(selectedFolder.fsPath);
    const description =
      (await vscode.window.showInputBox({
        title: t("Existing project description"),
        prompt: t("Optional description"),
        placeHolder: t("Describe this project in one line"),
      })) ?? "";

    const type = await this.pickImportedProjectType();
    if (!type) {
      return undefined;
    }

    const status = await this.pickImportedProjectStatus();
    if (!status) {
      return undefined;
    }

    const nextAction =
      (await vscode.window.showInputBox({
        title: t("Imported project next action"),
        prompt: t("Optional next action"),
        placeHolder: t("Create login"),
      })) ?? "";

    const repoUrl = await this.detectGitRemoteOrigin(selectedFolder.fsPath);

    const draft: ExistingProjectImportDraft = {
      folderUri: selectedFolder,
      name: folderName,
      description,
      type,
      status,
      nextAction: nextAction.trim() || null,
      createStatusFile: await this.askYesNo(
        t("Create STATUS.md for imported project?")
      ),
      generateProjectContext: await this.askYesNo(
        t("Generate PROJECT_CONTEXT.md for imported project?")
      ),
      settings,
    };

    const project = createProjectMetadata({
      id: randomUUID(),
      name: draft.name,
      description: draft.description,
      type: draft.type,
      status: draft.status,
      path: draft.folderUri.fsPath,
      repoUrl,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      nextAction: draft.nextAction,
    });

    await this.projectStore.createProject(
      project,
      settings.enforceOneActiveProject
    );

    await this.applyImportedProjectFiles(project, {
      createStatusFile: draft.createStatusFile,
      generateProjectContext: draft.generateProjectContext,
    });

    await vscode.commands.executeCommand("shipone.refreshProjects");

    await vscode.window.showInformationMessage(
      t("Existing project added: {0}.", project.name)
    );

    return project;
  }

  async scanProjectsRoot(
    settings: ShipOneSettings,
    options: {
      silent?: boolean;
      createStatusFile?: boolean;
      generateProjectContext?: boolean;
    } = {}
  ): Promise<ProjectMetadata[]> {
    const rootUri = vscode.Uri.file(settings.projectsRoot);
    const rootExists = await this.pathExists(rootUri);

    if (!rootExists) {
      if (!options.silent) {
        await vscode.window.showErrorMessage(
          t("The projects root folder does not exist.")
        );
      }
      return [];
    }

    const candidates = await this.findScannableProjects(rootUri);
    if (candidates.length === 0) {
      if (!options.silent) {
        await vscode.window.showInformationMessage(
          t("No new projects were found in the projects root.")
        );
      }
      return [];
    }

    const selectedCandidates = options.silent
      ? candidates
      : await this.pickScannedProjects(candidates);

    if (!selectedCandidates || selectedCandidates.length === 0) {
      return [];
    }

    const importedProjectFiles = {
      createStatusFile: options.silent
        ? false
        : (options.createStatusFile ??
          (await this.askYesNo(t("Create STATUS.md for imported projects?")))),
      generateProjectContext: options.silent
        ? false
        : (options.generateProjectContext ??
          (await this.askYesNo(
            t("Generate PROJECT_CONTEXT.md for imported projects?")
          ))),
    };

    const addedProjects: ProjectMetadata[] = [];
    for (const choice of selectedCandidates) {
      const project = createProjectMetadata({
        id: randomUUID(),
        name: choice.name,
        description: "",
        type: choice.type,
        status: "idea",
        path: choice.folderUri.fsPath,
        repoUrl: await this.detectGitRemoteOrigin(choice.folderUri.fsPath),
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      });

      await this.projectStore.createProject(
        project,
        settings.enforceOneActiveProject
      );

      await this.applyImportedProjectFiles(project, importedProjectFiles);
      addedProjects.push(project);
    }

    await vscode.commands.executeCommand("shipone.refreshProjects");
    if (!options.silent) {
      await vscode.window.showInformationMessage(
        t("Added {0} existing projects.", addedProjects.length)
      );
    }

    return addedProjects;
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
        vscode.window.showInformationMessage(
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

  private async pickProjectType(
    defaultProjectType: ShipOneSettings["defaultProjectType"]
  ): Promise<ShipOneSettings["defaultProjectType"] | undefined> {
    const choices = PROJECT_TYPES.map((item) => ({
      ...item,
      iconPath: new vscode.ThemeIcon(item.icon),
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
        {
          label: t(k.common.yes),
          value: true,
          picked: defaultGitRepoByDefault,
        },
        {
          label: t(k.common.no),
          value: false,
          picked: !defaultGitRepoByDefault,
        },
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
    const folderUri = await this.findAvailableFolderUri(
      draft.destinationFolder,
      folderName
    );

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
      projectType: this.context.workspaceState.get<
        ShipOneSettings["defaultProjectType"]
      >(LAST_PROJECT_TYPE_KEY, settings.defaultProjectType),
      packageManager: this.context.workspaceState.get<
        ShipOneSettings["defaultPackageManager"]
      >(LAST_PACKAGE_MANAGER_KEY, settings.defaultPackageManager),
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

  private async pickImportedProjectType(): Promise<
    ImportedProjectType | undefined
  > {
    const choice = await vscode.window.showQuickPick(
      PROJECT_TYPES.map((item) => ({
        label: item.label,
        description: item.description,
        value: item.value,
        iconPath: new vscode.ThemeIcon(item.icon),
      })),
      {
        title: t("Project type"),
        placeHolder: t("Choose the imported project type"),
      }
    );

    return choice?.value;
  }

  private async pickImportedProjectStatus(): Promise<
    ImportedProjectStatus | undefined
  > {
    const choice = await vscode.window.showQuickPick(
      [
        { label: t(k.projectStatus.idea), value: "idea" as const },
        { label: t(k.projectStatus.active), value: "active" as const },
        { label: t(k.projectStatus.paused), value: "paused" as const },
        { label: t(k.projectStatus.finished), value: "finished" as const },
      ],
      {
        title: t("Project status"),
        placeHolder: t("Choose the imported project status"),
      }
    );

    return choice?.value;
  }

  private async askYesNo(message: string): Promise<boolean> {
    const choice = await vscode.window.showInformationMessage(
      message,
      t(k.common.yes),
      t(k.common.no)
    );

    return choice === t(k.common.yes);
  }

  private async pickScannedProjects(
    candidates: ScannedProjectCandidate[]
  ): Promise<ScannedProjectCandidate[] | undefined> {
    const choices: ScannedProjectQuickPickItem[] = candidates.map((choice) => ({
      ...choice,
      label: choice.name,
      description: choice.type,
      detail: choice.detail,
    }));

    const selected = await vscode.window.showQuickPick(choices, {
      canPickMany: true,
      title: t("Scan projects root"),
      placeHolder: t("Choose the folders to add"),
    });

    return selected?.length ? selected : undefined;
  }

  private async applyImportedProjectFiles(
    project: ProjectMetadata,
    options: ImportedProjectFileOptions
  ): Promise<void> {
    if (options.createStatusFile) {
      try {
        await this.statusFileService.syncStatusFile(project);
      } catch {
        await vscode.window.showWarningMessage(
          t("STATUS.md could not be created for the imported project.")
        );
      }
    }

    if (options.generateProjectContext) {
      try {
        await this.projectContextService.generateAiContext(project);
      } catch {
        await vscode.window.showWarningMessage(
          t("PROJECT_CONTEXT.md could not be created for the imported project.")
        );
      }
    }
  }

  private async detectGitRemoteOrigin(
    folderPath: string
  ): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["remote", "get-url", "origin"],
        { cwd: folderPath }
      );

      const remote = stdout.trim();
      return remote || null;
    } catch {
      return null;
    }
  }

  private normalizePath(value: string): string {
    const normalized = path.resolve(value);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  }

  private async findScannableProjects(
    rootUri: vscode.Uri
  ): Promise<ScannedProjectCandidate[]> {
    const entries = await vscode.workspace.fs.readDirectory(rootUri);
    const existingProjects = await this.projectStore.loadProjects();
    const existingPaths = new Set(
      existingProjects.map((project) => this.normalizePath(project.path))
    );

    const candidates: ScannedProjectCandidate[] = [];
    for (const [name, fileType] of entries) {
      if (fileType !== vscode.FileType.Directory) {
        continue;
      }

      if (this.shouldIgnoreScannedFolder(name)) {
        continue;
      }

      const folderUri = vscode.Uri.joinPath(rootUri, name);
      if (existingPaths.has(this.normalizePath(folderUri.fsPath))) {
        continue;
      }

      candidates.push({
        folderUri,
        name,
        type: await this.detectScannedProjectType(folderUri),
        detail: folderUri.fsPath,
      });
    }

    return candidates.sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  private shouldIgnoreScannedFolder(name: string): boolean {
    if (name.startsWith(".")) {
      return true;
    }

    return [
      ".git",
      "node_modules",
      "dist",
      "out",
      "build",
      ".venv",
      "__pycache__",
    ].includes(name);
  }

  private async detectScannedProjectType(
    folderUri: vscode.Uri
  ): Promise<ImportedProjectType> {
    const hasPackageJson = await this.pathExists(
      vscode.Uri.joinPath(folderUri, "package.json")
    );

    if (hasPackageJson) {
      if (
        (await this.pathExists(
          vscode.Uri.joinPath(folderUri, "next.config.js")
        )) ||
        (await this.pathExists(
          vscode.Uri.joinPath(folderUri, "next.config.mjs")
        )) ||
        (await this.pathExists(
          vscode.Uri.joinPath(folderUri, "next.config.ts")
        ))
      ) {
        return "nextjs";
      }

      if (
        (await this.pathExists(
          vscode.Uri.joinPath(folderUri, "vite.config.js")
        )) ||
        (await this.pathExists(
          vscode.Uri.joinPath(folderUri, "vite.config.mjs")
        )) ||
        (await this.pathExists(
          vscode.Uri.joinPath(folderUri, "vite.config.ts")
        ))
      ) {
        return "react-vite";
      }

      return "node-api";
    }

    if (
      (await this.pathExists(
        vscode.Uri.joinPath(folderUri, "requirements.txt")
      )) ||
      (await this.pathExists(vscode.Uri.joinPath(folderUri, "pyproject.toml")))
    ) {
      return "python";
    }

    return "blank";
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

export function validateProjectName(value: string): string | undefined {
  if (!value.trim()) {
    return t("Escribe un nombre.");
  }

  if (!/^[a-zA-Z0-9 _.-]+$/.test(value)) {
    return t("Usa solo letras, numeros, espacios, guiones o puntos.");
  }

  return undefined;
}

export function sanitizeFolderName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9 _.-]/g, "-")
    .replace(/\s+/g, "-");
}
