import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { ProjectContextService } from "../../services/projectContextService";
import type { ProjectRecoveryService } from "../../services/projectRecoveryService";
import type { ProjectStoreService } from "../../services/projectStoreService";
import { parseMvpTasks, pickProject } from "./projectOpsHelpers";

const COMMAND_EDIT_MVP_CHECKLIST = "shipone.editMvpChecklist";
const COMMAND_MARK_MVP_ITEM_DONE = "shipone.markMvpItemDone";
const COMMAND_RECOVER_STORAGE = "shipone.recoverStorage";
const COMMAND_DETECT_BLOCKERS = "shipone.detectBlockers";

export function registerProjectOpsCommands(options: {
  projectStore: ProjectStoreService;
  projectRecoveryService: ProjectRecoveryService;
  projectContextService: ProjectContextService;
  treeRefresh: () => void;
}): vscode.Disposable[] {
  const {
    projectStore,
    projectContextService,
    projectRecoveryService,
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
        placeHolder: t(k.common.mvpPlaceholder),
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
        vscode.window.showInformationMessage(
          t("No hay tareas MVP pendientes.")
        );
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
          placeHolder: t(k.common.chooseTask),
        }
      );

      if (!choice) {
        return;
      }

      await projectStore.markMvpTaskDone(project.id, choice.task.id);
      treeRefresh();
      vscode.window.showInformationMessage(
        t("Tarea MVP marcada en {0}.", project.name)
      );
    }
  );

  const recoverStorageCommand = vscode.commands.registerCommand(
    COMMAND_RECOVER_STORAGE,
    async () => {
      const restored = await projectRecoveryService.recoverFromBackup();

      if (restored) {
        treeRefresh();
        vscode.window.showInformationMessage(
          t("ShipOne recupero el almacenamiento desde el backup.")
        );
      } else {
        const choice = await vscode.window.showWarningMessage(
          t(k.warning.storageRecoveryFailed),
          t("Intentar de nuevo"),
          t("Crear proyecto"),
          t("Abrir ajustes")
        );

        if (choice === t("Intentar de nuevo")) {
          await projectRecoveryService.recoverFromBackup();
        } else if (choice === t("Crear proyecto")) {
          await vscode.commands.executeCommand("shipone.createProject");
        } else if (choice === t("Abrir ajustes")) {
          await vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "ShipOne"
          );
        }
      }
    }
  );

  const detectBlockersCommand = vscode.commands.registerCommand(
    COMMAND_DETECT_BLOCKERS,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const blockers = await projectContextService.getBlockers(project.path);

      if (blockers.length === 0) {
        vscode.window.showInformationMessage(
          t("Sin bloqueadores en {0}.", project.name)
        );
        return;
      }

      vscode.window.showWarningMessage(
        t("{0}: {1}", project.name, blockers.join(" | "))
      );
    }
  );

  return [
    editMvpChecklistCommand,
    markMvpItemDoneCommand,
    recoverStorageCommand,
    detectBlockersCommand,
  ];
}
