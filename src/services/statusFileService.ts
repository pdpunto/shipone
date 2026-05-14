import * as vscode from "vscode";
import { ProjectMetadata } from "../models/project";
import { buildStatusFileContent } from "../commands/projects/projectOpsHelpers";

export class StatusFileService {
  async syncStatusFile(project: ProjectMetadata): Promise<void> {
    const statusFileUri = vscode.Uri.joinPath(
      vscode.Uri.file(project.path),
      "STATUS.md"
    );
    const content = buildStatusFileContent(project);
    await vscode.workspace.fs.writeFile(
      statusFileUri,
      new TextEncoder().encode(content)
    );
  }
}
