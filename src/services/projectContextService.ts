import * as vscode from "vscode";
import { execFile } from "child_process";
import { promisify } from "util";
import type { ProjectMetadata } from "../models/project";
import type { TodoScannerService } from "./todoScannerService";
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
  constructor(private readonly todoScannerService: TodoScannerService) {}

  async generateAiContext(project: ProjectMetadata): Promise<void> {
    const blockers = await this.getBlockers(project.path);
    const gitSummary = await this.getGitSummary(project.path);
    const todoSummary = await this.getTodoSummary(project.path);
    const stackSummary = await this.getStackSummary(project.path, project.type);
    const contextFileUri = vscode.Uri.joinPath(
      vscode.Uri.file(project.path),
      "PROJECT_CONTEXT.md"
    );
    const content = buildAiContextContent(project, blockers, gitSummary, {
      createdAt: project.createdAt,
      lastOpenedAt: project.lastOpenedAt,
      pauseReason: project.pauseReason,
      pauseNote: project.pauseNote,
      todoSummary,
      stackSummary,
    });
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

  async getTodoSummary(projectPath: string): Promise<string[]> {
    try {
      const tasks =
        await this.todoScannerService.scanProjectTodoTasks(projectPath);

      if (tasks.length === 0) {
        return [];
      }

      return tasks.slice(0, 5).map((task) => {
        const text = task.text ? `: ${task.text}` : "";
        return `${task.kind} ${task.fileName}${text}`;
      });
    } catch {
      return [];
    }
  }

  async getStackSummary(
    projectPath: string,
    projectType: string
  ): Promise<string[]> {
    try {
      const names = new Set(
        (
          await vscode.workspace.fs.readDirectory(vscode.Uri.file(projectPath))
        ).map(([name]) => name.toLowerCase())
      );

      const stack: string[] = [];

      if (names.has("package.json")) {
        stack.push("Node.js");
      }

      if (names.has("requirements.txt") || names.has("pyproject.toml")) {
        stack.push("Python");
      }

      if (names.has("cargo.toml")) {
        stack.push("Rust");
      }

      if (names.has("go.mod")) {
        stack.push("Go");
      }

      if (names.has("composer.json")) {
        stack.push("PHP");
      }

      if (names.has("pom.xml") || names.has("build.gradle")) {
        stack.push("Java");
      }

      if (projectType && !stack.includes(projectType)) {
        stack.push(`Tipo base: ${projectType}`);
      }

      return stack.length > 0 ? stack : ["No detectado"];
    } catch {
      return [];
    }
  }
}
