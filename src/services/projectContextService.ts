import * as vscode from "vscode";
import { execFile } from "child_process";
import { promisify } from "util";
import type { ProjectMetadata } from "../models/project";
import {
  buildAiContextContent,
  readStatusBlockers,
} from "../commands/projects/projectOpsHelpers";

const execFileAsync = promisify(execFile);

type GitSummary = {
  branch?: string;
  statusLines?: string[];
  recentCommits?: string[];
};

export class ProjectContextService {
  async generateAiContext(project: ProjectMetadata): Promise<void> {
    const blockers = await this.getBlockers(project.path);
    const gitSummary = await this.getGitSummary(project.path);
    const contextFileUri = vscode.Uri.joinPath(
      vscode.Uri.file(project.path),
      "PROJECT_CONTEXT.md"
    );
    const content = buildAiContextContent(project, blockers, gitSummary);
    await vscode.workspace.fs.writeFile(
      contextFileUri,
      new TextEncoder().encode(content)
    );
  }

  async getBlockers(projectPath: string): Promise<string[]> {
    return readStatusBlockers(projectPath);
  }

  async getGitSummary(projectPath: string): Promise<GitSummary> {
    try {
      const [branchResult, statusResult, logResult] = await Promise.all([
        execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
          cwd: projectPath,
        }),
        execFileAsync("git", ["status", "--short"], {
          cwd: projectPath,
        }),
        execFileAsync("git", ["log", "-3", "--oneline"], {
          cwd: projectPath,
        }),
      ]);

      return {
        branch: branchResult.stdout.trim() || undefined,
        statusLines: statusResult.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
        recentCommits: logResult.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
      };
    } catch {
      return {};
    }
  }
}
