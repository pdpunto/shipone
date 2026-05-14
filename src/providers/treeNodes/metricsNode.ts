import * as vscode from "vscode";

export class MetricsNode extends vscode.TreeItem {
  constructor() {
    super("Metrics", vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon("graph");
    this.contextValue = "shipone.metrics";
  }
}
