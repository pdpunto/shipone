import { t } from "../localization";
import type { ProjectMetadata } from "../models/project";
import { formatProjectType } from "./treeNodes/shared";

export class ProjectHealthRenderer {
  buildProjectDescription(project: ProjectMetadata, warning: string | null): string {
    const projectType = formatProjectType(project.type);

    return [
      projectType,
      project.nextAction ? t("Siguiente: {0}", project.nextAction) : undefined,
      warning ?? undefined,
    ]
      .filter(Boolean)
      .join(" \u00b7 ");
  }
}
