import type { ProjectMetadata, ProjectStatus } from "../models/project";
import type { SettingsService } from "../services/settingsService";
import type { ProjectStoreService } from "../services/projectStoreService";
import type { ProjectHealthService } from "../services/projectHealthService";
import type { ProjectHealthRenderer } from "./projectHealthRenderer";
import type { TreeIconProvider } from "./treeIconProvider";
import type { TreeTooltipProvider } from "./treeTooltipProvider";
import { t } from "../localization";
import { translationKeys as k } from "../localization/keys";
import { describeInactivityWarning } from "../utils/inactivityWarning";
import { GroupNode } from "./treeNodes/groupNode";
import { MetricsNode } from "./treeNodes/metricsNode";
import { MetricItemNode } from "./treeNodes/metricItemNode";
import { EmptyStateNode } from "./treeNodes/emptyStateNode";
import { WarningNode } from "./treeNodes/warningNode";
import { FocusNode } from "./treeNodes/focusNode";
import { ProjectNode } from "./treeNodes/projectNode";
import { buildNoActiveProjectDetail } from "../commands/projects/projectOpsHelpers";

export type ShipOneTreeNode =
  | MetricsNode
  | MetricItemNode
  | GroupNode
  | ProjectNode
  | EmptyStateNode;

const GROUPS: Array<{ status: ProjectStatus; label: string }> = [
  { status: "active", label: t(k.tree.active) },
  { status: "idea", label: t(k.tree.ideas) },
  { status: "paused", label: t(k.tree.paused) },
  { status: "finished", label: t(k.tree.finished) },
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
            t(k.tree.noActiveProject),
            buildNoActiveProjectDetail(),
            t("Crear proyecto"),
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
      const warning = describeInactivityWarning(
        activeProject.lastOpenedAt,
        settings.inactiveWarningDays,
        settings.staleWarningDays
      );

      return [
        new FocusNode(
          activeProject,
          health,
          warning,
          this.iconProvider,
          this.tooltipProvider,
          this.healthRenderer
        ),
      ];
    }

    const settings = this.settingsService.getSettings();
    const projects = await this.projectStore.loadProjects();

    if (projects.length === 0) {
      return [
        new EmptyStateNode(
          t(k.tree.noProjectsYet),
          t(k.tree.noProjectsDetail),
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
            projects.filter((project) => project.status === group.status)
              .length,
            this.iconProvider,
            this.tooltipProvider
          )
      ),
    ];
  }

  async getMetricsNodes(): Promise<ShipOneTreeNode[]> {
    const projects = await this.projectStore.loadProjects();
    const summary = this.projectHealthService.getMetrics(projects);
    const settings = this.settingsService.getSettings();
    const healthSummary = await this.projectHealthService.getHealthSummary(
      projects,
      settings.inactiveWarningDays,
      settings.staleWarningDays
    );
    return [
      new MetricItemNode(t(k.tree.total), summary.total, this.iconProvider),
      new MetricItemNode(t(k.tree.ideas), summary.idea, this.iconProvider),
      new MetricItemNode(
        t(k.tree.metricsActive),
        summary.active,
        this.iconProvider
      ),
      new MetricItemNode(
        t(k.tree.metricsPaused),
        summary.paused,
        this.iconProvider
      ),
      new MetricItemNode(
        t(k.tree.metricsFinished),
        summary.finished,
        this.iconProvider
      ),
      new MetricItemNode(
        t(k.tree.finishRatio),
        `${summary.finishRatio}%`,
        this.iconProvider
      ),
      new MetricItemNode(
        t(k.health.healthy),
        healthSummary.healthy,
        this.iconProvider
      ),
      new MetricItemNode(
        t(k.health.warning),
        healthSummary.warning,
        this.iconProvider
      ),
      new MetricItemNode(t(k.health.bad), healthSummary.bad, this.iconProvider),
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
          t(k.tree.noProjectsYet),
          t(k.tree.appearsInGroup, renderGroupLabel(status)),
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
        const warning = describeInactivityWarning(
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
    const inactivity = describeInactivityWarning(
      project.lastOpenedAt,
      inactiveWarningDays,
      staleWarningDays
    );

    if (inactivity) {
      warnings.push(inactivity);
    }

    if (!project.nextAction) {
      warnings.push(t(k.tree.activeNoNextAction));
    }

    if (warnings.length === 0) {
      return [];
    }

    return [
      new WarningNode(
        t(k.tree.activeWithWarnings),
        warnings[0],
        project.id,
        this.iconProvider,
        this.tooltipProvider,
        warnings.join("\n")
      ),
    ];
  }
}

function renderGroupLabel(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return t(k.tree.activeLabel);
    case "idea":
      return t(k.tree.ideasLabel);
    case "paused":
      return t(k.tree.pausedLabel);
    case "finished":
      return t(k.tree.finishedLabel);
  }
}
