import * as vscode from "vscode";
import type { ScreenshotSeedService } from "../../services/screenshotSeedService";

const COMMAND_LOAD_SCREENSHOT_DATA = "shipone.loadScreenshotData";

export function registerScreenshotSeedCommands(options: {
  screenshotSeedService: ScreenshotSeedService;
  treeRefresh: () => void;
}): vscode.Disposable[] {
  const { screenshotSeedService, treeRefresh } = options;

  const loadScreenshotDataCommand = vscode.commands.registerCommand(
    COMMAND_LOAD_SCREENSHOT_DATA,
    async () => {
      try {
        const result = await screenshotSeedService.loadSeedProjects();
        treeRefresh();
        vscode.window.showInformationMessage(
          `Datos de captura cargados en ${result.demoRoot.fsPath}.`
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `No se pudieron cargar los datos de captura: ${detail}`
        );
      }
    }
  );

  return [loadScreenshotDataCommand];
}
