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
    const issueSummary = buildIssueSummary(health.issues);

    return [
      projectType,
      t("Salud: {0}", renderHealthLabel(health.label)),
      project.nextAction ? t("Siguiente: {0}", project.nextAction) : undefined,
      issueSummary,
      warning ?? undefined,
    ]
      .filter(Boolean)
      .join(" \u00b7 ");
  }
}

function buildIssueSummary(issues: string[]): string | undefined {
  if (issues.length === 0) {
    return undefined;
  }

  const labels = issues.map((issue) => renderIssueLabel(issue));
  return labels.length === 1
    ? t("Problema: {0}", labels[0])
    : t("Problemas: {0}", labels.join(", "));
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

function renderIssueLabel(issue: string): string {
  switch (issue) {
    case "missing-next-action":
      return t(k.issue.missingNextAction);
    case "inactive-active":
      return t(k.issue.inactiveActive);
    case "no-readme":
      return t(k.issue.noReadme);
    case "no-recent-commits":
      return t(k.issue.noRecentCommits);
    default:
      return issue;
  }
}
