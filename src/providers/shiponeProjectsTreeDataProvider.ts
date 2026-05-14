import * as vscode from "vscode";
import { ProjectMetadata, ProjectStatus } from "../models/project";
import { SettingsService } from "../services/settingsService";
import { ProjectStoreService } from "../services/projectStoreService";

type ShipOneTreeNode = MetricsNode | MetricItemNode | GroupNode | ProjectNode | EmptyStateNode;

const GROUPS: Array<{ status: ProjectStatus; label: string; icon: string }> = [
  { status: "active", label: "Active", icon: "play" },
  { status: "idea", label: "Ideas", icon: "lightbulb" },
  { status: "paused", label: "Paused", icon: "debug-pause" },
  { status: "finished", label: "Finished", icon: "check" },
];

export class ShipOneProjectsTreeDataProvider
  implements vscode.TreeDataProvider<ShipOneTreeNode>
{
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void>();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly settingsService: SettingsService
  ) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: ShipOneTreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ShipOneTreeNode): Promise<ShipOneTreeNode[]> {
    if (!element) {
      return [
        new MetricsNode(),
        ...GROUPS.map((group) => new GroupNode(group.status, group.label, group.icon)),
      ];
    }

    if (element instanceof MetricsNode) {
      const projects = await this.projectStore.loadProjects();
      const summary = buildMetrics(projects);
      return [
        new MetricItemNode("Total", summary.total, "graph"),
        new MetricItemNode("Ideas", summary.idea, "lightbulb"),
        new MetricItemNode("Active", summary.active, "play"),
        new MetricItemNode("Paused", summary.paused, "debug-pause"),
        new MetricItemNode("Finished", summary.finished, "check"),
        new MetricItemNode("Finish ratio", `${summary.finishRatio}%`, "pie-chart"),
      ];
    }

    if (element instanceof GroupNode) {
      const grouped = await this.projectStore.getProjectsByStatus();
      const projects = grouped[element.status];
      const settings = this.settingsService.getSettings();

      if (projects.length === 0) {
        return [new EmptyStateNode("Sin proyectos todavia")];
      }

      return projects.map(
        (project) =>
          new ProjectNode(project, settings.inactiveWarningDays, settings.staleWarningDays)
      );
    }

    return [];
  }
}

class GroupNode extends vscode.TreeItem {
  constructor(
    readonly status: ProjectStatus,
    label: string,
    iconName: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.contextValue = "shipone.group";
  }
}

class MetricsNode extends vscode.TreeItem {
  constructor() {
    super("Metrics", vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon("graph");
    this.contextValue = "shipone.metrics";
  }
}

class MetricItemNode extends vscode.TreeItem {
  constructor(label: string, value: string | number, iconName: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = String(value);
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.contextValue = "shipone.metric";
  }
}

class ProjectNode extends vscode.TreeItem {
  constructor(
    project: ProjectMetadata,
    inactiveWarningDays: number,
    staleWarningDays: number
  ) {
    super(project.name, vscode.TreeItemCollapsibleState.None);

    const warning = getInactivityWarning(
      project.lastOpenedAt,
      inactiveWarningDays,
      staleWarningDays
    );

    this.description = [project.nextAction ?? undefined, warning ?? undefined]
      .filter(Boolean)
      .join(" · ");
    this.tooltip = new vscode.MarkdownString(
      [
        `**${project.name}**`,
        "",
        `Estado: ${project.status}`,
        `Ruta: ${project.path}`,
        `Ultima apertura: ${project.lastOpenedAt ?? "sin registro"}`,
        warning ? `Aviso: ${warning}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    this.contextValue = "shipone.project";
    this.iconPath = new vscode.ThemeIcon(project.favorite ? "star-full" : getStatusIcon(project.status));
    this.command = {
      command: "shipone.openProject",
      title: "Abrir proyecto",
      arguments: [project.id],
    };
  }
}

class EmptyStateNode extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "shipone.emptyState";
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

function getStatusIcon(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "play";
    case "idea":
      return "lightbulb";
    case "paused":
      return "debug-pause";
    case "finished":
      return "check";
  }
}

function getInactivityWarning(
  lastOpenedAt: string | undefined,
  inactiveWarningDays: number,
  staleWarningDays: number
): string | null {
  if (!lastOpenedAt) {
    return null;
  }

  const openedAt = new Date(lastOpenedAt);
  if (Number.isNaN(openedAt.getTime())) {
    return null;
  }

  const ageDays = Math.floor((Date.now() - openedAt.getTime()) / 86_400_000);

  if (ageDays >= staleWarningDays) {
    return `stale ${ageDays}d`;
  }

  if (ageDays >= inactiveWarningDays) {
    return `inactive ${ageDays}d`;
  }

  return null;
}

function buildMetrics(projects: ProjectMetadata[]) {
  const total = projects.length;
  const idea = projects.filter((project) => project.status === "idea").length;
  const active = projects.filter((project) => project.status === "active").length;
  const paused = projects.filter((project) => project.status === "paused").length;
  const finished = projects.filter((project) => project.status === "finished").length;
  const finishRatio = total === 0 ? 0 : Math.round((finished / total) * 100);

  return {
    total,
    idea,
    active,
    paused,
    finished,
    finishRatio,
  };
}
