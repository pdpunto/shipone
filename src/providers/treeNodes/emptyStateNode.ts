import * as vscode from "vscode";

export class EmptyStateNode extends vscode.TreeItem {
  constructor(label: string, actionLabel?: string, iconName = "info") {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "shipone.emptyState";
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.tooltip = new vscode.MarkdownString(
      actionLabel
        ? `**${label}**\n\nUsa ${actionLabel} para empezar.`
        : `**${label}**`
    );
    if (actionLabel) {
      this.command = {
        command: "shipone.createProject",
        title: actionLabel,
      };
    }
  }
}
