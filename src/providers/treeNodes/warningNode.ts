import * as vscode from "vscode";

export class WarningNode extends vscode.TreeItem {
  constructor(label: string, detail: string, projectId: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = detail;
    this.iconPath = new vscode.ThemeIcon("alert");
    this.tooltip = new vscode.MarkdownString(`**${label}**\n\n${detail}`);
    this.command = {
      command: "shipone.openProject",
      title: "Abrir proyecto",
      arguments: [projectId],
    };
    this.contextValue = "shipone.warning";
  }
}
