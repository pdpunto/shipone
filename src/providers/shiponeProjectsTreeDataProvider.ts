import * as vscode from "vscode";
import { execFile } from "child_process";
import { promisify } from "util";
import { ProjectMetadata, ProjectStatus } from "../models/project";
import { SettingsService } from "../services/settingsService";
import { ProjectStoreService } from "../services/projectStoreService";

type ShipOneTreeNode = MetricsNode | MetricItemNode | GroupNode | ProjectNode | EmptyStateNode;

type ProjectHealth = {
  label: string;
  issues: string[];
};

const execFileAsync = promisify(execFile);

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
        const health = await buildProjectHealth(
          activeProject,
          settings.inactiveWarningDays,
          settings.staleWarningDays
        );

        return [
          new FocusNode(activeProject, health),
          new GroupNode("active", "Active", "play"),
        ];
      }

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

      return Promise.all(
        projects.map(async (project) => {
          const health = await buildProjectHealth(
            project,
            settings.inactiveWarningDays,
            settings.staleWarningDays
          );

          return new ProjectNode(
            project,
            health,
            settings.inactiveWarningDays,
            settings.staleWarningDays
          );
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

class ProjectNode extends vscode.TreeItem {
  constructor(
    project: ProjectMetadata,
    health: ProjectHealth,
    inactiveWarningDays: number,
    staleWarningDays: number
  ) {
    super(project.name, vscode.TreeItemCollapsibleState.None);

    const warning = getInactivityWarning(
      project.lastOpenedAt,
      inactiveWarningDays,
      staleWarningDays
    );
    const mvpProgress = getMvpProgress(project.mvpTasks);
    const projectType = formatProjectType(project.type);

    this.description = [
      projectType,
      project.nextAction ? `next: ${project.nextAction}` : undefined,
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

function getMvpProgress(tasks: ProjectMetadata["mvpTasks"]): string | null {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  const done = tasks.filter((task) => task.done).length;
  return `${done}/${tasks.length}`;
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

async function buildProjectHealth(
  project: ProjectMetadata,
  inactiveWarningDays: number,
  staleWarningDays: number
): Promise<ProjectHealth> {
  const issues: string[] = [];
  const warning = getInactivityWarning(project.lastOpenedAt, inactiveWarningDays, staleWarningDays);

  if (!project.nextAction) {
    issues.push("missing-next-action");
  }

  if (project.status === "active" && warning) {
    issues.push("inactive-active");
  }

  const hasReadme = await pathExists(vscode.Uri.joinPath(vscode.Uri.file(project.path), "README.md"));
  if (!hasReadme) {
    issues.push("no-readme");
  }

  const hasRecentCommits = await hasRecentGitCommit(project.path);
  if (!hasRecentCommits) {
    issues.push("no-recent-commits");
  }

  if (issues.length === 0) {
    return { label: "healthy", issues };
  }

  if (issues.length <= 2) {
    return { label: "warning", issues };
  }

  return { label: "bad", issues };
}

async function hasRecentGitCommit(projectPath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("git", ["log", "-1", "--format=%ct"], {
      cwd: projectPath,
    });

    const timestamp = Number(stdout.trim());
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return false;
    }

    const ageDays = Math.floor((Date.now() - timestamp * 1000) / 86_400_000);
    return ageDays <= 30;
  } catch {
    return false;
  }
}

async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
