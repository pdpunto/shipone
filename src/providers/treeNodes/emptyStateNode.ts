import * as vscode from "vscode";
import { TreeIconProvider } from "../treeIconProvider";
import { TreeTooltipProvider } from "../treeTooltipProvider";

export class EmptyStateNode extends vscode.TreeItem {
  constructor(
    label: string,
    actionLabel: string | undefined,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "shipone.emptyState";
    this.iconPath = new vscode.ThemeIcon(iconProvider.getEmptyStateIcon());
    this.tooltip = tooltipProvider.buildEmptyStateTooltip(label, actionLabel);
    if (actionLabel) {
      this.command = {
        command: "shipone.createProject",
        title: actionLabel,
      };
    }
  }
}
