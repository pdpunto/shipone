import { t } from "../localization";
import { ProjectMetadata } from "../models/project";
import { ProjectHealth } from "../services/projectHealthService";
import { formatProjectType, getMvpProgress } from "./treeNodes/shared";

export class ProjectHealthRenderer {
  buildProjectDescription(
    project: ProjectMetadata,
    health: ProjectHealth,
    warning: string | null
  ): string {
    const mvpProgress = getMvpProgress(project.mvpTasks);
    const projectType = formatProjectType(project.type);
    const nextActionWarning =
      project.status === "active" && !project.nextAction ? t("Sin next action") : null;

    return [
      projectType,
      project.nextAction ? t("Next: {0}", project.nextAction) : undefined,
      nextActionWarning,
      t("Health: {0}", renderHealthLabel(health.label)),
      project.pauseReason ? t("Pause: {0}", project.pauseReason) : undefined,
      warning ?? undefined,
      mvpProgress ?? undefined,
    ]
      .filter(Boolean)
      .join(" · ");
  }
}

function renderHealthLabel(label: ProjectHealth["label"]): string {
  switch (label) {
    case "healthy":
      return t("healthy");
    case "warning":
      return t("warning");
    case "bad":
      return t("bad");
  }
}
