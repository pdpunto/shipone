import * as vscode from "vscode";
import { TreeIconProvider } from "../treeIconProvider";
import { TreeTooltipProvider } from "../treeTooltipProvider";

export class WarningNode extends vscode.TreeItem {
  constructor(
    label: string,
    detail: string,
    projectId: string,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = detail;
    this.iconPath = new vscode.ThemeIcon(iconProvider.getWarningIcon());
    this.tooltip = tooltipProvider.buildWarningTooltip(label, detail);
    this.command = {
      command: "shipone.openProject",
      title: "Abrir proyecto",
      arguments: [projectId],
    };
    this.contextValue = "shipone.warning";
  }
}
