import * as vscode from "vscode";
import { t } from "../../localization";
import { ProjectCreationService } from "../../services/projectCreationService";
import { ProjectStoreService } from "../../services/projectStoreService";
import { SettingsService } from "../../services/settingsService";
import {
  buildProjectDetail,
  filterProjectsByName,
  filterProjectsByTag,
  filterProjectsByType,
} from "../../utils/projectSearch";

const COMMAND_CREATE_PROJECT = "shipone.createProject";
const COMMAND_CREATE_SAMPLE_IDEA = "shipone.createSampleIdea";
const COMMAND_SET_PROJECTS_ROOT = "shipone.setProjectsRoot";
const COMMAND_OPEN_PROJECTS_ROOT = "shipone.openProjectsRoot";
const COMMAND_OPEN_PROJECT_QUICK_PICK = "shipone.openProjectQuickPick";
const COMMAND_SEARCH_PROJECT = "shipone.searchProject";
const COMMAND_OPEN_PROJECT = "shipone.openProject";

const PROJECT_TYPE_PICKERS: Array<{ label: string; value: string | null }> = [
  { label: t("Todos"), value: null },
  { label: t("Blank"), value: "blank" },
  { label: t("React Vite"), value: "react-vite" },
  { label: t("Next.js"), value: "nextjs" },
  { label: t("Python"), value: "python" },
];

export function registerLaunchCommands(options: {
  context: vscode.ExtensionContext;
  settingsService: SettingsService;
  projectStore: ProjectStoreService;
  projectCreationService: ProjectCreationService;
  treeRefresh: () => void;
}): vscode.Disposable[] {
  const { settingsService, projectStore, projectCreationService, treeRefresh } =
    options;

  const setProjectsRootCommand = vscode.commands.registerCommand(
    COMMAND_SET_PROJECTS_ROOT,
    async () => {
      const settings = settingsService.getSettings();
      const picked = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(settings.projectsRoot),
        title: t("Elegir carpeta base"),
        openLabel: t("Usar carpeta"),
      });

      const folder = picked?.[0];
      if (!folder) {
        return;
      }

      await vscode.workspace
        .getConfiguration("shipone")
        .update(
          "projectsRoot",
          folder.fsPath,
          vscode.ConfigurationTarget.Global
        );
      treeRefresh();
      vscode.window.showInformationMessage(
        t("Carpeta base actualizada: {0}", folder.fsPath)
      );
    }
  );

  const openProjectsRootCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_PROJECTS_ROOT,
    async () => {
      const settings = settingsService.getSettings();
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(settings.projectsRoot),
        false
      );
    }
  );

  const searchProjectCommand = vscode.commands.registerCommand(
    COMMAND_SEARCH_PROJECT,
    async () => {
      const projects = await projectStore.loadProjects();

      if (projects.length === 0) {
        vscode.window.showInformationMessage(t("Todavia no hay proyectos."));
        return;
      }

      const searchTerm = await vscode.window.showInputBox({
        title: t("Buscar proyecto"),
        prompt: t("Escribe parte del nombre"),
        placeHolder: t("my-saas-app"),
      });

      if (searchTerm === undefined) {
        return;
      }

      const filteredByName = filterProjectsByName(projects, searchTerm);

      const typeChoice = await vscode.window.showQuickPick(
        PROJECT_TYPE_PICKERS,
        {
          title: t("Filtrar por tipo"),
          placeHolder: t("Elige un tipo o deja todo"),
        }
      );

      if (!typeChoice) {
        return;
      }

      const filteredByType = filterProjectsByType(
        filteredByName,
        typeChoice.value
      );

      if (filteredByType.length === 0) {
        vscode.window.showInformationMessage(
          t("No hay proyectos con esos filtros.")
        );
        return;
      }

      const tagChoice = await vscode.window.showInputBox({
        title: t("Filtrar por etiqueta"),
        prompt: t("Escribe una etiqueta o deja vacio"),
        placeHolder: t("frontend"),
      });

      if (tagChoice === undefined) {
        return;
      }

      const filteredByTag = filterProjectsByTag(filteredByType, tagChoice);

      if (filteredByTag.length === 0) {
        vscode.window.showInformationMessage(
          t("No hay proyectos con esa etiqueta.")
        );
        return;
      }

      const choice = await vscode.window.showQuickPick(
        filteredByTag.map((project) => ({
          label: project.favorite ? `★ ${project.name}` : project.name,
          description: t("{0} · {1}", project.status, project.type),
          detail: buildProjectDetail(project),
          project,
        })),
        {
          title: t("Buscar proyecto"),
          placeHolder: t("Elige un proyecto"),
          matchOnDescription: true,
          matchOnDetail: true,
        }
      );

      if (!choice) {
        return;
      }

      await vscode.commands.executeCommand(
        COMMAND_OPEN_PROJECT,
        choice.project.id
      );
    }
  );

  const createProjectCommand = vscode.commands.registerCommand(
    COMMAND_CREATE_PROJECT,
    async () => {
      const project = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t("ShipOne: creando proyecto"),
          cancellable: false,
        },
        async () => {
          const settings = settingsService.getSettings();
          return projectCreationService.createProject(settings);
        }
      );

      if (project) {
        treeRefresh();
        vscode.window.showInformationMessage(
          t("Proyecto creado: {0}. Ya lo tienes en ShipOne.", project.name)
        );
      }
    }
  );

  const createSampleIdeaCommand = vscode.commands.registerCommand(
    COMMAND_CREATE_SAMPLE_IDEA,
    async () => {
      const project = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t("ShipOne: creando idea de ejemplo"),
          cancellable: false,
        },
        async () => {
          const settings = settingsService.getSettings();
          return projectCreationService.createSampleIdea(settings);
        }
      );

      if (project) {
        treeRefresh();
        vscode.window.showInformationMessage(
          t("Idea creada: {0}. Ya la tienes en ShipOne.", project.name)
        );
      }
    }
  );

  const openProjectQuickPickCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_PROJECT_QUICK_PICK,
    async () => {
      const projects = await projectStore.loadProjects();

      if (projects.length === 0) {
        vscode.window.showInformationMessage(t("Todavia no hay proyectos."));
        return;
      }

      const choice = await vscode.window.showQuickPick(
        projects.map((project) => ({
          label: project.name,
          description: project.status,
          detail: buildProjectDetail(project),
          project,
        })),
        {
          title: t("Abrir proyecto"),
          placeHolder: t("Elige un proyecto"),
          matchOnDescription: true,
          matchOnDetail: true,
        }
      );

      if (!choice) {
        return;
      }

      await vscode.commands.executeCommand(
        COMMAND_OPEN_PROJECT,
        choice.project.id
      );
    }
  );

  return [
    setProjectsRootCommand,
    openProjectsRootCommand,
    searchProjectCommand,
    createProjectCommand,
    createSampleIdeaCommand,
    openProjectQuickPickCommand,
  ];
}
