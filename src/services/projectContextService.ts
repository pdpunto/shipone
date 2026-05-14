import * as vscode from "vscode";
import { ProjectMetadata } from "../models/project";
import {
  buildAiContextContent,
  buildStatusFileContent,
  readStatusBlockers,
} from "../commands/projects/projectOpsHelpers";

export class ProjectContextService {
  async syncStatusFile(project: ProjectMetadata): Promise<void> {
    const statusFileUri = vscode.Uri.joinPath(vscode.Uri.file(project.path), "STATUS.md");
    const content = buildStatusFileContent(project);
    await vscode.workspace.fs.writeFile(statusFileUri, new TextEncoder().encode(content));
  }

  async generateAiContext(project: ProjectMetadata): Promise<void> {
    const blockers = await this.getBlockers(project.path);
    const contextFileUri = vscode.Uri.joinPath(vscode.Uri.file(project.path), "AI_CONTEXT.md");
    const content = buildAiContextContent(project, blockers);
    await vscode.workspace.fs.writeFile(contextFileUri, new TextEncoder().encode(content));
  }

  async getBlockers(projectPath: string): Promise<string[]> {
    return readStatusBlockers(projectPath);
  }
}
