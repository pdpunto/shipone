import * as vscode from "vscode";
import { ProjectStatus } from "../../models/project";

export class GroupNode extends vscode.TreeItem {
  constructor(
    readonly status: ProjectStatus,
    label: string,
    iconName: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.contextValue = "shipone.group";
    this.tooltip = new vscode.MarkdownString(
      [
        `**${label}**`,
        "",
        `Abre el grupo de proyectos ${label.toLowerCase()}.`,
      ].join("\n")
    );
  }
}
