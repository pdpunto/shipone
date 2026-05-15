import * as vscode from "vscode";
import { ProjectMetadata } from "../models/project";
import { registerProjectCommands } from "../commands/projects/registerProjectCommands";
import { registerLaunchCommands } from "../commands/projects/registerLaunchCommands";
import { registerProjectOpsCommands } from "../commands/projects/registerProjectOpsCommands";
import { registerReviewCommands } from "../commands/projects/registerReviewCommands";
import { ProjectCreationService } from "../services/projectCreationService";
import { ProjectContextService } from "../services/projectContextService";
import { ProjectHealthService } from "../services/projectHealthService";
import { StatusFileService } from "../services/statusFileService";
import { TodoScannerService } from "../services/todoScannerService";
import { ShipOneProjectsTreeDataProvider } from "../providers/shiponeProjectsTreeDataProvider";
import { ProjectHealthRenderer } from "../providers/projectHealthRenderer";
import { TreeIconProvider } from "../providers/treeIconProvider";
import { TreeTooltipProvider } from "../providers/treeTooltipProvider";
import { ProjectStoreService } from "../services/projectStoreService";
import { SettingsService } from "../services/settingsService";
import { showFirstRunOnboarding } from "../onboarding/showFirstRunOnboarding";
import { t } from "../localization";

const COMMAND_SHOW_WELCOME = "shipone.showWelcome";
const COMMAND_REFRESH_PROJECTS = "shipone.refreshProjects";
const FOCUS_MODE_CONTEXT_KEY = "shipone.focusMode";
const FOCUS_MODE_STATE_KEY = "shipone.focusMode";

export class ShipOneApp {
  private readonly settingsService = new SettingsService();
  private readonly projectStore: ProjectStoreService;
  private readonly projectContextService = new ProjectContextService();
  private readonly projectHealthService = new ProjectHealthService();
  private readonly treeIconProvider = new TreeIconProvider();
  private readonly treeTooltipProvider = new TreeTooltipProvider();
  private readonly healthRenderer = new ProjectHealthRenderer();
  private readonly statusFileService = new StatusFileService();
  private readonly todoScannerService = new TodoScannerService();
  private readonly projectCreationService: ProjectCreationService;

  private treeDataProvider: ShipOneProjectsTreeDataProvider | undefined;
  private focusModeEnabled = false;
  private selectedProjectId: string | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.projectStore = new ProjectStoreService(context);
    this.projectCreationService = new ProjectCreationService(
      this.projectStore,
      this.statusFileService,
      this.projectContextService
    );
  }

  async init(): Promise<vscode.Disposable[]> {
    await this.projectStore.initialize();
    this.focusModeEnabled = this.context.workspaceState.get<boolean>(
      FOCUS_MODE_STATE_KEY,
      false
    );

    await vscode.commands.executeCommand(
      "setContext",
      FOCUS_MODE_CONTEXT_KEY,
      this.focusModeEnabled
    );

    this.treeDataProvider = new ShipOneProjectsTreeDataProvider(
      this.projectStore,
      this.settingsService,
      this.projectHealthService,
      this.treeIconProvider,
      this.treeTooltipProvider,
      this.healthRenderer,
      () => this.focusModeEnabled
    );

    const treeView = vscode.window.createTreeView("shipone.projectsView", {
      treeDataProvider: this.treeDataProvider,
    });

    treeView.onDidChangeSelection((event) => {
      const selected = event.selection[0] as unknown;
      if (selected && typeof selected === "object" && "project" in selected) {
        const project = (selected as { project?: ProjectMetadata }).project;
        this.selectedProjectId = project?.id;
      } else {
        this.selectedProjectId = undefined;
      }
    });

    const configurationWatcher = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration("shipone")) {
          this.treeDataProvider?.refresh();
        }
      }
    );

    void showFirstRunOnboarding(this.context, this.settingsService);

    const welcomeCommand = vscode.commands.registerCommand(
      COMMAND_SHOW_WELCOME,
      () => {
        const settings = this.settingsService.getSettings();
        vscode.window.showInformationMessage(
          t("ShipOne listo. Ruta base: {0}", settings.projectsRoot)
        );
      }
    );

    const projectCommands = registerProjectCommands({
      context: this.context,
      projectStore: this.projectStore,
      settingsService: this.settingsService,
      treeDataProvider: this.treeDataProvider,
      getSelectedProjectId: () => this.selectedProjectId,
    });

    const launchCommands = registerLaunchCommands({
      context: this.context,
      settingsService: this.settingsService,
      projectStore: this.projectStore,
      projectCreationService: this.projectCreationService,
      treeRefresh: () => this.treeDataProvider?.refresh(),
    });

    const projectOpsCommands = registerProjectOpsCommands({
      projectStore: this.projectStore,
      projectCreationService: this.projectCreationService,
      statusFileService: this.statusFileService,
      projectContextService: this.projectContextService,
      treeRefresh: () => this.treeDataProvider?.refresh(),
    });

    const reviewCommands = registerReviewCommands({
      projectStore: this.projectStore,
      settingsService: this.settingsService,
      projectCreationService: this.projectCreationService,
      todoScannerService: this.todoScannerService,
      treeRefresh: () => this.treeDataProvider?.refresh(),
      setFocusMode: (enabled: boolean) => this.setFocusMode(enabled),
    });

    const refreshCommand = vscode.commands.registerCommand(
      COMMAND_REFRESH_PROJECTS,
      () => {
        this.treeDataProvider?.refresh();
      }
    );

    return [
      treeView,
      configurationWatcher,
      welcomeCommand,
      ...projectOpsCommands,
      ...reviewCommands,
      ...launchCommands,
      ...projectCommands,
      refreshCommand,
    ];
  }

  private async setFocusMode(enabled: boolean): Promise<void> {
    this.focusModeEnabled = enabled;
    await this.context.workspaceState.update(FOCUS_MODE_STATE_KEY, enabled);
    await vscode.commands.executeCommand(
      "setContext",
      FOCUS_MODE_CONTEXT_KEY,
      enabled
    );
    this.treeDataProvider?.refresh();
  }
}
