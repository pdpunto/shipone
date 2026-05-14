import * as vscode from "vscode";
import { ProjectMetadata } from "../models/project";
import { ProjectHealth } from "../services/projectHealthService";

export class TreeTooltipProvider {
  buildGroupTooltip(label: string): vscode.MarkdownString {
    return new vscode.MarkdownString(
      [`**${label}**`, "", `Abre el grupo de proyectos ${label.toLowerCase()}.`].join("\n")
    );
  }

  buildFocusTooltip(project: ProjectMetadata, health: ProjectHealth): vscode.MarkdownString {
    return new vscode.MarkdownString(
      [
        `**${project.name}**`,
        "",
        `Estado: ${project.status}`,
        `Salud: ${health.label}`,
        `Siguiente accion: ${project.nextAction ?? "Sin next action"}`,
        `Ruta: ${project.path}`,
      ].join("\n")
    );
  }

  buildEmptyStateTooltip(label: string, actionLabel?: string): vscode.MarkdownString {
    return new vscode.MarkdownString(
      actionLabel ? `**${label}**\n\nUsa ${actionLabel} para empezar.` : `**${label}**`
    );
  }

  buildWarningTooltip(label: string, detail: string): vscode.MarkdownString {
    return new vscode.MarkdownString(`**${label}**\n\n${detail}`);
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
        `**${project.name}**`,
        "",
        `Tipo: ${projectType}`,
        `Estado: ${project.status}`,
        `Salud: ${health.label}`,
        `Ruta: ${project.path}`,
        `Ultima apertura: ${project.lastOpenedAt ?? "sin registro"}`,
        project.status === "active" && !project.nextAction ? "Aviso: falta next action" : "",
        project.pauseReason ? `Pausa: ${project.pauseReason}` : "",
        project.pauseNote ? `Nota: ${project.pauseNote}` : "",
        health.issues.length > 0 ? `Problemas: ${health.issues.join(", ")}` : "",
        mvpProgress ? `MVP: ${mvpProgress}` : "",
        warning ? `Aviso: ${warning}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
}
