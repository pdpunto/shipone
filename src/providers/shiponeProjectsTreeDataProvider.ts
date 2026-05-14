import * as vscode from "vscode";
import { ProjectMetadata, ProjectStatus } from "../models/project";
import { ProjectStoreService } from "../services/projectStoreService";

type ShipOneTreeNode = GroupNode | ProjectNode | EmptyStateNode;

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

  constructor(private readonly projectStore: ProjectStoreService) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: ShipOneTreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ShipOneTreeNode): Promise<ShipOneTreeNode[]> {
    if (!element) {
      return GROUPS.map((group) => new GroupNode(group.status, group.label, group.icon));
    }

    if (element instanceof GroupNode) {
      const grouped = await this.projectStore.getProjectsByStatus();
      const projects = grouped[element.status];

      if (projects.length === 0) {
        return [new EmptyStateNode("Sin proyectos todavía")];
      }

      return projects.map((project) => new ProjectNode(project));
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

class ProjectNode extends vscode.TreeItem {
  constructor(project: ProjectMetadata) {
    super(project.name, vscode.TreeItemCollapsibleState.None);

    this.description = project.nextAction ?? undefined;
    this.tooltip = new vscode.MarkdownString(
      `**${project.name}**\n\nEstado: ${project.status}\nRuta: ${project.path}`
    );
    this.contextValue = "shipone.project";
    this.iconPath = new vscode.ThemeIcon(getStatusIcon(project.status));
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
