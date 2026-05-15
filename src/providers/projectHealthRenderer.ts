import { t } from "../localization";
import type { ProjectMetadata } from "../models/project";
import type { ProjectHealth } from "../services/projectHealthService";
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
      project.status === "active" && !project.nextAction
        ? t("Sin next action")
        : null;

    return [
      projectType,
      project.nextAction ? t("Siguiente: {0}", project.nextAction) : undefined,
      nextActionWarning,
      t("Salud: {0}", renderHealthLabel(health.label)),
      project.pauseReason ? t("Pausa: {0}", project.pauseReason) : undefined,
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
      return t("saludable");
    case "warning":
      return t("con avisos");
    case "bad":
      return t("critico");
  }
}
