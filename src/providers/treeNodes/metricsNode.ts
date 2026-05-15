import * as vscode from "vscode";
import type { TreeIconProvider } from "../treeIconProvider";

export class MetricsNode extends vscode.TreeItem {
  constructor(iconProvider: TreeIconProvider) {
    super("Metrics", vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(iconProvider.getMetricsIcon());
    this.contextValue = "shipone.metrics";
  }
}
