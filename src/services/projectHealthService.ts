import * as vscode from "vscode";
import { execFile } from "child_process";
import { promisify } from "util";
import type { ProjectMetadata } from "../models/project";
import { getInactivityWarning } from "../utils/inactivityWarning";

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
  stale: number;
  missingNextAction: number;
  finishRatio: number;
};

export type ProjectHealthSummary = {
  healthy: number;
  warning: number;
  bad: number;
};

export class ProjectHealthService {
  private readonly healthCache = new Map<string, Promise<ProjectHealth>>();

  getMetrics(
    projects: ProjectMetadata[],
    inactiveWarningDays = 14,
    staleWarningDays = 30
  ): ProjectMetrics {
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
    const stale = projects.filter(
      (project) =>
        this.getInactivityWarning(
          project.lastOpenedAt,
          inactiveWarningDays,
          staleWarningDays
        )?.startsWith("stale") ?? false
    ).length;
    const missingNextAction = projects.filter(
      (project) => !project.nextAction
    ).length;
    const finishRatio = total === 0 ? 0 : Math.round((finished / total) * 100);

    return {
      total,
      idea,
      active,
      paused,
      finished,
      stale,
      missingNextAction,
      finishRatio,
    };
  }

  getInactivityWarning(
    lastOpenedAt: string | undefined,
    inactiveWarningDays: number,
    staleWarningDays: number
  ): string | null {
    return getInactivityWarning(
      lastOpenedAt,
      inactiveWarningDays,
      staleWarningDays
    );
  }

  async getHealthSummary(
    projects: ProjectMetadata[],
    inactiveWarningDays: number,
    staleWarningDays: number
  ): Promise<ProjectHealthSummary> {
    const healths = await Promise.all(
      projects.map((project) =>
        this.buildProjectHealth(project, inactiveWarningDays, staleWarningDays)
      )
    );

    return {
      healthy: healths.filter((health) => health.label === "healthy").length,
      warning: healths.filter((health) => health.label === "warning").length,
      bad: healths.filter((health) => health.label === "bad").length,
    };
  }

  async buildProjectHealth(
    project: ProjectMetadata,
    inactiveWarningDays: number,
    staleWarningDays: number
  ): Promise<ProjectHealth> {
    const cacheKey = [
      project.path,
      project.status,
      project.lastOpenedAt ?? "",
      project.nextAction ?? "",
      inactiveWarningDays,
      staleWarningDays,
    ].join("|");

    const cached = this.healthCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const promise = this.computeProjectHealth(
      project,
      inactiveWarningDays,
      staleWarningDays
    );

    this.healthCache.set(cacheKey, promise);
    return promise;
  }

  clearCache(): void {
    this.healthCache.clear();
  }

  private async computeProjectHealth(
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

    const projectRootUri = vscode.Uri.file(project.path);
    const readmeUri = vscode.Uri.joinPath(projectRootUri, "README.md");
    const statusUri = vscode.Uri.joinPath(projectRootUri, "STATUS.md");

    const hasReadme = await pathExists(readmeUri);
    if (!hasReadme) {
      issues.push("no-readme");
    } else if (await isEmptyTextFile(readmeUri)) {
      issues.push("empty-readme");
    }

    if (!(await pathExists(statusUri))) {
      issues.push("no-status");
    }

    if (requiresPackageJson(project.type)) {
      const packageJsonUri = vscode.Uri.joinPath(
        projectRootUri,
        "package.json"
      );
      if (!(await pathExists(packageJsonUri))) {
        issues.push("no-package-json");
      }
    }

    if (project.type === "python") {
      const requirementsUri = vscode.Uri.joinPath(
        projectRootUri,
        "requirements.txt"
      );
      if (!(await pathExists(requirementsUri))) {
        issues.push("no-requirements");
      }
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

async function isEmptyTextFile(uri: vscode.Uri): Promise<boolean> {
  try {
    const raw = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(raw).trim().length === 0;
  } catch {
    return false;
  }
}

function requiresPackageJson(projectType: string): boolean {
  return projectType === "nextjs" || projectType === "node-api";
}
