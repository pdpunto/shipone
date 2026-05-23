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
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg);

      if (!project) {
        return;
      }

      await projectContextService.generateAiContext(project);
      vscode.window.showInformationMessage(
        t("PROJECT_CONTEXT.md generado en {0}.", project.name)
      );
    }
  );

  return [generateAiContextCommand];
}

async function resolveProject(
  projectStore: ProjectStoreService,
  projectArg?: unknown
) {
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

  return pickProject(projectStore);
}

function unwrapProjectArg(projectArg?: unknown) {
  if (projectArg && typeof projectArg === "object" && "id" in projectArg) {
    return projectArg as Awaited<ReturnType<ProjectStoreService["getProject"]>>;
  }

  return undefined;
}
