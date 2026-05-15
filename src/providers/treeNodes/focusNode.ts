import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { ProjectMetadata } from "../../models/project";
import type { ProjectHealth } from "../../services/projectHealthService";
import type { TreeIconProvider } from "../treeIconProvider";
import type { TreeTooltipProvider } from "../treeTooltipProvider";

export class FocusNode extends vscode.TreeItem {
  constructor(
    project: ProjectMetadata,
    health: ProjectHealth,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider
  ) {
    super(t(k.tree.focusMode), vscode.TreeItemCollapsibleState.None);
    this.description = project.nextAction ?? t(k.tree.noNextAction);
    this.iconPath = new vscode.ThemeIcon(iconProvider.getFocusIcon());
    this.tooltip = tooltipProvider.buildFocusTooltip(project, health);
    this.command = {
      command: "shipone.openProject",
      title: t(k.common.openProject),
      arguments: [project.id],
    };
    this.contextValue = "shipone.focus";
  }
}
