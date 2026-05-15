import * as vscode from "vscode";
import { t } from "../../localization";
import type { ProjectContextService } from "../../services/projectContextService";
import type { ProjectStoreService } from "../../services/projectStoreService";
import { pickProject } from "../projects/projectOpsHelpers";

const COMMAND_GENERATE_AI_CONTEXT = "shipone.generateAiContext";

export function registerAiCommands(options: {
  projectStore: ProjectStoreService;
  projectContextService: ProjectContextService;
}): vscode.Disposable[] {
  const { projectStore, projectContextService } = options;

  const generateAiContextCommand = vscode.commands.registerCommand(
    COMMAND_GENERATE_AI_CONTEXT,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      await projectContextService.generateAiContext(project);
      vscode.window.showInformationMessage(
        t("AI_CONTEXT.md generado en {0}.", project.name)
      );
    }
  );

  return [generateAiContextCommand];
}
