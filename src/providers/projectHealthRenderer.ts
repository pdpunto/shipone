import { ProjectMetadata } from "../models/project";
import { ProjectHealth } from "../services/projectHealthService";
import { formatProjectType, getMvpProgress } from "./treeNodes/shared";

export class ProjectHealthRenderer {
  buildProjectDescription(project: ProjectMetadata, health: ProjectHealth, warning: string | null): string {
    const mvpProgress = getMvpProgress(project.mvpTasks);
    const projectType = formatProjectType(project.type);
    const nextActionWarning = project.status === "active" && !project.nextAction ? "no next" : null;

    return [
      projectType,
      project.nextAction ? `next: ${project.nextAction}` : undefined,
      nextActionWarning,
      health.label,
      project.pauseReason ? `pause: ${project.pauseReason}` : undefined,
      warning ?? undefined,
      mvpProgress ?? undefined,
    ]
      .filter(Boolean)
      .join(" · ");
  }
}
