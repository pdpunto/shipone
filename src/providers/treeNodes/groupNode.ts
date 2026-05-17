import * as vscode from "vscode";
import type { ProjectStatus } from "../../models/project";
import type { TreeIconProvider } from "../treeIconProvider";
import type { TreeTooltipProvider } from "../treeTooltipProvider";

export class GroupNode extends vscode.TreeItem {
  constructor(
    readonly status: ProjectStatus,
    label: string,
    count: number,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(iconProvider.getGroupIcon(status));
    this.contextValue = "shipone.group";
    this.tooltip = tooltipProvider.buildGroupTooltip(label, count);
  }
}
