import * as vscode from "vscode";
import { t } from "../../localization";
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
    super(t("Focus mode"), vscode.TreeItemCollapsibleState.None);
    this.description = project.nextAction ?? t("Sin next action");
    this.iconPath = new vscode.ThemeIcon(iconProvider.getFocusIcon());
    this.tooltip = tooltipProvider.buildFocusTooltip(project, health);
    this.command = {
      command: "shipone.openProject",
      title: t("Abrir proyecto"),
      arguments: [project.id],
    };
    this.contextValue = "shipone.focus";
  }
}
