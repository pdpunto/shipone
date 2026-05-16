import * as vscode from "vscode";
import type { SettingsService } from "../services/settingsService";
import type { ProjectStoreService } from "../services/projectStoreService";
import type { ProjectHealthService } from "../services/projectHealthService";
import {
  TreeRendererService,
  type ShipOneTreeNode,
} from "./treeRendererService";
import type { ProjectHealthRenderer } from "./projectHealthRenderer";
import type { TreeIconProvider } from "./treeIconProvider";
import type { TreeTooltipProvider } from "./treeTooltipProvider";
import { MetricsNode } from "./treeNodes/metricsNode";
import { GroupNode } from "./treeNodes/groupNode";

export class ShipOneProjectsTreeDataProvider implements vscode.TreeDataProvider<ShipOneTreeNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void>();
  private refreshQueued = false;

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly settingsService: SettingsService,
    private readonly projectHealthService: ProjectHealthService,
    private readonly iconProvider: TreeIconProvider,
    private readonly tooltipProvider: TreeTooltipProvider,
    private readonly healthRenderer: ProjectHealthRenderer,
    private readonly isFocusModeEnabled: () => boolean
  ) {}

  refresh(): void {
    this.projectHealthService.clearCache();
    if (this.refreshQueued) {
      return;
    }

    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      this.onDidChangeTreeDataEmitter.fire();
    });
  }

  getTreeItem(element: ShipOneTreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ShipOneTreeNode): Promise<ShipOneTreeNode[]> {
    // Construimos el renderer por llamada para mantener el provider fino y sin estado propio extra.
    const renderer = new TreeRendererService(
      this.projectStore,
      this.settingsService,
      this.projectHealthService,
      this.iconProvider,
      this.tooltipProvider,
      this.healthRenderer
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
