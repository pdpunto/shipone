import { ProjectMetadata, ProjectStatus } from "../models/project";
import { SettingsService } from "../services/settingsService";
import { ProjectStoreService } from "../services/projectStoreService";
import { ProjectHealthService } from "../services/projectHealthService";
import { ProjectHealthRenderer } from "./projectHealthRenderer";
import { TreeIconProvider } from "./treeIconProvider";
import { TreeTooltipProvider } from "./treeTooltipProvider";
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
    private readonly projectHealthService: ProjectHealthService,
    private readonly iconProvider: TreeIconProvider,
    private readonly tooltipProvider: TreeTooltipProvider,
    private readonly healthRenderer: ProjectHealthRenderer
  ) {}

  async getRootNodes(isFocusModeEnabled: boolean): Promise<ShipOneTreeNode[]> {
    if (isFocusModeEnabled) {
      const projects = await this.projectStore.loadProjects();
      const activeProject = projects.find((project) => project.status === "active");

      if (!activeProject) {
        return [
          new EmptyStateNode(
            "Sin proyecto activo",
            undefined,
            this.iconProvider,
            this.tooltipProvider
          ),
        ];
      }

      const settings = this.settingsService.getSettings();
      const health = await this.projectHealthService.buildProjectHealth(
        activeProject,
        settings.inactiveWarningDays,
        settings.staleWarningDays
      );

      return [
        new FocusNode(activeProject, health, this.iconProvider, this.tooltipProvider),
        new GroupNode("active", "Active", this.iconProvider, this.tooltipProvider),
      ];
    }

    const settings = this.settingsService.getSettings();
    const projects = await this.projectStore.loadProjects();

    if (projects.length === 0) {
      return [
        new EmptyStateNode(
          "Sin proyectos todavia",
          "Crear proyecto",
          this.iconProvider,
          this.tooltipProvider
        ),
        new EmptyStateNode(
          "Usa Crear proyecto para empezar",
          undefined,
          this.iconProvider,
          this.tooltipProvider
        ),
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
      new MetricsNode(this.iconProvider),
      ...activeWarnings,
      ...visibleGroups.map((group) =>
        new GroupNode(group.status, group.label, this.iconProvider, this.tooltipProvider)
      ),
    ];
  }

  async getMetricsNodes(): Promise<ShipOneTreeNode[]> {
    const projects = await this.projectStore.loadProjects();
    const summary = this.projectHealthService.getMetrics(projects);
    return [
      new MetricItemNode("Total", summary.total, this.iconProvider),
      new MetricItemNode("Ideas", summary.idea, this.iconProvider),
      new MetricItemNode("Active", summary.active, this.iconProvider),
      new MetricItemNode("Paused", summary.paused, this.iconProvider),
      new MetricItemNode("Finished", summary.finished, this.iconProvider),
      new MetricItemNode("Finish ratio", `${summary.finishRatio}%`, this.iconProvider),
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
      return [
        new EmptyStateNode(
          "Sin proyectos todavia",
          "Crear proyecto",
          this.iconProvider,
          this.tooltipProvider
        ),
      ];
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

        return new ProjectNode(
          project,
          health,
          warning,
          this.iconProvider,
          this.tooltipProvider,
          this.healthRenderer
        );
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
          project.id,
          this.iconProvider,
          this.tooltipProvider
        )
      );
    }

    if (!project.nextAction) {
      warnings.push(
        new WarningNode(
          "Active sin next action",
          "Define el siguiente paso para avanzar",
          project.id,
          this.iconProvider,
          this.tooltipProvider
        )
      );
    }

    return warnings;
  }
}
