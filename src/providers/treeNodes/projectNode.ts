import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { ProjectMetadata } from "../../models/project";
import type { ProjectHealth } from "../../services/projectHealthService";
import type { ProjectHealthRenderer } from "../projectHealthRenderer";
import type { TreeIconProvider } from "../treeIconProvider";
import type { TreeTooltipProvider } from "../treeTooltipProvider";
import { getMvpProgress } from "./shared";

export class ProjectNode extends vscode.TreeItem {
  constructor(
    public readonly project: ProjectMetadata,
    health: ProjectHealth,
    warning: string | null,
    iconProvider: TreeIconProvider,
    tooltipProvider: TreeTooltipProvider,
    healthRenderer: ProjectHealthRenderer
  ) {
    super(project.name, vscode.TreeItemCollapsibleState.None);

    const mvpProgress = getMvpProgress(project.mvpTasks);
    this.description = healthRenderer.buildProjectDescription(
      project,
      health,
      warning
    );
    this.tooltip = tooltipProvider.buildProjectTooltip(
      project,
      health,
      warning,
      mvpProgress
    );

    this.contextValue = "shipone.project";
    this.iconPath = iconProvider.getProjectIcon(project);
    this.command = {
      command: "shipone.openProject",
      title: t(k.common.openProject),
      arguments: [project.id],
    };
  }
}
