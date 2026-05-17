import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { ProjectMetadata, ProjectStatus } from "../../models/project";
import type { ShipOneSettings } from "../../models/settings";
import type { ProjectStoreService } from "../../services/projectStoreService";
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

export function registerProjectCommands(options: {
  context: vscode.ExtensionContext;
  projectStore: ProjectStoreService;
  settingsService: SettingsService;
  treeDataProvider: ShipOneProjectsTreeDataProvider;
  getSelectedProjectId: () => string | undefined;
}): vscode.Disposable[] {
  const {
    context,
    projectStore,
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

  const projectCommands = [
    openProjectCommand,
    markProjectIdeaCommand,
    markProjectActiveCommand,
    markProjectPausedCommand,
    markProjectFinishedCommand,
    editNextActionCommand,
    clearNextActionCommand,
    toggleFavoriteCommand,
  ];

  context.subscriptions.push(...projectCommands);

  return projectCommands;
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
