import { ProjectMetadata, ProjectStatus } from "../models/project";
import { SettingsService } from "../services/settingsService";
import { ProjectStoreService } from "../services/projectStoreService";
import {
  ProjectHealthService,
  type ProjectHealth,
} from "../services/projectHealthService";
import { GroupNode } from "./treeNodes/groupNode";
import { MetricsNode } from "./treeNodes/metricsNode";
import { MetricItemNode } from "./treeNodes/metricItemNode";
import { EmptyStateNode } from "./treeNodes/emptyStateNode";
import { WarningNode } from "./treeNodes/warningNode";
import { FocusNode } from "./treeNodes/focusNode";
import { ProjectNode } from "./treeNodes/projectNode";

export type ShipOneTreeNode = MetricsNode | MetricItemNode | GroupNode | ProjectNode | EmptyStateNode;

const GROUPS: Array<{ status: ProjectStatus; label: string; icon: string }> = [
  { status: "active", label: "Active", icon: "play" },
  { status: "idea", label: "Ideas", icon: "lightbulb" },
  { status: "paused", label: "Paused", icon: "debug-pause" },
  { status: "finished", label: "Finished", icon: "check" },
];

export class TreeRendererService {
  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly settingsService: SettingsService,
    private readonly projectHealthService: ProjectHealthService
  ) {}

  async getRootNodes(isFocusModeEnabled: boolean): Promise<ShipOneTreeNode[]> {
    if (isFocusModeEnabled) {
      const projects = await this.projectStore.loadProjects();
      const activeProject = projects.find((project) => project.status === "active");

      if (!activeProject) {
        return [new EmptyStateNode("Sin proyecto activo")];
      }

      const settings = this.settingsService.getSettings();
      const health = await this.projectHealthService.buildProjectHealth(
        activeProject,
        settings.inactiveWarningDays,
        settings.staleWarningDays
      );

      return [new FocusNode(activeProject, health), new GroupNode("active", "Active", "play")];
    }

    const settings = this.settingsService.getSettings();
    const projects = await this.projectStore.loadProjects();

    if (projects.length === 0) {
      return [
        new EmptyStateNode("Sin proyectos todavia", "Crear proyecto", "add"),
        new EmptyStateNode("Usa Crear proyecto para empezar"),
      ];
    }

    const visibleGroups = settings.showFinishedProjects
      ? GROUPS
      : GROUPS.filter((group) => group.status !== "finished");
    const activeProject = projects.find((project) => project.status === "active");
    const activeWarnings = activeProject
      ? this.buildActiveWarnings(
          activeProject,
          settings.inactiveWarningDays,
          settings.staleWarningDays
        )
      : [];

    return [
      new MetricsNode(),
      ...activeWarnings,
      ...visibleGroups.map((group) => new GroupNode(group.status, group.label, group.icon)),
    ];
  }

  async getMetricsNodes(): Promise<ShipOneTreeNode[]> {
    const projects = await this.projectStore.loadProjects();
    const summary = this.projectHealthService.getMetrics(projects);
    return [
      new MetricItemNode("Total", summary.total, "graph"),
      new MetricItemNode("Ideas", summary.idea, "lightbulb"),
      new MetricItemNode("Active", summary.active, "play"),
      new MetricItemNode("Paused", summary.paused, "debug-pause"),
      new MetricItemNode("Finished", summary.finished, "check"),
      new MetricItemNode("Finish ratio", `${summary.finishRatio}%`, "pie-chart"),
    ];
  }

  async getGroupNodes(status: ProjectStatus): Promise<ShipOneTreeNode[]> {
    const grouped = (await this.projectStore.getProjectsByStatus()) as Record<
      ProjectStatus,
      ProjectMetadata[]
    >;
    const projects = grouped[status] ?? [];
    const settings = this.settingsService.getSettings();

    if (projects.length === 0) {
      return [new EmptyStateNode("Sin proyectos todavia", "Crear proyecto", "add")];
    }

    return Promise.all(
      projects.map(async (project) => {
        const health = await this.projectHealthService.buildProjectHealth(
          project,
          settings.inactiveWarningDays,
          settings.staleWarningDays
        );
        const warning = this.projectHealthService.getInactivityWarning(
          project.lastOpenedAt,
          settings.inactiveWarningDays,
          settings.staleWarningDays
        );

        return new ProjectNode(project, health, warning);
      })
    );
  }

  private buildActiveWarnings(
    project: ProjectMetadata,
    inactiveWarningDays: number,
    staleWarningDays: number
  ): WarningNode[] {
    const warnings: WarningNode[] = [];
    const inactivity = this.projectHealthService.getInactivityWarning(
      project.lastOpenedAt,
      inactiveWarningDays,
      staleWarningDays
    );

    if (inactivity) {
      warnings.push(
        new WarningNode(
          "Active sin uso reciente",
          `Ultima apertura: ${project.lastOpenedAt ?? "sin registro"}`,
          project.id
        )
      );
    }

    if (!project.nextAction) {
      warnings.push(
        new WarningNode("Active sin next action", "Define el siguiente paso para avanzar", project.id)
      );
    }

    return warnings;
  }
}
