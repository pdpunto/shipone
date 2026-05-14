import * as vscode from "vscode";
import { execFile } from "child_process";
import { promisify } from "util";
import { ProjectMetadata } from "../models/project";

const execFileAsync = promisify(execFile);

export type ProjectHealth = {
  label: "healthy" | "warning" | "bad";
  issues: string[];
};

export type ProjectMetrics = {
  total: number;
  idea: number;
  active: number;
  paused: number;
  finished: number;
  finishRatio: number;
};

export class ProjectHealthService {
  getMetrics(projects: ProjectMetadata[]): ProjectMetrics {
    const total = projects.length;
    const idea = projects.filter((project) => project.status === "idea").length;
    const active = projects.filter(
      (project) => project.status === "active"
    ).length;
    const paused = projects.filter(
      (project) => project.status === "paused"
    ).length;
    const finished = projects.filter(
      (project) => project.status === "finished"
    ).length;
    const finishRatio = total === 0 ? 0 : Math.round((finished / total) * 100);

    return {
      total,
      idea,
      active,
      paused,
      finished,
      finishRatio,
    };
  }

  getInactivityWarning(
    lastOpenedAt: string | undefined,
    inactiveWarningDays: number,
    staleWarningDays: number
  ): string | null {
    if (!lastOpenedAt) {
      return null;
    }

    const openedAt = new Date(lastOpenedAt);
    if (Number.isNaN(openedAt.getTime())) {
      return null;
    }

    const ageDays = Math.floor((Date.now() - openedAt.getTime()) / 86_400_000);

    if (ageDays >= staleWarningDays) {
      return `stale ${ageDays}d`;
    }

    if (ageDays >= inactiveWarningDays) {
      return `inactive ${ageDays}d`;
    }

    return null;
  }

  async buildProjectHealth(
    project: ProjectMetadata,
    inactiveWarningDays: number,
    staleWarningDays: number
  ): Promise<ProjectHealth> {
    const issues: string[] = [];
    const warning = this.getInactivityWarning(
      project.lastOpenedAt,
      inactiveWarningDays,
      staleWarningDays
    );

    if (!project.nextAction) {
      issues.push("missing-next-action");
    }

    if (project.status === "active" && warning) {
      issues.push("inactive-active");
    }

    const hasReadme = await pathExists(
      vscode.Uri.joinPath(vscode.Uri.file(project.path), "README.md")
    );
    if (!hasReadme) {
      issues.push("no-readme");
    }

    const hasRecentCommits = await this.hasRecentGitCommit(project.path);
    if (!hasRecentCommits) {
      issues.push("no-recent-commits");
    }

    if (issues.length === 0) {
      return { label: "healthy", issues };
    }

    if (issues.length <= 2) {
      return { label: "warning", issues };
    }

    return { label: "bad", issues };
  }

  private async hasRecentGitCommit(projectPath: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["log", "-1", "--format=%ct"],
        {
          cwd: projectPath,
        }
      );

      const timestamp = Number(stdout.trim());
      if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return false;
      }

      const ageDays = Math.floor((Date.now() - timestamp * 1000) / 86_400_000);
      return ageDays <= 30;
    } catch {
      return false;
    }
  }
}

async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
