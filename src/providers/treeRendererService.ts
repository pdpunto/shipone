import { ProjectMetadata, ProjectStatus } from "../models/project";
import { SettingsService } from "../services/settingsService";
import { ProjectStoreService } from "../services/projectStoreService";
import { ProjectHealthService } from "../services/projectHealthService";
import { ProjectHealthRenderer } from "./projectHealthRenderer";
import { TreeIconProvider } from "./treeIconProvider";
import { TreeTooltipProvider } from "./treeTooltipProvider";
import { t } from "../localization";
import { GroupNode } from "./treeNodes/groupNode";
import { MetricsNode } from "./treeNodes/metricsNode";
import { MetricItemNode } from "./treeNodes/metricItemNode";
import { EmptyStateNode } from "./treeNodes/emptyStateNode";
import { WarningNode } from "./treeNodes/warningNode";
import { FocusNode } from "./treeNodes/focusNode";
import { ProjectNode } from "./treeNodes/projectNode";

export type ShipOneTreeNode =
  | MetricsNode
  | MetricItemNode
  | GroupNode
  | ProjectNode
  | EmptyStateNode;

const GROUPS: Array<{ status: ProjectStatus; label: string; icon: string }> = [
  { status: "active", label: t("Active"), icon: "play" },
  { status: "idea", label: t("Ideas"), icon: "lightbulb" },
  { status: "paused", label: t("Paused"), icon: "debug-pause" },
  { status: "finished", label: t("Finished"), icon: "check" },
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
      const activeProject = projects.find(
        (project) => project.status === "active"
      );

      if (!activeProject) {
        return [
          new EmptyStateNode(
            t("Sin proyecto activo"),
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
        new FocusNode(
          activeProject,
          health,
          this.iconProvider,
          this.tooltipProvider
        ),
        new GroupNode(
          "active",
          "Active",
          this.iconProvider,
          this.tooltipProvider
        ),
      ];
    }

    const settings = this.settingsService.getSettings();
    const projects = await this.projectStore.loadProjects();

    if (projects.length === 0) {
      return [
        new EmptyStateNode(
          t("Sin proyectos todavia"),
          t("Crear proyecto"),
          this.iconProvider,
          this.tooltipProvider
        ),
      ];
    }

    const visibleGroups = settings.showFinishedProjects
      ? GROUPS
      : GROUPS.filter((group) => group.status !== "finished");
    const activeProject = projects.find(
      (project) => project.status === "active"
    );
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
      ...visibleGroups.map(
        (group) =>
          new GroupNode(
            group.status,
            group.label,
            this.iconProvider,
            this.tooltipProvider
          )
      ),
    ];
  }

  async getMetricsNodes(): Promise<ShipOneTreeNode[]> {
    const projects = await this.projectStore.loadProjects();
    const summary = this.projectHealthService.getMetrics(projects);
    return [
      new MetricItemNode(t("Total"), summary.total, this.iconProvider),
      new MetricItemNode(t("Ideas"), summary.idea, this.iconProvider),
      new MetricItemNode(t("Active"), summary.active, this.iconProvider),
      new MetricItemNode(t("Paused"), summary.paused, this.iconProvider),
      new MetricItemNode(t("Finished"), summary.finished, this.iconProvider),
      new MetricItemNode(
        t("Finish ratio"),
        `${summary.finishRatio}%`,
        this.iconProvider
      ),
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
          t("Sin proyectos todavia"),
          t("Crear proyecto"),
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
    const warnings: string[] = [];
    const inactivity = this.projectHealthService.getInactivityWarning(
      project.lastOpenedAt,
      inactiveWarningDays,
      staleWarningDays
    );

    if (inactivity) {
      warnings.push(
        t("Ultima apertura: {0}", project.lastOpenedAt ?? t("sin registro"))
      );
    }

    if (!project.nextAction) {
      warnings.push(t("Define el siguiente paso para avanzar"));
    }

    if (warnings.length === 0) {
      return [];
    }

    return [
      new WarningNode(
        t("Active con avisos"),
        warnings.join(" · "),
        project.id,
        this.iconProvider,
        this.tooltipProvider
      ),
    ];
  }
}
