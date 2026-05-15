import * as vscode from "vscode";
import { t } from "../../localization";
import { ProjectMetadata } from "../../models/project";
import { ProjectHealth } from "../../services/projectHealthService";
import { ProjectHealthRenderer } from "../projectHealthRenderer";
import { TreeIconProvider } from "../treeIconProvider";
import { TreeTooltipProvider } from "../treeTooltipProvider";
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
    this.iconPath = new vscode.ThemeIcon(iconProvider.getProjectIcon(project));
    this.command = {
      command: "shipone.openProject",
      title: t("Abrir proyecto"),
      arguments: [project.id],
    };
  }
}
