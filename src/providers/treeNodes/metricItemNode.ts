import * as vscode from "vscode";

export class MetricItemNode extends vscode.TreeItem {
  constructor(label: string, value: string | number, iconName: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = String(value);
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.contextValue = "shipone.metric";
  }
}
