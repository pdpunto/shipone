import * as vscode from "vscode";
import { ProjectStatus } from "../../models/project";
import { TreeIconProvider } from "../treeIconProvider";
import { TreeTooltipProvider } from "../treeTooltipProvider";

export class GroupNode extends vscode.TreeItem {
  constructor(
    readonly status: ProjectStatus,
    label: string,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(iconProvider.getGroupIcon(status));
    this.contextValue = "shipone.group";
    this.tooltip = tooltipProvider.buildGroupTooltip(label);
  }
}
