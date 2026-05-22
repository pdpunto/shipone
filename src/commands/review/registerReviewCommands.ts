import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { ProjectCreationService } from "../../services/projectCreationService";
import type { ProjectStoreService } from "../../services/projectStoreService";
import type { SettingsService } from "../../services/settingsService";
import type { TodoScannerService } from "../../services/todoScannerService";
import { type TodoTask } from "../../services/todoScannerService";
import {
  buildWeeklyReviewSummary,
  confirmCanActivateProject,
  getFinishedThisWeek,
  isStaleProject,
  pickProject,
} from "../projects/projectOpsHelpers";
import {
  buildPausedProjectDescription,
  buildWeeklyReviewSummaryLines,
} from "../../utils/projectReviewDisplay";

const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_SCAN_TODOS = "shipone.scanTodos";
const COMMAND_WEEKLY_REVIEW = "shipone.weeklyReview";
const COMMAND_FREEZE_PROJECT = "shipone.freezeProject";
const COMMAND_RESUME_PROJECT = "shipone.resumeProject";

export function registerReviewCommands(options: {
  projectStore: ProjectStoreService;
  settingsService: SettingsService;
  projectCreationService: ProjectCreationService;
  getTodoScannerService: () => TodoScannerService;
  treeRefresh: () => void;
}): vscode.Disposable[] {
  const { projectStore, settingsService, getTodoScannerService, treeRefresh } =
    options;

  const scanTodosCommand = vscode.commands.registerCommand(
    COMMAND_SCAN_TODOS,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const tasks = await getTodoScannerService().scanProjectTodoTasks(
        project.path
      );

      if (tasks.length === 0) {
        vscode.window.showInformationMessage(
          t("No hay TODO ni FIXME en {0}.", project.name)
        );
        return;
      }

      const choice = await vscode.window.showQuickPick(
        tasks.map((task: TodoTask) => ({
          label: `${task.kind} - ${task.fileName}`,
          description: `L${task.line}`,
          detail: task.text,
          task,
        })),
        {
          title: t("TODOs en {0}", project.name),
          placeHolder: t(k.common.chooseTask),
          matchOnDescription: true,
          matchOnDetail: true,
        }
      );

      if (!choice) {
        return;
      }

      const document = await vscode.workspace.openTextDocument(choice.task.uri);
      const editor = await vscode.window.showTextDocument(document, {
        preview: true,
      });
      const line = Math.max(choice.task.line - 1, 0);
      const range = new vscode.Range(line, 0, line, 0);
      editor.selection = new vscode.Selection(line, 0, line, 0);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }
  );

  const weeklyReviewCommand = vscode.commands.registerCommand(
    COMMAND_WEEKLY_REVIEW,
    async () => {
      const projects = await projectStore.loadProjects();
      const summary = buildWeeklyReviewSummary(projects);

      const activeProject = projects.find(
        (project) => project.status === "active"
      );
      const pausedProjects = projects.filter(
        (project) => project.status === "paused"
      );
      const finishedThisWeek = getFinishedThisWeek(projects);

      const summaryLines = buildWeeklyReviewSummaryLines({
        activeName: summary.active ? summary.active.name : null,
        pausedCount: pausedProjects.length,
        finishedThisWeekCount: finishedThisWeek.length,
      });

      if (activeProject) {
        const actions = [t("Ver activo"), t("Salir")];
        const choice = await vscode.window.showInformationMessage(
          summaryLines,
          ...actions
        );

        if (choice === t("Salir")) {
          return;
        }

        await vscode.commands.executeCommand(
          COMMAND_OPEN_PROJECT,
          activeProject.id
        );
      } else {
        vscode.window.showInformationMessage(summaryLines);
      }

      if (activeProject && !activeProject.nextAction) {
        const nextAction = await vscode.window.showInputBox({
          title: t("Weekly review"),
          prompt: t("Siguiente accion para el proyecto activo"),
          placeHolder: t("Escribe el siguiente paso"),
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
            { label: t(k.common.keepActive), value: "keep" },
            { label: t(k.common.pause), value: "pause" },
            { label: t(k.common.finish), value: "finish" },
          ],
          {
            title: t("Proyecto activo viejo"),
            placeHolder: t(k.common.whatToDo),
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
          t(
            "Pausados: {0}",
            pausedProjects.map((project) => project.name).join(", ")
          )
        );
      } else {
        vscode.window.showInformationMessage(
          t(k.notification.noPausedProjects)
        );
      }

      if (finishedThisWeek.length > 0) {
        vscode.window.showInformationMessage(
          t(
            "Terminados esta semana: {0}",
            finishedThisWeek.map((project) => project.name).join(", ")
          )
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
        title: t("Congelar proyecto"),
        prompt: t("Motivo de la pausa"),
        placeHolder: t("Esperando feedback"),
      });

      if (reason === undefined || !reason.trim()) {
        return;
      }

      const nextAction = await vscode.window.showInputBox({
        title: t("Siguiente accion"),
        prompt: t("Que haras al volver"),
        placeHolder: t("Retomar login"),
        value: project.nextAction ?? "",
      });

      if (nextAction === undefined) {
        return;
      }

      const note = await vscode.window.showInputBox({
        title: t("Nota de pausa"),
        prompt: t("Nota corta para recordar contexto"),
        placeHolder: t("Bloqueado por dependencias externas"),
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
      vscode.window.showInformationMessage(
        t("Proyecto congelado: {0}.", project.name)
      );
    }
  );

  const resumeProjectCommand = vscode.commands.registerCommand(
    COMMAND_RESUME_PROJECT,
    async () => {
      const settings = settingsService.getSettings();
      const projects = await projectStore.loadProjects();
      const pausedProjects = projects.filter(
        (project) => project.status === "paused"
      );

      if (pausedProjects.length === 0) {
        vscode.window.showInformationMessage(
          t(k.notification.noPausedProjects)
        );
        return;
      }

      const choice = await vscode.window.showQuickPick(
        pausedProjects.map((project) => ({
          label: project.name,
          description: buildPausedProjectDescription(
            project.pauseReason,
            project.nextAction,
            project.pauseNote
          ),
          detail: project.pauseNote ?? project.path,
          project,
        })),
        {
          title: t("Reanudar proyecto"),
          placeHolder: t(k.common.choosePausedProject),
        }
      );

      if (!choice) {
        return;
      }

      if (!settings.enforceOneActiveProject) {
        await projectStore.setProjectStatus(choice.project.id, "active", false);
        treeRefresh();
        vscode.window.showInformationMessage(
          t("Proyecto reanudado: {0}.", choice.project.name)
        );
        return;
      }

      const canActivate = await confirmCanActivateProject(
        projectStore,
        choice.project.id
      );

      if (!canActivate) {
        return;
      }

      await projectStore.setProjectStatus(choice.project.id, "active", true);
      treeRefresh();
      vscode.window.showInformationMessage(
        t("Proyecto reanudado: {0}.", choice.project.name)
      );
    }
  );

  return [
    scanTodosCommand,
    weeklyReviewCommand,
    freezeProjectCommand,
    resumeProjectCommand,
  ];
}
