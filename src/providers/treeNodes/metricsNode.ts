import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { TreeIconProvider } from "../treeIconProvider";

export class MetricsNode extends vscode.TreeItem {
  constructor(iconProvider: TreeIconProvider) {
    super(t(k.tree.metrics), vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(iconProvider.getMetricsIcon());
    this.contextValue = "shipone.metrics";
  }
}
