import * as vscode from "vscode";
import { ProjectMetadata } from "../models/project";
import {
  buildAiContextContent,
  readStatusBlockers,
} from "../commands/projects/projectOpsHelpers";

export class ProjectContextService {
  async generateAiContext(project: ProjectMetadata): Promise<void> {
    const blockers = await this.getBlockers(project.path);
    const contextFileUri = vscode.Uri.joinPath(
      vscode.Uri.file(project.path),
      "AI_CONTEXT.md"
    );
    const content = buildAiContextContent(project, blockers);
    await vscode.workspace.fs.writeFile(
      contextFileUri,
      new TextEncoder().encode(content)
    );
  }

  async getBlockers(projectPath: string): Promise<string[]> {
    return readStatusBlockers(projectPath);
  }
}
