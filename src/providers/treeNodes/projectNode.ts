import * as vscode from "vscode";
import { ProjectMetadata } from "../../models/project";
import { ProjectHealth } from "../../services/projectHealthService";
import { formatProjectType, getMvpProgress, getStatusIcon } from "./shared";

export class ProjectNode extends vscode.TreeItem {
  constructor(
    public readonly project: ProjectMetadata,
    health: ProjectHealth,
    warning: string | null
  ) {
    super(project.name, vscode.TreeItemCollapsibleState.None);

    const mvpProgress = getMvpProgress(project.mvpTasks);
    const projectType = formatProjectType(project.type);
    const nextActionWarning = project.status === "active" && !project.nextAction ? "no next" : null;

    this.description = [
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

    this.tooltip = new vscode.MarkdownString(
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

    this.contextValue = "shipone.project";
    this.iconPath = new vscode.ThemeIcon(project.favorite ? "star-full" : getStatusIcon(project.status));
    this.command = {
      command: "shipone.openProject",
      title: "Abrir proyecto",
      arguments: [project.id],
    };
  }
}
