import * as vscode from "vscode";
import { t } from "../localization";
import type { ProjectMetadata } from "../models/project";
import type { ProjectHealth } from "../services/projectHealthService";

export class TreeTooltipProvider {
  buildGroupTooltip(label: string): vscode.MarkdownString {
    return buildMarkdownTooltip([
      t("**{0}**", label),
      "",
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
      t("Salud: {0}", renderHealthLabel(health.label)),
      health.issues.length > 0
        ? t("Problemas: {0}", health.issues.map(renderIssueLabel).join(", "))
        : "",
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
      t("Ultima apertura: {0}", project.lastOpenedAt ?? t("sin registro")),
      project.repoUrl ? t("Repo: {0}", project.repoUrl) : "",
      project.tags?.length
        ? t("Etiquetas: {0}", project.tags.join(", "))
        : "",
      project.favorite ? t("Favorito: si") : "",
      project.pauseReason ? t("Pausa: {0}", project.pauseReason) : "",
      project.pauseNote ? t("Nota de pausa: {0}", project.pauseNote) : "",
      health.issues.length > 0
        ? t("Problemas: {0}", health.issues.map(renderIssueLabel).join(", "))
        : "",
      mvpProgress ? t("MVP: {0}", mvpProgress) : "",
      warning ? t("Aviso: {0}", warning) : "",
    ]);
  }
}

function buildMarkdownTooltip(lines: Array<string | undefined>): vscode.MarkdownString {
  return new vscode.MarkdownString(
    lines.filter((line): line is string => Boolean(line)).join("\n")
  );
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

function renderIssueLabel(issue: string): string {
  switch (issue) {
    case "missing-next-action":
      return t("missing-next-action");
    case "inactive-active":
      return t("inactive-active");
    case "no-readme":
      return t("no-readme");
    case "no-recent-commits":
      return t("no-recent-commits");
    default:
      return issue;
  }
}
