import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { TreeIconProvider } from "../treeIconProvider";
import type { TreeTooltipProvider } from "../treeTooltipProvider";

export class WarningNode extends vscode.TreeItem {
  constructor(
    label: string,
    detail: string,
    projectId: string,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider,
    tooltipDetail?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = detail;
    this.iconPath = iconProvider.getWarningIcon();
    this.tooltip = tooltipProvider.buildWarningTooltip(
      label,
      tooltipDetail ?? detail
    );
    this.command = {
      command: "shipone.openProject",
      title: t(k.common.openProject),
      arguments: [projectId],
    };
    this.contextValue = "shipone.warning";
  }
}
