import * as vscode from "vscode";
import type { TreeIconProvider } from "../treeIconProvider";

export class MetricItemNode extends vscode.TreeItem {
  constructor(
    label: string,
    value: string | number,
    iconProvider: TreeIconProvider
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = String(value);
    this.iconPath = iconProvider.getMetricItemIcon(label);
    this.contextValue = "shipone.metric";
  }
}
