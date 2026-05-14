import * as vscode from "vscode";
import { ProjectCreationService } from "../../services/projectCreationService";
import { ProjectStoreService } from "../../services/projectStoreService";
import { SettingsService } from "../../services/settingsService";
import {
  buildAiContextContent,
  buildStatusFileContent,
  parseMvpTasks,
  pickProject,
  readStatusBlockers,
} from "./projectOpsHelpers";

const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_EDIT_MVP_CHECKLIST = "shipone.editMvpChecklist";
const COMMAND_MARK_MVP_ITEM_DONE = "shipone.markMvpItemDone";
const COMMAND_SYNC_STATUS_FILE = "shipone.syncStatusFile";
const COMMAND_CONNECT_GITHUB = "shipone.connectGithub";
const COMMAND_DETECT_BLOCKERS = "shipone.detectBlockers";
const COMMAND_GENERATE_AI_CONTEXT = "shipone.generateAiContext";
const STATUS_FILE_NAME = "STATUS.md";

export function registerProjectOpsCommands(options: {
  projectStore: ProjectStoreService;
  settingsService: SettingsService;
  projectCreationService: ProjectCreationService;
  treeRefresh: () => void;
}): vscode.Disposable[] {
  const { projectStore, settingsService, projectCreationService, treeRefresh } = options;

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
        title: "Checklist MVP",
        prompt: "Separa tareas con coma",
        placeHolder: "Login, Dashboard, Deploy",
        value: currentValue,
      });

      if (rawValue === undefined) {
        return;
      }

      const nextTasks = parseMvpTasks(rawValue, currentTasks);
      await projectStore.setMvpTasks(project.id, nextTasks);
      treeRefresh();
      vscode.window.showInformationMessage(`Checklist MVP actualizada en ${project.name}.`);
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
        vscode.window.showInformationMessage("No hay tareas MVP pendientes.");
        return;
      }

      const choice = await vscode.window.showQuickPick(
        tasks.map((task) => ({
          label: task.text,
          description: "Pendiente",
          task,
        })),
        {
          title: "Marcar tarea MVP hecha",
          placeHolder: "Elige una tarea",
        }
      );

      if (!choice) {
        return;
      }

      await projectStore.markMvpTaskDone(project.id, choice.task.id);
      treeRefresh();
      vscode.window.showInformationMessage(`Tarea MVP marcada en ${project.name}.`);
    }
  );

  const syncStatusFileCommand = vscode.commands.registerCommand(
    COMMAND_SYNC_STATUS_FILE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const statusFileUri = vscode.Uri.joinPath(vscode.Uri.file(project.path), STATUS_FILE_NAME);
      const content = buildStatusFileContent(project);
      await vscode.workspace.fs.writeFile(statusFileUri, new TextEncoder().encode(content));
      vscode.window.showInformationMessage(`STATUS.md sincronizado en ${project.name}.`);
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

      const blockers = await readStatusBlockers(project.path);

      if (blockers.length === 0) {
        vscode.window.showInformationMessage(`Sin bloqueadores en ${project.name}.`);
        return;
      }

      vscode.window.showWarningMessage(`${project.name}: ${blockers.join(" | ")}`);
    }
  );

  const generateAiContextCommand = vscode.commands.registerCommand(
    COMMAND_GENERATE_AI_CONTEXT,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const blockers = await readStatusBlockers(project.path);
      const contextFileUri = vscode.Uri.joinPath(vscode.Uri.file(project.path), "AI_CONTEXT.md");
      const content = buildAiContextContent(project, blockers);

      await vscode.workspace.fs.writeFile(contextFileUri, new TextEncoder().encode(content));
      vscode.window.showInformationMessage(`AI_CONTEXT.md generado en ${project.name}.`);
    }
  );

  return [
    editMvpChecklistCommand,
    markMvpItemDoneCommand,
    syncStatusFileCommand,
    connectGithubCommand,
    detectBlockersCommand,
    generateAiContextCommand,
  ];
}
