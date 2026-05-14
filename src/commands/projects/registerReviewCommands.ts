import * as vscode from "vscode";
import { ProjectCreationService } from "../../services/projectCreationService";
import { ProjectStoreService } from "../../services/projectStoreService";
import { SettingsService } from "../../services/settingsService";
import {
  buildWeeklyReviewSummary,
  getFinishedThisWeek,
  isStaleProject,
  pickProject,
  scanProjectTodoTasks,
} from "./projectOpsHelpers";

const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_SCAN_TODOS = "shipone.scanTodos";
const COMMAND_FOCUS_MODE = "shipone.focusMode";
const COMMAND_EXIT_FOCUS_MODE = "shipone.exitFocusMode";
const COMMAND_WEEKLY_REVIEW = "shipone.weeklyReview";
const COMMAND_FREEZE_PROJECT = "shipone.freezeProject";
const COMMAND_RESUME_PROJECT = "shipone.resumeProject";

export function registerReviewCommands(options: {
  projectStore: ProjectStoreService;
  settingsService: SettingsService;
  projectCreationService: ProjectCreationService;
  treeRefresh: () => void;
  setFocusMode: (enabled: boolean) => Promise<void>;
}): vscode.Disposable[] {
  const { projectStore, settingsService, projectCreationService, treeRefresh, setFocusMode } =
    options;

  const scanTodosCommand = vscode.commands.registerCommand(COMMAND_SCAN_TODOS, async () => {
    const project = await pickProject(projectStore);

    if (!project) {
      return;
    }

    const tasks = await scanProjectTodoTasks(project.path);

    if (tasks.length === 0) {
      vscode.window.showInformationMessage(`No hay TODO ni FIXME en ${project.name}.`);
      return;
    }

    const choice = await vscode.window.showQuickPick(
      tasks.map((task) => ({
        label: `${task.kind} - ${task.fileName}`,
        description: `L${task.line}`,
        detail: task.text,
        task,
      })),
      {
        title: `TODOs en ${project.name}`,
        placeHolder: "Elige un hallazgo",
        matchOnDescription: true,
        matchOnDetail: true,
      }
    );

    if (!choice) {
      return;
    }

    const document = await vscode.workspace.openTextDocument(choice.task.uri);
    const editor = await vscode.window.showTextDocument(document, { preview: true });
    const line = Math.max(choice.task.line - 1, 0);
    const range = new vscode.Range(line, 0, line, 0);
    editor.selection = new vscode.Selection(line, 0, line, 0);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  });

  const focusModeCommand = vscode.commands.registerCommand(COMMAND_FOCUS_MODE, async () => {
    await setFocusMode(true);
    vscode.window.showInformationMessage("Focus mode activado.");
  });

  const exitFocusModeCommand = vscode.commands.registerCommand(
    COMMAND_EXIT_FOCUS_MODE,
    async () => {
      await setFocusMode(false);
      vscode.window.showInformationMessage("Focus mode desactivado.");
    }
  );

  const weeklyReviewCommand = vscode.commands.registerCommand(
    COMMAND_WEEKLY_REVIEW,
    async () => {
      const projects = await projectStore.loadProjects();
      const summary = buildWeeklyReviewSummary(projects);

      const activeProject = projects.find((project) => project.status === "active");
      const pausedProjects = projects.filter((project) => project.status === "paused");
      const finishedThisWeek = getFinishedThisWeek(projects);

      const summaryLines = [
        `Activo: ${summary.active ? summary.active.name : "ninguno"}`,
        `Pausados: ${pausedProjects.length}`,
        `Terminados esta semana: ${finishedThisWeek.length}`,
      ];

      if (activeProject) {
        const actions = ["Ver activo", "Salir"];
        const choice = await vscode.window.showInformationMessage(
          summaryLines.join(" | "),
          ...actions
        );

        if (choice === "Salir") {
          return;
        }

        await vscode.commands.executeCommand(COMMAND_OPEN_PROJECT, activeProject.id);
      } else {
        vscode.window.showInformationMessage(summaryLines.join(" | "));
      }

      if (activeProject && !activeProject.nextAction) {
        const nextAction = await vscode.window.showInputBox({
          title: "Weekly review",
          prompt: "Siguiente accion para el proyecto activo",
          placeHolder: "Terminar login",
        });

        if (nextAction !== undefined) {
          await projectStore.setNextAction(
            activeProject.id,
            nextAction.trim() ? nextAction.trim() : null
          );
          treeRefresh();
        }
      }

      if (activeProject && isStaleProject(activeProject)) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: "Mantener activo", value: "keep" },
            { label: "Pasar a pausado", value: "pause" },
            { label: "Marcar terminado", value: "finish" },
          ],
          {
            title: "Proyecto activo viejo",
            placeHolder: "Que hacemos con este proyecto",
          }
        );

        if (choice?.value === "pause") {
          await projectStore.setProjectStatus(activeProject.id, "paused");
          treeRefresh();
        } else if (choice?.value === "finish") {
          await projectStore.setProjectStatus(activeProject.id, "finished");
          treeRefresh();
        }
      }

      if (pausedProjects.length > 0) {
        vscode.window.showInformationMessage(
          `Pausados: ${pausedProjects.map((project) => project.name).join(", ")}`
        );
      }

      if (finishedThisWeek.length > 0) {
        vscode.window.showInformationMessage(
          `Terminados esta semana: ${finishedThisWeek.map((project) => project.name).join(", ")}`
        );
      }
    }
  );

  const freezeProjectCommand = vscode.commands.registerCommand(
    COMMAND_FREEZE_PROJECT,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const reason = await vscode.window.showInputBox({
        title: "Congelar proyecto",
        prompt: "Motivo de la pausa",
        placeHolder: "Esperando feedback",
      });

      if (reason === undefined || !reason.trim()) {
        return;
      }

      const nextAction = await vscode.window.showInputBox({
        title: "Siguiente accion",
        prompt: "Que haras al volver",
        placeHolder: "Revisar login",
        value: project.nextAction ?? "",
      });

      if (nextAction === undefined) {
        return;
      }

      const note = await vscode.window.showInputBox({
        title: "Nota de pausa",
        prompt: "Nota corta para recordar contexto",
        placeHolder: "Bloqueado por dependencias externas",
        value: project.pauseNote ?? "",
      });

      if (note === undefined) {
        return;
      }

      await projectStore.freezeProject(
        project.id,
        reason.trim(),
        nextAction.trim() ? nextAction.trim() : null,
        note.trim()
      );
      treeRefresh();
      vscode.window.showInformationMessage(`Proyecto congelado: ${project.name}.`);
    }
  );

  const resumeProjectCommand = vscode.commands.registerCommand(
    COMMAND_RESUME_PROJECT,
    async () => {
      const settings = settingsService.getSettings();
      const projects = await projectStore.loadProjects();
      const pausedProjects = projects.filter((project) => project.status === "paused");

      if (pausedProjects.length === 0) {
        vscode.window.showInformationMessage("No hay proyectos pausados.");
        return;
      }

      const choice = await vscode.window.showQuickPick(
        pausedProjects.map((project) => ({
          label: project.name,
          description: project.pauseReason ?? project.nextAction ?? "Pausado",
          detail: project.pauseNote ?? project.path,
          project,
        })),
        {
          title: "Reanudar proyecto",
          placeHolder: "Elige un proyecto pausado",
        }
      );

      if (!choice) {
        return;
      }

      if (!settings.enforceOneActiveProject) {
        await projectStore.setProjectStatus(choice.project.id, "active", false);
        treeRefresh();
        vscode.window.showInformationMessage(`Proyecto reanudado: ${choice.project.name}.`);
        return;
      }

      const activeProjects = await projectStore.loadProjects();
      const otherActive = activeProjects.find(
        (item) => item.status === "active" && item.id !== choice.project.id
      );

      if (otherActive) {
        const confirmation = await vscode.window.showWarningMessage(
          `Ya hay un proyecto activo: ${otherActive.name}.`,
          "Pausar y activar",
          "Cancelar"
        );

        if (confirmation !== "Pausar y activar") {
          return;
        }
      }

      await projectStore.setProjectStatus(choice.project.id, "active", true);
      treeRefresh();
      vscode.window.showInformationMessage(`Proyecto reanudado: ${choice.project.name}.`);
    }
  );

  return [
    scanTodosCommand,
    focusModeCommand,
    exitFocusModeCommand,
    weeklyReviewCommand,
    freezeProjectCommand,
    resumeProjectCommand,
  ];
}
