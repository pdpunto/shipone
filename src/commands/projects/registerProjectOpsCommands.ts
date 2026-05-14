import * as vscode from "vscode";
import { t } from "../../localization";
import { ProjectCreationService } from "../../services/projectCreationService";
import { ProjectContextService } from "../../services/projectContextService";
import { ProjectStoreService } from "../../services/projectStoreService";
import { SettingsService } from "../../services/settingsService";
import { StatusFileService } from "../../services/statusFileService";
import { parseMvpTasks, pickProject } from "./projectOpsHelpers";

const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_EDIT_MVP_CHECKLIST = "shipone.editMvpChecklist";
const COMMAND_MARK_MVP_ITEM_DONE = "shipone.markMvpItemDone";
const COMMAND_SYNC_STATUS_FILE = "shipone.syncStatusFile";
const COMMAND_RECOVER_STORAGE = "shipone.recoverStorage";
const COMMAND_CONNECT_GITHUB = "shipone.connectGithub";
const COMMAND_DETECT_BLOCKERS = "shipone.detectBlockers";
const COMMAND_GENERATE_AI_CONTEXT = "shipone.generateAiContext";

export function registerProjectOpsCommands(options: {
  projectStore: ProjectStoreService;
  settingsService: SettingsService;
  projectCreationService: ProjectCreationService;
  statusFileService: StatusFileService;
  projectContextService: ProjectContextService;
  treeRefresh: () => void;
}): vscode.Disposable[] {
  const {
    projectStore,
    projectCreationService,
    statusFileService,
    projectContextService,
    treeRefresh,
  } = options;

  const editMvpChecklistCommand = vscode.commands.registerCommand(
    COMMAND_EDIT_MVP_CHECKLIST,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const currentTasks = project.mvpTasks ?? [];
      const currentValue = currentTasks.map((task) => task.text).join(", ");
      const rawValue = await vscode.window.showInputBox({
        title: t("Checklist MVP"),
        prompt: t("Separa tareas con coma"),
        placeHolder: t("Login, Dashboard, Deploy"),
        value: currentValue,
      });

      if (rawValue === undefined) {
        return;
      }

      const nextTasks = parseMvpTasks(rawValue, currentTasks);
      await projectStore.setMvpTasks(project.id, nextTasks);
      treeRefresh();
      vscode.window.showInformationMessage(
        t("Checklist MVP actualizada en {0}.", project.name)
      );
    }
  );

  const markMvpItemDoneCommand = vscode.commands.registerCommand(
    COMMAND_MARK_MVP_ITEM_DONE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const tasks = (project.mvpTasks ?? []).filter((task) => !task.done);
      if (tasks.length === 0) {
        vscode.window.showInformationMessage(t("No hay tareas MVP pendientes."));
        return;
      }

      const choice = await vscode.window.showQuickPick(
        tasks.map((task) => ({
          label: task.text,
          description: t("Pendiente"),
          task,
        })),
        {
          title: t("Marcar tarea MVP hecha"),
          placeHolder: t("Elige una tarea"),
        }
      );

      if (!choice) {
        return;
      }

      await projectStore.markMvpTaskDone(project.id, choice.task.id);
      treeRefresh();
      vscode.window.showInformationMessage(t("Tarea MVP marcada en {0}.", project.name));
    }
  );

  const syncStatusFileCommand = vscode.commands.registerCommand(
    COMMAND_SYNC_STATUS_FILE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      await statusFileService.syncStatusFile(project);
      vscode.window.showInformationMessage(t("STATUS.md sincronizado en {0}.", project.name));
    }
  );

  const recoverStorageCommand = vscode.commands.registerCommand(
    COMMAND_RECOVER_STORAGE,
    async () => {
      const restored = await projectStore.recoverFromBackup();

      if (restored) {
        treeRefresh();
        vscode.window.showInformationMessage(
          t("ShipOne recupero el almacenamiento desde el backup.")
        );
      } else {
        vscode.window.showErrorMessage(t("No se pudo recuperar el almacenamiento de ShipOne."));
      }
    }
  );

  const connectGithubCommand = vscode.commands.registerCommand(COMMAND_CONNECT_GITHUB, async () => {
    await projectCreationService.connectGithub();
  });

  const detectBlockersCommand = vscode.commands.registerCommand(
    COMMAND_DETECT_BLOCKERS,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const blockers = await projectContextService.getBlockers(project.path);

      if (blockers.length === 0) {
        vscode.window.showInformationMessage(t("Sin bloqueadores en {0}.", project.name));
        return;
      }

      vscode.window.showWarningMessage(t("{0}: {1}", project.name, blockers.join(" | ")));
    }
  );

  const generateAiContextCommand = vscode.commands.registerCommand(
    COMMAND_GENERATE_AI_CONTEXT,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      await projectContextService.generateAiContext(project);
      vscode.window.showInformationMessage(t("AI_CONTEXT.md generado en {0}.", project.name));
    }
  );

  return [
    editMvpChecklistCommand,
    markMvpItemDoneCommand,
    syncStatusFileCommand,
    recoverStorageCommand,
    connectGithubCommand,
    detectBlockersCommand,
    generateAiContextCommand,
  ];
}
