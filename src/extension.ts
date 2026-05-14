import * as vscode from "vscode";
import { ProjectMetadata, ProjectStatus } from "./models/project";
import { ProjectCreationService } from "./services/projectCreationService";
import { ShipOneProjectsTreeDataProvider } from "./providers/shiponeProjectsTreeDataProvider";
import { ProjectStoreService } from "./services/projectStoreService";
import { SettingsService } from "./services/settingsService";

const COMMAND_SHOW_WELCOME = "shipone.showWelcome";
const COMMAND_CREATE_PROJECT = "shipone.createProject";
const COMMAND_OPEN_PROJECT_QUICK_PICK = "shipone.openProjectQuickPick";
const COMMAND_SEARCH_PROJECT = "shipone.searchProject";
const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_CHANGE_PROJECT_STATUS = "shipone.changeProjectStatus";
const COMMAND_EDIT_NEXT_ACTION = "shipone.editNextAction";
const COMMAND_CLEAR_NEXT_ACTION = "shipone.clearNextAction";
const COMMAND_OPEN_STATUS_FILE = "shipone.openStatusFile";
const COMMAND_TOGGLE_FAVORITE = "shipone.toggleFavorite";
const COMMAND_REFRESH_PROJECTS = "shipone.refreshProjects";
const STATUS_FILE_NAME = "STATUS.md";

const STATUS_PICKERS: Array<{ label: string; value: ProjectStatus }> = [
  { label: "Idea", value: "idea" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Finished", value: "finished" },
];

const PROJECT_TYPE_PICKERS: Array<{ label: string; value: string | null }> = [
  { label: "Todos", value: null },
  { label: "Blank", value: "blank" },
  { label: "React Vite", value: "react-vite" },
  { label: "Next.js", value: "nextjs" },
  { label: "Python", value: "python" },
];

export async function activate(context: vscode.ExtensionContext) {
  const settingsService = new SettingsService();
  const projectStore = new ProjectStoreService(context);
  const projectCreationService = new ProjectCreationService(projectStore);
  await projectStore.initialize();
  const treeDataProvider = new ShipOneProjectsTreeDataProvider(projectStore);

  const treeView = vscode.window.createTreeView("shipone.projectsView", {
    treeDataProvider,
  });

  const welcomeCommand = vscode.commands.registerCommand(COMMAND_SHOW_WELCOME, () => {
    const settings = settingsService.getSettings();

    vscode.window.showInformationMessage(`ShipOne listo. Ruta base: ${settings.projectsRoot}`);
  });

  const searchProjectCommand = vscode.commands.registerCommand(
    COMMAND_SEARCH_PROJECT,
    async () => {
      const projects = await projectStore.loadProjects();

      if (projects.length === 0) {
        vscode.window.showInformationMessage("Todavia no hay proyectos.");
        return;
      }

      const searchTerm = await vscode.window.showInputBox({
        title: "Buscar proyecto",
        prompt: "Escribe parte del nombre",
        placeHolder: "my-saas-app",
      });

      if (searchTerm === undefined) {
        return;
      }

      const filteredByName = filterProjectsByName(projects, searchTerm);

      const typeChoice = await vscode.window.showQuickPick(PROJECT_TYPE_PICKERS, {
        title: "Filtrar por tipo",
        placeHolder: "Elige un tipo o deja todo",
      });

      if (!typeChoice) {
        return;
      }

      const filteredByType = filterProjectsByType(filteredByName, typeChoice.value);

      if (filteredByType.length === 0) {
        vscode.window.showInformationMessage("No hay proyectos con esos filtros.");
        return;
      }

      const tagChoice = await vscode.window.showInputBox({
        title: "Filtrar por etiqueta",
        prompt: "Escribe una etiqueta o deja vacio",
        placeHolder: "frontend",
      });

      if (tagChoice === undefined) {
        return;
      }

      const filteredByTag = filterProjectsByTag(filteredByType, tagChoice);

      if (filteredByTag.length === 0) {
        vscode.window.showInformationMessage("No hay proyectos con esa etiqueta.");
        return;
      }

      const choice = await vscode.window.showQuickPick(
        filteredByTag.map((project) => ({
          label: project.favorite ? `★ ${project.name}` : project.name,
          description: `${project.status} · ${project.type}`,
          detail: buildProjectDetail(project),
          project,
        })),
        {
          title: "Buscar proyecto",
          placeHolder: "Elige un proyecto",
          matchOnDescription: true,
          matchOnDetail: true,
        }
      );

      if (!choice) {
        return;
      }

      await vscode.commands.executeCommand(COMMAND_OPEN_PROJECT, choice.project.id);
    }
  );

  const createProjectCommand = vscode.commands.registerCommand(
    COMMAND_CREATE_PROJECT,
    async () => {
      const settings = settingsService.getSettings();
      const project = await projectCreationService.createProject(settings);

      if (project) {
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(`Proyecto creado: ${project.name}`);
      }
    }
  );

  const openProjectQuickPickCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_PROJECT_QUICK_PICK,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      await vscode.commands.executeCommand(COMMAND_OPEN_PROJECT, project.id);
    }
  );

  const openProjectCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_PROJECT,
    async (projectId: string) => {
      const project = await projectStore.getProject(projectId);

      if (!project) {
        vscode.window.showErrorMessage("No se encontro el proyecto.");
        return;
      }

      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(project.path),
        false
      );
    }
  );

  const changeStatusCommand = vscode.commands.registerCommand(
    COMMAND_CHANGE_PROJECT_STATUS,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const statusChoice = await vscode.window.showQuickPick(STATUS_PICKERS, {
        title: "Estado",
        placeHolder: "Elige el nuevo estado",
      });

      if (!statusChoice) {
        return;
      }

      await projectStore.setProjectStatus(project.id, statusChoice.value);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`${project.name} ahora esta en ${statusChoice.label}.`);
    }
  );

  const editNextActionCommand = vscode.commands.registerCommand(
    COMMAND_EDIT_NEXT_ACTION,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const nextAction = await vscode.window.showInputBox({
        title: "Siguiente accion",
        prompt: "Que hay que hacer ahora",
        placeHolder: "Crear login",
        value: project.nextAction ?? "",
      });

      if (nextAction === undefined) {
        return;
      }

      await projectStore.setNextAction(project.id, nextAction.trim() ? nextAction.trim() : null);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Siguiente accion actualizada en ${project.name}.`);
    }
  );

  const clearNextActionCommand = vscode.commands.registerCommand(
    COMMAND_CLEAR_NEXT_ACTION,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      await projectStore.setNextAction(project.id, null);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Siguiente accion limpiada en ${project.name}.`);
    }
  );

  const openStatusFileCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_STATUS_FILE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const statusFileUri = vscode.Uri.joinPath(vscode.Uri.file(project.path), STATUS_FILE_NAME);

      try {
        const document = await vscode.workspace.openTextDocument(statusFileUri);
        await vscode.window.showTextDocument(document, { preview: false });
      } catch {
        vscode.window.showErrorMessage("No se pudo abrir STATUS.md.");
      }
    }
  );

  const toggleFavoriteCommand = vscode.commands.registerCommand(
    COMMAND_TOGGLE_FAVORITE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const wasFavorite = project.favorite;
      await projectStore.toggleFavorite(project.id);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        wasFavorite
          ? `Quitado de favoritos: ${project.name}.`
          : `Marcado como favorito: ${project.name}.`
      );
    }
  );

  const refreshCommand = vscode.commands.registerCommand(COMMAND_REFRESH_PROJECTS, () => {
    treeDataProvider.refresh();
  });

  context.subscriptions.push(
    treeView,
    welcomeCommand,
    openProjectQuickPickCommand,
    searchProjectCommand,
    createProjectCommand,
    openProjectCommand,
    changeStatusCommand,
    editNextActionCommand,
    clearNextActionCommand,
    openStatusFileCommand,
    toggleFavoriteCommand,
    refreshCommand
  );
}

async function pickProject(projectStore: ProjectStoreService) {
  const groupedProjects = await projectStore.getProjectsByStatus();
  const projects = Object.values(groupedProjects).flat();

  if (projects.length === 0) {
    vscode.window.showInformationMessage("Todavia no hay proyectos.");
    return undefined;
  }

  const choice = await vscode.window.showQuickPick(
    projects.map((project) => ({
      label: project.name,
      description: project.status,
      detail: project.path,
      project,
    })),
    {
      title: "Proyecto",
      placeHolder: "Elige un proyecto",
    }
  );

  return choice?.project;
}

function filterProjectsByName(projects: ProjectMetadata[], searchTerm: string) {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  if (!normalizedTerm) {
    return projects;
  }

  return projects.filter((project) => project.name.toLowerCase().includes(normalizedTerm));
}

function filterProjectsByType(projects: ProjectMetadata[], type: string | null) {
  if (!type) {
    return projects;
  }

  return projects.filter((project) => project.type === type);
}

function filterProjectsByTag(projects: ProjectMetadata[], tag: string) {
  const normalizedTag = tag.trim().toLowerCase();

  if (!normalizedTag) {
    return projects;
  }

  return projects.filter((project) =>
    (project.tags ?? []).some((projectTag) => projectTag.toLowerCase().includes(normalizedTag))
  );
}

function buildProjectDetail(project: {
  path: string;
  tags?: string[];
  nextAction?: string | null;
}): string {
  const parts = [project.path];

  if (project.tags && project.tags.length > 0) {
    parts.push(`Etiquetas: ${project.tags.join(", ")}`);
  }

  if (project.nextAction) {
    parts.push(`Siguiente: ${project.nextAction}`);
  }

  return parts.join(" · ");
}

export function deactivate() {}
