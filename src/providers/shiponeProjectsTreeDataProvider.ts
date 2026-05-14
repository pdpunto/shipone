import * as vscode from "vscode";
import { ProjectMetadata, ProjectStatus } from "../models/project";
import { SettingsService } from "../services/settingsService";
import { ProjectStoreService } from "../services/projectStoreService";
import {
  ProjectHealthService,
  type ProjectHealth,
  type ProjectMetrics,
} from "../services/projectHealthService";

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
    private readonly settingsService: SettingsService,
    private readonly projectHealthService: ProjectHealthService,
    private readonly isFocusModeEnabled: () => boolean
  ) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: ShipOneTreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ShipOneTreeNode): Promise<ShipOneTreeNode[]> {
    if (!element) {
      if (this.isFocusModeEnabled()) {
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

        return [
          new FocusNode(activeProject, health),
          new GroupNode("active", "Active", "play"),
        ];
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
        ? buildActiveWarnings(
            this.projectHealthService,
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

    if (element instanceof MetricsNode) {
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

    if (element instanceof GroupNode) {
      const grouped = await this.projectStore.getProjectsByStatus();
      const projects = grouped[element.status];
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
    this.tooltip = new vscode.MarkdownString(
      [
        `**${label}**`,
        "",
        `Abre el grupo de proyectos ${label.toLowerCase()}.`,
      ].join("\n")
    );
  }
}

class MetricsNode extends vscode.TreeItem {
  constructor() {
    super("Metrics", vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon("graph");
    this.contextValue = "shipone.metrics";
  }
}

class FocusNode extends vscode.TreeItem {
  constructor(project: ProjectMetadata, health: ProjectHealth) {
    super("Focus mode", vscode.TreeItemCollapsibleState.None);
    this.description = project.nextAction ?? "Sin next action";
    this.iconPath = new vscode.ThemeIcon("eye");
    this.tooltip = new vscode.MarkdownString(
      [
        `**${project.name}**`,
        "",
        `Estado: ${project.status}`,
        `Salud: ${health.label}`,
        `Siguiente accion: ${project.nextAction ?? "Sin next action"}`,
        `Ruta: ${project.path}`,
      ].join("\n")
    );
    this.command = {
      command: "shipone.openProject",
      title: "Abrir proyecto",
      arguments: [project.id],
    };
    this.contextValue = "shipone.focus";
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

class WarningNode extends vscode.TreeItem {
  constructor(label: string, detail: string, projectId: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = detail;
    this.iconPath = new vscode.ThemeIcon("alert");
    this.tooltip = new vscode.MarkdownString(`**${label}**\n\n${detail}`);
    this.command = {
      command: "shipone.openProject",
      title: "Abrir proyecto",
      arguments: [projectId],
    };
    this.contextValue = "shipone.warning";
  }
}

class ProjectNode extends vscode.TreeItem {
  constructor(
    public readonly project: ProjectMetadata,
    health: ProjectHealth,
    warning: string | null
  ) {
    super(project.name, vscode.TreeItemCollapsibleState.None);

    const mvpProgress = getMvpProgress(project.mvpTasks);
    const projectType = formatProjectType(project.type);
    const nextActionWarning = project.status === "active" && !project.nextAction ? "no next" : null;

    this.description = [
      projectType,
      project.nextAction ? `next: ${project.nextAction}` : undefined,
      nextActionWarning,
      health.label,
      project.pauseReason ? `pause: ${project.pauseReason}` : undefined,
      warning ?? undefined,
      mvpProgress ?? undefined,
    ]
      .filter(Boolean)
      .join(" · ");

    this.tooltip = new vscode.MarkdownString(
      [
        `**${project.name}**`,
        "",
        `Tipo: ${projectType}`,
        `Estado: ${project.status}`,
        `Salud: ${health.label}`,
        `Ruta: ${project.path}`,
        `Ultima apertura: ${project.lastOpenedAt ?? "sin registro"}`,
        project.status === "active" && !project.nextAction ? "Aviso: falta next action" : "",
        project.pauseReason ? `Pausa: ${project.pauseReason}` : "",
        project.pauseNote ? `Nota: ${project.pauseNote}` : "",
        health.issues.length > 0 ? `Problemas: ${health.issues.join(", ")}` : "",
        mvpProgress ? `MVP: ${mvpProgress}` : "",
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
  constructor(label: string, actionLabel?: string, iconName = "info") {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "shipone.emptyState";
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.tooltip = new vscode.MarkdownString(
      actionLabel
        ? `**${label}**\n\nUsa ${actionLabel} para empezar.`
        : `**${label}**`
    );
    if (actionLabel) {
      this.command = {
        command: "shipone.createProject",
        title: actionLabel,
      };
    }
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

function getMvpProgress(tasks: ProjectMetadata["mvpTasks"]): string | null {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  const done = tasks.filter((task) => task.done).length;
  return `${done}/${tasks.length}`;
}

function buildActiveWarnings(
  projectHealthService: ProjectHealthService,
  project: ProjectMetadata,
  inactiveWarningDays: number,
  staleWarningDays: number
): WarningNode[] {
  const warnings: WarningNode[] = [];
  const inactivity = projectHealthService.getInactivityWarning(
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

function formatProjectType(type: string): string {
  switch (type) {
    case "blank":
      return "Blank";
    case "react-vite":
      return "React Vite";
    case "nextjs":
      return "Next.js";
    case "python":
      return "Python";
    default:
      return type;
  }
}
