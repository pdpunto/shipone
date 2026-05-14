import * as vscode from "vscode";
import { t } from "../localization";
import { ProjectMetadata } from "../models/project";
import { ProjectHealth } from "../services/projectHealthService";

export class TreeTooltipProvider {
  buildGroupTooltip(label: string): vscode.MarkdownString {
    return new vscode.MarkdownString(
      [
        t("**{0}**", label),
        "",
        t("Abre el grupo de proyectos {0}.", label.toLowerCase()),
      ].join("\n")
    );
  }

  buildFocusTooltip(
    project: ProjectMetadata,
    health: ProjectHealth
  ): vscode.MarkdownString {
    return new vscode.MarkdownString(
      [
        t("**{0}**", project.name),
        "",
        t("Estado: {0}", project.status),
        t("Salud: {0}", renderHealthLabel(health.label)),
        t("Siguiente accion: {0}", project.nextAction ?? t("Sin next action")),
        t("Ruta: {0}", project.path),
      ].join("\n")
    );
  }

  buildEmptyStateTooltip(
    label: string,
    actionLabel?: string
  ): vscode.MarkdownString {
    return new vscode.MarkdownString(
      actionLabel
        ? t("**{0}**\n\nUsa {1} para empezar.", label, actionLabel)
        : t("**{0}**", label)
    );
  }

  buildWarningTooltip(label: string, detail: string): vscode.MarkdownString {
    return new vscode.MarkdownString(t("**{0}**\n\n{1}", label, detail));
  }

  buildProjectTooltip(
    project: ProjectMetadata,
    health: ProjectHealth,
    warning: string | null,
    mvpProgress: string | null,
    projectType: string
  ): vscode.MarkdownString {
    return new vscode.MarkdownString(
      [
        t("**{0}**", project.name),
        "",
        t("Tipo: {0}", projectType),
        t("Estado: {0}", project.status),
        t("Salud: {0}", renderHealthLabel(health.label)),
        t("Ruta: {0}", project.path),
        t("Ultima apertura: {0}", project.lastOpenedAt ?? t("sin registro")),
        project.status === "active" && !project.nextAction
          ? t("Aviso: falta next action")
          : "",
        project.pauseReason ? t("Pausa: {0}", project.pauseReason) : "",
        project.pauseNote ? t("Nota: {0}", project.pauseNote) : "",
        health.issues.length > 0
          ? t("Problemas: {0}", health.issues.map(renderIssueLabel).join(", "))
          : "",
        mvpProgress ? t("MVP: {0}", mvpProgress) : "",
        warning ? t("Aviso: {0}", warning) : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
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
