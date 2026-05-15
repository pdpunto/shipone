import { t } from "../localization";
import { translationKeys as k } from "../localization/keys";
import type { ProjectMetadata } from "../models/project";
import type { ProjectHealth } from "../services/projectHealthService";
import { formatProjectType } from "./treeNodes/shared";

export class ProjectHealthRenderer {
  buildProjectDescription(
    project: ProjectMetadata,
    health: ProjectHealth,
    warning: string | null
  ): string {
    const projectType = formatProjectType(project.type);

    return [
      projectType,
      t("Salud: {0}", renderHealthLabel(health.label)),
      project.nextAction ? t("Siguiente: {0}", project.nextAction) : undefined,
      warning ?? undefined,
    ]
      .filter(Boolean)
      .join(" \u00b7 ");
  }
}

function renderHealthLabel(health: ProjectHealth["label"]): string {
  switch (health) {
    case "healthy":
      return t(k.health.healthy);
    case "warning":
      return t(k.health.warning);
    case "bad":
      return t(k.health.bad);
  }
}
