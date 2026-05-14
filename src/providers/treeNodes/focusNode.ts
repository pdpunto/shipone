import * as vscode from "vscode";
import { ProjectMetadata } from "../../models/project";
import { ProjectHealth } from "../../services/projectHealthService";

export class FocusNode extends vscode.TreeItem {
  constructor(project: ProjectMetadata, health: ProjectHealth) {
    super("Focus mode", vscode.TreeItemCollapsibleState.None);
    this.description = project.nextAction ?? "Sin next action";
    this.iconPath = new vscode.ThemeIcon("eye");
    this.tooltip = new vscode.MarkdownString(
      [
        `**${project.name}**`,
        "",
        `Estado: ${project.status}`,
        `Salud: ${health.label}`,
        `Siguiente accion: ${project.nextAction ?? "Sin next action"}`,
        `Ruta: ${project.path}`,
      ].join("\n")
    );
    this.command = {
      command: "shipone.openProject",
      title: "Abrir proyecto",
      arguments: [project.id],
    };
    this.contextValue = "shipone.focus";
  }
}
