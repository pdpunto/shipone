import * as vscode from "vscode";
import { t } from "../localization";
import { translationKeys as k } from "../localization/keys";
import type { ProjectMetadata } from "../models/project";
import type { ProjectHealth } from "../services/projectHealthService";
import { formatGroupedHealthIssues } from "../utils/healthIssueGrouping";

export class TreeTooltipProvider {
  buildGroupTooltip(label: string, count?: number): vscode.MarkdownString {
    return buildMarkdownTooltip([
      t("**{0}**", label),
      "",
      typeof count === "number" ? t("Proyectos: {0}", count) : "",
      t("Abre el grupo de proyectos {0}.", label.toLowerCase()),
    ]);
  }

  buildFocusTooltip(
    project: ProjectMetadata,
    health: ProjectHealth
  ): vscode.MarkdownString {
    return buildMarkdownTooltip([
      t("**{0}**", project.name),
      "",
      t("Ruta: {0}", project.path),
      project.nextAction
        ? t("Siguiente: {0}", project.nextAction)
        : t(k.tree.noNextAction),
      t("Salud: {0}", renderHealthLabel(health.label)),
      formatGroupedHealthIssues(health.issues) ?? "",
    ]);
  }

  buildEmptyStateTooltip(
    label: string,
    detail?: string,
    actionLabel?: string
  ): vscode.MarkdownString {
    return buildMarkdownTooltip([
      t("**{0}**", label),
      "",
      detail ?? "",
      actionLabel ? t("Usa {0} para empezar.", actionLabel) : "",
    ]);
  }

  buildWarningTooltip(label: string, detail: string): vscode.MarkdownString {
    return buildMarkdownTooltip([t("**{0}**", label), "", detail]);
  }

  buildProjectTooltip(
    project: ProjectMetadata,
    health: ProjectHealth,
    warning: string | null,
    mvpProgress: string | null
  ): vscode.MarkdownString {
    return buildMarkdownTooltip([
      t("**{0}**", project.name),
      "",
      t("Ruta: {0}", project.path),
      t(k.tree.lastOpened, project.lastOpenedAt ?? t("sin registro")),
      project.repoUrl ? t("Repo: {0}", project.repoUrl) : "",
      project.tags?.length ? t("Etiquetas: {0}", project.tags.join(", ")) : "",
      project.favorite ? t("Favorito: si") : "",
      project.pauseReason ? t("Pausa: {0}", project.pauseReason) : "",
      project.pauseNote ? t("Nota de pausa: {0}", project.pauseNote) : "",
      formatGroupedHealthIssues(health.issues) ?? "",
      mvpProgress ? t("MVP: {0}", mvpProgress) : "",
      warning ? t("Aviso: {0}", warning) : "",
    ]);
  }
}

function buildMarkdownTooltip(
  lines: Array<string | undefined>
): vscode.MarkdownString {
  return new vscode.MarkdownString(
    lines.filter((line): line is string => Boolean(line)).join("\n")
  );
}

function renderHealthLabel(label: ProjectHealth["label"]): string {
  switch (label) {
    case "healthy":
      return t(k.health.healthy);
    case "warning":
      return t(k.health.warning);
    case "bad":
      return t(k.health.bad);
  }
}
