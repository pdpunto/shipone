import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { ProjectMetadata, ProjectStatus } from "../../models/project";
import type { ShipOneSettings } from "../../models/settings";
import type { GitService } from "../../services/gitService";
import type { ProjectStoreService } from "../../services/projectStoreService";
import type { GitHubService } from "../../services/githubService";
import type { SettingsService } from "../../services/settingsService";
import type { ShipOneProjectsTreeDataProvider } from "../../providers/shiponeProjectsTreeDataProvider";
import { confirmCanActivateProject, pickProject } from "./projectOpsHelpers";

const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_MARK_PROJECT_IDEA = "shipone.markProjectIdea";
const COMMAND_MARK_PROJECT_ACTIVE = "shipone.markProjectActive";
const COMMAND_MARK_PROJECT_PAUSED = "shipone.markProjectPaused";
const COMMAND_MARK_PROJECT_FINISHED = "shipone.markProjectFinished";
const COMMAND_EDIT_NEXT_ACTION = "shipone.editNextAction";
const COMMAND_CLEAR_NEXT_ACTION = "shipone.clearNextAction";
const COMMAND_TOGGLE_FAVORITE = "shipone.toggleFavorite";
const COMMAND_DELETE_PROJECT = "shipone.deleteProject";
const COMMAND_INITIALIZE_GIT = "shipone.initializeGit";

export function registerProjectCommands(options: {
  context: vscode.ExtensionContext;
  projectStore: ProjectStoreService;
  gitService: GitService;
  githubService?: GitHubService;
  settingsService: SettingsService;
  treeDataProvider: ShipOneProjectsTreeDataProvider;
  getSelectedProjectId: () => string | undefined;
}): vscode.Disposable[] {
  const {
    context,
    projectStore,
    gitService,
    githubService,
    settingsService,
    treeDataProvider,
    getSelectedProjectId,
  } = options;

  const openProjectCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_PROJECT,
    async (projectArg?: unknown) => {
      const project = await resolveProject(
        projectStore,
        projectArg,
        getSelectedProjectId()
      );

      if (!project) {
        vscode.window.showErrorMessage(t(k.error.projectNotFound));
        return;
      }

      await projectStore.markProjectOpened(project.id);
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(project.path),
        false
      );
    }
  );

  const markProjectIdeaCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_IDEA,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "idea",
        projectArg,
        getSelectedProjectId()
      );
    }
  );

  const markProjectActiveCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_ACTIVE,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "active",
        projectArg,
        getSelectedProjectId()
      );
    }
  );

  const markProjectPausedCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_PAUSED,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "paused",
        projectArg,
        getSelectedProjectId()
      );
    }
  );

  const markProjectFinishedCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_FINISHED,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "finished",
        projectArg,
        getSelectedProjectId()
      );
    }
  );

  const editNextActionCommand = vscode.commands.registerCommand(
    COMMAND_EDIT_NEXT_ACTION,
    async (projectArg?: unknown) => {
      const project = await resolveProject(
        projectStore,
        projectArg,
        getSelectedProjectId()
      );

      if (!project) {
        return;
      }

      const nextAction = await vscode.window.showInputBox({
        title: t("Siguiente accion"),
        prompt: t("Que hay que hacer ahora"),
        placeHolder: t(k.common.nextActionPlaceholder),
        value: project.nextAction ?? "",
      });

      if (nextAction === undefined) {
        return;
      }

      await projectStore.setNextAction(
        project.id,
        nextAction.trim() ? nextAction.trim() : null
      );
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        t("Siguiente accion actualizada en {0}.", project.name)
      );
    }
  );

  const clearNextActionCommand = vscode.commands.registerCommand(
    COMMAND_CLEAR_NEXT_ACTION,
    async (projectArg?: unknown) => {
      const project = await resolveProject(
        projectStore,
        projectArg,
        getSelectedProjectId()
      );

      if (!project) {
        return;
      }

      await projectStore.setNextAction(project.id, null);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        t("Siguiente accion limpiada en {0}.", project.name)
      );
    }
  );

  const toggleFavoriteCommand = vscode.commands.registerCommand(
    COMMAND_TOGGLE_FAVORITE,
    async (projectArg?: unknown) => {
      const project = await resolveProject(
        projectStore,
        projectArg,
        getSelectedProjectId()
      );

      if (!project) {
        return;
      }

      const wasFavorite = project.favorite;
      await projectStore.toggleFavorite(project.id);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        wasFavorite
          ? t("Quitado de favoritos: {0}.", project.name)
          : t("Marcado como favorito: {0}.", project.name)
      );
    }
  );

  const deleteProjectCommand = vscode.commands.registerCommand(
    COMMAND_DELETE_PROJECT,
    async (projectArg?: unknown) => {
      const project = await resolveProject(
        projectStore,
        projectArg,
        getSelectedProjectId()
      );

      if (!project) {
        return;
      }

      const choice = await vscode.window.showWarningMessage(
        t(k.warning.deleteProjectDiskConfirm, project.name),
        t(k.common.yes),
        t(k.common.cancel)
      );

      if (choice !== t(k.common.yes)) {
        return;
      }

      await closeProjectFolderIfOpen(project.path);
      await projectStore.deleteProject(project.id);

      if (project.repoUrl && githubService) {
        const deleteRemoteChoice = await vscode.window.showWarningMessage(
          t("Borrar tambien el repo de GitHub {0}?", project.name),
          t(k.common.yes),
          t(k.common.no)
        );

        if (deleteRemoteChoice === t(k.common.yes)) {
          const deletedRemote = await githubService.deleteGitHubRepo(
            project.repoUrl
          );

          if (deletedRemote) {
            vscode.window.showInformationMessage(
              t("Repo de GitHub eliminado: {0}.", project.name)
            );
          } else {
            vscode.window.showWarningMessage(
              t("No se pudo borrar el repo de GitHub de {0}.", project.name)
            );
          }
        }
      }

      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        t("Proyecto eliminado: {0}.", project.name)
      );
    }
  );

  const initializeGitCommand = vscode.commands.registerCommand(
    COMMAND_INITIALIZE_GIT,
    async (projectArg?: unknown) => {
      const project = await resolveProject(
        projectStore,
        projectArg,
        getSelectedProjectId()
      );

      if (!project) {
        return;
      }

      const folderUri = vscode.Uri.file(project.path);
      const alreadyInitialized = await gitService.isGitRepository(folderUri);

      if (alreadyInitialized) {
        vscode.window.showInformationMessage(
          t("Git ya esta inicializado en {0}.", project.name)
        );
        return;
      }

      const choice = await vscode.window.showWarningMessage(
        t(
          "Esto inicializara Git y creara un commit inicial en {0}.",
          project.name
        ),
        t(k.common.yes),
        t(k.common.cancel)
      );

      if (choice !== t(k.common.yes)) {
        return;
      }

      const gitInitialized = await gitService.initializeGit(folderUri);

      if (!gitInitialized) {
        vscode.window.showWarningMessage(t(k.warning.gitInitFailed));
        return;
      }

      const committed = await gitService.createInitialCommit(folderUri);

      if (!committed) {
        vscode.window.showWarningMessage(t(k.warning.gitCommitFailed));
        return;
      }

      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        t("Git inicializado en {0}.", project.name)
      );
    }
  );

  const projectCommands = [
    openProjectCommand,
    markProjectIdeaCommand,
    markProjectActiveCommand,
    markProjectPausedCommand,
    markProjectFinishedCommand,
    editNextActionCommand,
    clearNextActionCommand,
    toggleFavoriteCommand,
    deleteProjectCommand,
    initializeGitCommand,
  ];

  context.subscriptions.push(...projectCommands);

  return projectCommands;
}

async function closeProjectFolderIfOpen(projectPath: string): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const workspaceIndex = workspaceFolders.findIndex(
    (folder) => folder.uri.fsPath === projectPath
  );

  if (workspaceIndex < 0) {
    return;
  }

  if (workspaceFolders.length > 1) {
    vscode.workspace.updateWorkspaceFolders(workspaceIndex, 1);
    return;
  }

  await vscode.commands.executeCommand("workbench.action.closeFolder");
}

async function markProjectStatus(
  projectStore: ProjectStoreService,
  treeDataProvider: ShipOneProjectsTreeDataProvider,
  settings: ShipOneSettings,
  status: ProjectStatus,
  projectArg?: unknown,
  selectedProjectId?: string
) {
  const project = await resolveProject(
    projectStore,
    projectArg,
    selectedProjectId
  );

  if (!project) {
    return;
  }

  await updateProjectStatus(
    projectStore,
    treeDataProvider,
    settings,
    project,
    status,
    status
  );
}

async function resolveProject(
  projectStore: ProjectStoreService,
  projectArg?: unknown,
  selectedProjectId?: string
): Promise<ProjectMetadata | undefined> {
  if (typeof projectArg === "string") {
    const projectById = await projectStore.getProject(projectArg);
    if (projectById) {
      return projectById;
    }
  }

  const directProject = unwrapProjectArg(projectArg);

  if (directProject) {
    return directProject;
  }

  if (selectedProjectId) {
    const selectedProject = await projectStore.getProject(selectedProjectId);
    if (selectedProject) {
      return selectedProject;
    }
  }

  return pickProject(projectStore);
}

function unwrapProjectArg(projectArg?: unknown): ProjectMetadata | undefined {
  if (!projectArg) {
    return undefined;
  }

  if (typeof projectArg === "string") {
    return undefined;
  }

  if (typeof projectArg !== "object") {
    return undefined;
  }

  const candidate = projectArg as { project?: ProjectMetadata };

  if (candidate.project) {
    return candidate.project;
  }

  return undefined;
}

async function updateProjectStatus(
  projectStore: ProjectStoreService,
  treeDataProvider: ShipOneProjectsTreeDataProvider,
  settings: ShipOneSettings,
  project: ProjectMetadata,
  status: ProjectStatus,
  statusLabel: string
) {
  if (status === "active") {
    if (!settings.enforceOneActiveProject) {
      await projectStore.setProjectStatus(project.id, status, false);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        t("{0} ahora esta en {1}.", project.name, statusLabel)
      );
      return;
    }

    const canActivate = await confirmCanActivateProject(
      projectStore,
      project.id
    );

    if (!canActivate) {
      return;
    }
  }

  await projectStore.setProjectStatus(
    project.id,
    status,
    settings.enforceOneActiveProject
  );
  treeDataProvider.refresh();
  vscode.window.showInformationMessage(
    t("{0} ahora esta en {1}.", project.name, statusLabel)
  );
}
