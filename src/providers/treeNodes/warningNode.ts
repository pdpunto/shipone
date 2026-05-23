import * as vscode from "vscode";
import type { TreeIconProvider } from "../treeIconProvider";
import type { TreeTooltipProvider } from "../treeTooltipProvider";

export class WarningNode extends vscode.TreeItem {
  constructor(
    label: string,
    detail: string,
    projectId: string,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider,
    command: vscode.Command,
    tooltipDetail?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = detail;
    this.iconPath = iconProvider.getWarningIcon();
    this.tooltip = tooltipProvider.buildWarningTooltip(
      label,
      tooltipDetail ?? detail
    );
    this.command = command;
    this.contextValue = "shipone.warning";
  }
}
