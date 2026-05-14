import * as vscode from "vscode";
import { SettingsService } from "../services/settingsService";
import { ProjectStoreService } from "../services/projectStoreService";
import { ProjectHealthService } from "../services/projectHealthService";
import { ProjectStatus } from "../models/project";
import { TreeRendererService, type ShipOneTreeNode } from "./treeRendererService";
import { MetricsNode } from "./treeNodes/metricsNode";
import { GroupNode } from "./treeNodes/groupNode";

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
    const renderer = new TreeRendererService(
      this.projectStore,
      this.settingsService,
      this.projectHealthService
    );

    if (!element) {
      return renderer.getRootNodes(this.isFocusModeEnabled());
    }

    if (element instanceof MetricsNode) {
      return renderer.getMetricsNodes();
    }

    if (element instanceof GroupNode) {
      return renderer.getGroupNodes(element.status);
    }

    return [];
  }
}
