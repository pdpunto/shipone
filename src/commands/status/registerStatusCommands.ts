import * as vscode from "vscode";
import { t } from "../../localization";
import type { ProjectStoreService } from "../../services/projectStoreService";
import type { StatusFileService } from "../../services/statusFileService";
import { pickProject } from "../projects/projectOpsHelpers";

const COMMAND_OPEN_STATUS_FILE = "shipone.openStatusFile";
const COMMAND_SYNC_STATUS_FILE = "shipone.syncStatusFile";
const STATUS_FILE_NAME = "STATUS.md";

export function registerStatusCommands(options: {
  projectStore: ProjectStoreService;
  statusFileService: StatusFileService;
}): vscode.Disposable[] {
  const { projectStore, statusFileService } = options;

  const openStatusFileCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_STATUS_FILE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const statusFileUri = vscode.Uri.joinPath(
        vscode.Uri.file(project.path),
        STATUS_FILE_NAME
      );

      try {
        const document = await vscode.workspace.openTextDocument(statusFileUri);
        await vscode.window.showTextDocument(document, { preview: false });
      } catch {
        const choice = await vscode.window.showErrorMessage(
          t("No se pudo abrir STATUS.md."),
          t("Crear archivo"),
          t("Abrir carpeta")
        );

        if (choice === t("Crear archivo")) {
          await vscode.commands.executeCommand("shipone.syncStatusFile");
        } else if (choice === t("Abrir carpeta")) {
          await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(project.path), false);
        }
      }
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
      vscode.window.showInformationMessage(
        t("STATUS.md sincronizado en {0}.", project.name)
      );
    }
  );

  return [openStatusFileCommand, syncStatusFileCommand];
}
