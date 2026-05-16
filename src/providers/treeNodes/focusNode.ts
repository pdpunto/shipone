import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { ProjectMetadata } from "../../models/project";
import type { ProjectHealth } from "../../services/projectHealthService";
import type { ProjectHealthRenderer } from "../projectHealthRenderer";
import type { TreeIconProvider } from "../treeIconProvider";
import type { TreeTooltipProvider } from "../treeTooltipProvider";

export class FocusNode extends vscode.TreeItem {
  constructor(
    project: ProjectMetadata,
    health: ProjectHealth,
    warning: string | null,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider,
    healthRenderer: ProjectHealthRenderer
  ) {
    super(
      t("{0}: {1}", t(k.tree.focusMode), project.name),
      vscode.TreeItemCollapsibleState.None
    );
    this.description = healthRenderer.buildProjectDescription(
      project,
      health,
      warning
    );
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
