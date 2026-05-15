import * as vscode from "vscode";
import type { TreeIconProvider } from "../treeIconProvider";
import type { TreeTooltipProvider } from "../treeTooltipProvider";

export class EmptyStateNode extends vscode.TreeItem {
  constructor(
    label: string,
    detail: string | undefined,
    actionLabel: string | undefined,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "shipone.emptyState";
    this.description = detail;
    this.iconPath = new vscode.ThemeIcon(iconProvider.getEmptyStateIcon());
    this.tooltip = tooltipProvider.buildEmptyStateTooltip(
      label,
      detail,
      actionLabel
    );
    if (actionLabel) {
      this.command = {
        command: "shipone.createProject",
        title: actionLabel,
      };
    }
  }
}
