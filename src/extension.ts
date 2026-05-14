import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { ProjectMetadata, ProjectStatus } from "./models/project";
import { ShipOneSettings } from "./models/settings";
import { ProjectCreationService } from "./services/projectCreationService";
import { ShipOneProjectsTreeDataProvider } from "./providers/shiponeProjectsTreeDataProvider";
import { ProjectStoreService } from "./services/projectStoreService";
import { SettingsService } from "./services/settingsService";

const COMMAND_SHOW_WELCOME = "shipone.showWelcome";
const COMMAND_CREATE_PROJECT = "shipone.createProject";
const COMMAND_CREATE_SAMPLE_IDEA = "shipone.createSampleIdea";
const COMMAND_OPEN_PROJECTS_ROOT = "shipone.openProjectsRoot";
const COMMAND_OPEN_PROJECT_QUICK_PICK = "shipone.openProjectQuickPick";
const COMMAND_EDIT_MVP_CHECKLIST = "shipone.editMvpChecklist";
const COMMAND_MARK_MVP_ITEM_DONE = "shipone.markMvpItemDone";
const COMMAND_SYNC_STATUS_FILE = "shipone.syncStatusFile";
const COMMAND_CONNECT_GITHUB = "shipone.connectGithub";
const COMMAND_DETECT_BLOCKERS = "shipone.detectBlockers";
const COMMAND_FOCUS_MODE = "shipone.focusMode";
const COMMAND_EXIT_FOCUS_MODE = "shipone.exitFocusMode";
const COMMAND_WEEKLY_REVIEW = "shipone.weeklyReview";
const COMMAND_FREEZE_PROJECT = "shipone.freezeProject";
const COMMAND_RESUME_PROJECT = "shipone.resumeProject";
const COMMAND_SEARCH_PROJECT = "shipone.searchProject";
const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_CHANGE_PROJECT_STATUS = "shipone.changeProjectStatus";
const COMMAND_MARK_PROJECT_IDEA = "shipone.markProjectIdea";
const COMMAND_MARK_PROJECT_ACTIVE = "shipone.markProjectActive";
const COMMAND_MARK_PROJECT_PAUSED = "shipone.markProjectPaused";
const COMMAND_MARK_PROJECT_FINISHED = "shipone.markProjectFinished";
const COMMAND_EDIT_NEXT_ACTION = "shipone.editNextAction";
const COMMAND_CLEAR_NEXT_ACTION = "shipone.clearNextAction";
const COMMAND_OPEN_STATUS_FILE = "shipone.openStatusFile";
const COMMAND_TOGGLE_FAVORITE = "shipone.toggleFavorite";
const COMMAND_REFRESH_PROJECTS = "shipone.refreshProjects";
const STATUS_FILE_NAME = "STATUS.md";
const FOCUS_MODE_CONTEXT_KEY = "shipone.focusMode";
const FOCUS_MODE_STATE_KEY = "shipone.focusMode";

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
  let focusModeEnabled = context.workspaceState.get<boolean>(FOCUS_MODE_STATE_KEY, false);
  let selectedProjectId: string | undefined;
  await vscode.commands.executeCommand("setContext", FOCUS_MODE_CONTEXT_KEY, focusModeEnabled);
  const treeDataProvider = new ShipOneProjectsTreeDataProvider(
    projectStore,
    settingsService,
    () => focusModeEnabled
  );

  const treeView = vscode.window.createTreeView("shipone.projectsView", {
    treeDataProvider,
  });
  treeView.onDidChangeSelection((event) => {
    const selected = event.selection[0] as unknown;
    if (selected && typeof selected === "object" && "project" in selected) {
      const project = (selected as { project?: ProjectMetadata }).project;
      selectedProjectId = project?.id;
    } else {
      selectedProjectId = undefined;
    }
  });
  const configurationWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("shipone")) {
      treeDataProvider.refresh();
    }
  });

  void showFirstRunOnboarding(context, settingsService);

  const setFocusMode = async (enabled: boolean) => {
    focusModeEnabled = enabled;
    await context.workspaceState.update(FOCUS_MODE_STATE_KEY, enabled);
    await vscode.commands.executeCommand("setContext", FOCUS_MODE_CONTEXT_KEY, enabled);
    treeDataProvider.refresh();
  };

  const welcomeCommand = vscode.commands.registerCommand(COMMAND_SHOW_WELCOME, () => {
    const settings = settingsService.getSettings();

    vscode.window.showInformationMessage(`ShipOne listo. Ruta base: ${settings.projectsRoot}`);
  });

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
      const project = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "ShipOne: creando proyecto",
          cancellable: false,
        },
        async () => {
          const settings = settingsService.getSettings();
          return projectCreationService.createProject(settings);
        }
      );

      if (project) {
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          `Proyecto creado: ${project.name}. Ya lo tienes en ShipOne.`
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
          title: "ShipOne: creando idea de ejemplo",
          cancellable: false,
        },
        async () => {
          const settings = settingsService.getSettings();
          return projectCreationService.createSampleIdea(settings);
        }
      );

      if (project) {
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          `Idea creada: ${project.name}. Ya la tienes en ShipOne.`
        );
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

  const editMvpChecklistCommand = vscode.commands.registerCommand(
    COMMAND_EDIT_MVP_CHECKLIST,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const currentTasks = project.mvpTasks ?? [];
      const currentValue = currentTasks.map((task) => task.text).join(", ");
      const rawValue = await vscode.window.showInputBox({
        title: "Checklist MVP",
        prompt: "Separa tareas con coma",
        placeHolder: "Login, Dashboard, Deploy",
        value: currentValue,
      });

      if (rawValue === undefined) {
        return;
      }

      const nextTasks = parseMvpTasks(rawValue, currentTasks);
      await projectStore.setMvpTasks(project.id, nextTasks);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Checklist MVP actualizada en ${project.name}.`);
    }
  );

  const markMvpItemDoneCommand = vscode.commands.registerCommand(
    COMMAND_MARK_MVP_ITEM_DONE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const tasks = (project.mvpTasks ?? []).filter((task) => !task.done);
      if (tasks.length === 0) {
        vscode.window.showInformationMessage("No hay tareas MVP pendientes.");
        return;
      }

      const choice = await vscode.window.showQuickPick(
        tasks.map((task) => ({
          label: task.text,
          description: "Pendiente",
          task,
        })),
        {
          title: "Marcar tarea MVP hecha",
          placeHolder: "Elige una tarea",
        }
      );

      if (!choice) {
        return;
      }

      await projectStore.markMvpTaskDone(project.id, choice.task.id);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Tarea MVP marcada en ${project.name}.`);
    }
  );

  const syncStatusFileCommand = vscode.commands.registerCommand(
    COMMAND_SYNC_STATUS_FILE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const statusFileUri = vscode.Uri.joinPath(vscode.Uri.file(project.path), STATUS_FILE_NAME);
      const content = buildStatusFileContent(project);
      await vscode.workspace.fs.writeFile(statusFileUri, new TextEncoder().encode(content));
      vscode.window.showInformationMessage(`STATUS.md sincronizado en ${project.name}.`);
    }
  );

  const connectGithubCommand = vscode.commands.registerCommand(
    COMMAND_CONNECT_GITHUB,
    async () => {
      await projectCreationService.connectGithub();
    }
  );

  const detectBlockersCommand = vscode.commands.registerCommand(
    COMMAND_DETECT_BLOCKERS,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const blockers = await readStatusBlockers(project.path);

      if (blockers.length === 0) {
        vscode.window.showInformationMessage(`Sin bloqueadores en ${project.name}.`);
        return;
      }

      vscode.window.showWarningMessage(
        `${project.name}: ${blockers.join(" | ")}`
      );
    }
  );

  const focusModeCommand = vscode.commands.registerCommand(COMMAND_FOCUS_MODE, async () => {
    await setFocusMode(true);
    vscode.window.showInformationMessage("Focus mode activado.");
  });

  const exitFocusModeCommand = vscode.commands.registerCommand(COMMAND_EXIT_FOCUS_MODE, async () => {
    await setFocusMode(false);
    vscode.window.showInformationMessage("Focus mode desactivado.");
  });

  const weeklyReviewCommand = vscode.commands.registerCommand(
    COMMAND_WEEKLY_REVIEW,
    async () => {
      const projects = await projectStore.loadProjects();
      const summary = buildWeeklyReviewSummary(projects);

      const activeProject = projects.find((project) => project.status === "active");
      const pausedProjects = projects.filter((project) => project.status === "paused");
      const finishedThisWeek = getFinishedThisWeek(projects);

      const summaryLines = [
        `Activo: ${summary.active ? summary.active.name : "ninguno"}`,
        `Pausados: ${pausedProjects.length}`,
        `Terminados esta semana: ${finishedThisWeek.length}`,
      ];

      if (activeProject) {
        const actions = ["Ver activo", "Salir"];
        const choice = await vscode.window.showInformationMessage(
          summaryLines.join(" | "),
          ...actions
        );

        if (choice === "Salir") {
          return;
        }

        await vscode.commands.executeCommand(COMMAND_OPEN_PROJECT, activeProject.id);
      } else {
        vscode.window.showInformationMessage(summaryLines.join(" | "));
      }

      if (activeProject && !activeProject.nextAction) {
        const nextAction = await vscode.window.showInputBox({
          title: "Weekly review",
          prompt: "Siguiente accion para el proyecto activo",
          placeHolder: "Terminar login",
        });

        if (nextAction !== undefined) {
          await projectStore.setNextAction(
            activeProject.id,
            nextAction.trim() ? nextAction.trim() : null
          );
          treeDataProvider.refresh();
        }
      }

      if (activeProject && isStaleProject(activeProject)) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: "Mantener activo", value: "keep" },
            { label: "Pasar a pausado", value: "pause" },
            { label: "Marcar terminado", value: "finish" },
          ],
          {
            title: "Proyecto activo viejo",
            placeHolder: "Que hacemos con este proyecto",
          }
        );

        if (choice?.value === "pause") {
          await projectStore.setProjectStatus(activeProject.id, "paused");
          treeDataProvider.refresh();
        } else if (choice?.value === "finish") {
          await projectStore.setProjectStatus(activeProject.id, "finished");
          treeDataProvider.refresh();
        }
      }

      if (pausedProjects.length > 0) {
        vscode.window.showInformationMessage(
          `Pausados: ${pausedProjects.map((project) => project.name).join(", ")}`
        );
      }

      if (finishedThisWeek.length > 0) {
        vscode.window.showInformationMessage(
          `Terminados esta semana: ${finishedThisWeek.map((project) => project.name).join(", ")}`
        );
      }
    }
  );

  const freezeProjectCommand = vscode.commands.registerCommand(
    COMMAND_FREEZE_PROJECT,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const reason = await vscode.window.showInputBox({
        title: "Congelar proyecto",
        prompt: "Motivo de la pausa",
        placeHolder: "Esperando feedback",
      });

      if (reason === undefined || !reason.trim()) {
        return;
      }

      const nextAction = await vscode.window.showInputBox({
        title: "Siguiente accion",
        prompt: "Que haras al volver",
        placeHolder: "Revisar login",
        value: project.nextAction ?? "",
      });

      if (nextAction === undefined) {
        return;
      }

      const note = await vscode.window.showInputBox({
        title: "Nota de pausa",
        prompt: "Nota corta para recordar contexto",
        placeHolder: "Bloqueado por dependencias externas",
        value: project.pauseNote ?? "",
      });

      if (note === undefined) {
        return;
      }

      await projectStore.freezeProject(
        project.id,
        reason.trim(),
        nextAction.trim() ? nextAction.trim() : null,
        note.trim()
      );
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Proyecto congelado: ${project.name}.`);
    }
  );

  const resumeProjectCommand = vscode.commands.registerCommand(
    COMMAND_RESUME_PROJECT,
    async () => {
      const settings = settingsService.getSettings();
      const projects = await projectStore.loadProjects();
      const pausedProjects = projects.filter((project) => project.status === "paused");

      if (pausedProjects.length === 0) {
        vscode.window.showInformationMessage("No hay proyectos pausados.");
        return;
      }

      const choice = await vscode.window.showQuickPick(
        pausedProjects.map((project) => ({
          label: project.name,
          description: project.pauseReason ?? project.nextAction ?? "Pausado",
          detail: project.pauseNote ?? project.path,
          project,
        })),
        {
          title: "Reanudar proyecto",
          placeHolder: "Elige un proyecto pausado",
        }
      );

      if (!choice) {
        return;
      }

      await updateProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        choice.project,
        "active",
        "Active"
      );
      vscode.window.showInformationMessage(`Proyecto reanudado: ${choice.project.name}.`);
    }
  );

  const openProjectCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_PROJECT,
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, selectedProjectId);

      if (!project) {
        vscode.window.showErrorMessage("No se encontro el proyecto.");
        return;
      }

      await projectStore.markProjectOpened(project.id);
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(project.path),
        false
      );
    }
  );

  const changeStatusCommand = vscode.commands.registerCommand(
    COMMAND_CHANGE_PROJECT_STATUS,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      const project = await resolveProject(projectStore, projectArg, selectedProjectId);

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

      await updateProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        project,
        statusChoice.value,
        statusChoice.label
      );
    }
  );

  const markProjectIdeaCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_IDEA,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "idea",
        projectArg,
        selectedProjectId
      );
    }
  );

  const markProjectActiveCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_ACTIVE,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "active",
        projectArg,
        selectedProjectId
      );
    }
  );

  const markProjectPausedCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_PAUSED,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "paused",
        projectArg,
        selectedProjectId
      );
    }
  );

  const markProjectFinishedCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_FINISHED,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "finished",
        projectArg,
        selectedProjectId
      );
    }
  );

  const editNextActionCommand = vscode.commands.registerCommand(
    COMMAND_EDIT_NEXT_ACTION,
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, selectedProjectId);

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
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, selectedProjectId);

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
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, selectedProjectId);

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
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, selectedProjectId);

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
    configurationWatcher,
    welcomeCommand,
    openProjectsRootCommand,
    openProjectQuickPickCommand,
    editMvpChecklistCommand,
    markMvpItemDoneCommand,
    syncStatusFileCommand,
    connectGithubCommand,
    detectBlockersCommand,
    focusModeCommand,
    exitFocusModeCommand,
    weeklyReviewCommand,
    freezeProjectCommand,
    resumeProjectCommand,
    searchProjectCommand,
    createProjectCommand,
    createSampleIdeaCommand,
    openProjectCommand,
    changeStatusCommand,
    markProjectIdeaCommand,
    markProjectActiveCommand,
    markProjectPausedCommand,
    markProjectFinishedCommand,
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

async function markProjectStatus(
  projectStore: ProjectStoreService,
  treeDataProvider: ShipOneProjectsTreeDataProvider,
  settings: ShipOneSettings,
  status: ProjectStatus,
  projectArg?: unknown,
  selectedProjectId?: string
) {
  const project = await resolveProject(projectStore, projectArg, selectedProjectId);

  if (!project) {
    return;
  }

  await updateProjectStatus(projectStore, treeDataProvider, settings, project, status, status);
}

async function resolveProject(
  projectStore: ProjectStoreService,
  projectArg?: unknown,
  selectedProjectId?: string
): Promise<ProjectMetadata | undefined> {
  if (typeof projectArg === "string") {
    const projectById = await projectStore.getProject(projectArg);
    if (projectById) {
      return projectById;
    }
  }

  const directProject = unwrapProjectArg(projectArg);

  if (directProject) {
    return directProject;
  }

  if (selectedProjectId) {
    const selectedProject = await projectStore.getProject(selectedProjectId);
    if (selectedProject) {
      return selectedProject;
    }
  }

  return pickProject(projectStore);
}

function unwrapProjectArg(projectArg?: unknown): ProjectMetadata | undefined {
  if (!projectArg) {
    return undefined;
  }

  if (typeof projectArg === "string") {
    return undefined;
  }

  if (typeof projectArg !== "object") {
    return undefined;
  }

  const candidate = projectArg as { project?: ProjectMetadata };

  if (candidate.project) {
    return candidate.project;
  }

  return undefined;
}

async function updateProjectStatus(
  projectStore: ProjectStoreService,
  treeDataProvider: ShipOneProjectsTreeDataProvider,
  settings: ShipOneSettings,
  project: ProjectMetadata,
  status: ProjectStatus,
  statusLabel: string
) {
  if (status === "active") {
    if (!settings.enforceOneActiveProject) {
      await projectStore.setProjectStatus(project.id, status, false);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`${project.name} ahora esta en ${statusLabel}.`);
      return;
    }

    const projects = await projectStore.loadProjects();
    const otherActive = projects.find(
      (item) => item.status === "active" && item.id !== project.id
    );

    if (otherActive) {
      const choice = await vscode.window.showWarningMessage(
        `Ya hay un proyecto activo: ${otherActive.name}.`,
        "Pausar y activar",
        "Cancelar"
      );

      if (choice !== "Pausar y activar") {
        return;
      }
    }
  }

  await projectStore.setProjectStatus(project.id, status, settings.enforceOneActiveProject);
  treeDataProvider.refresh();
  vscode.window.showInformationMessage(`${project.name} ahora esta en ${statusLabel}.`);
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

function parseMvpTasks(rawValue: string, currentTasks: NonNullable<ProjectMetadata["mvpTasks"]>) {
  const existingByText = new Map(
    currentTasks.map((task) => [task.text.trim().toLowerCase(), task])
  );

  return rawValue
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((text) => {
      const existing = existingByText.get(text.toLowerCase());

      return {
        id: existing?.id ?? randomUUID(),
        text,
        done: existing?.done ?? false,
      };
    });
}

function buildStatusFileContent(project: ProjectMetadata): string {
  const tasks = project.mvpTasks ?? [];
  const mvpLines = tasks.length
    ? tasks.map((task) => `- [${task.done ? "x" : " "}] ${task.text}`)
    : ["- [ ]", "- [ ]", "- [ ]"];

  return [
    "# Estado actual",
    "",
    "## Objetivo",
    project.description || "Describe el objetivo principal aqui.",
    "",
    "## MVP",
    ...mvpLines,
    "",
    "## Proximo paso",
    project.nextAction || "Define el siguiente paso aqui.",
    "",
    "## Bloqueos",
    "- Ninguno por ahora",
    "",
    "## Proyecto",
    project.name,
    "",
    "## Actualizado",
    new Date().toISOString().slice(0, 10),
    "",
  ].join("\n");
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

function buildWeeklyReviewSummary(projects: ProjectMetadata[]) {
  return {
    active: projects.find((project) => project.status === "active") ?? null,
  };
}

async function readStatusBlockers(projectPath: string): Promise<string[]> {
  try {
    const statusFileUri = vscode.Uri.joinPath(vscode.Uri.file(projectPath), STATUS_FILE_NAME);
    const raw = await vscode.workspace.fs.readFile(statusFileUri);
    const text = new TextDecoder().decode(raw);
    const lines = text.split(/\r?\n/);

    const blockers: string[] = [];
    let inBlockers = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (/^##\s+Bloqueos$/i.test(trimmed)) {
        inBlockers = true;
        continue;
      }

      if (inBlockers && /^##\s+/.test(trimmed)) {
        break;
      }

      if (inBlockers && trimmed.startsWith("-")) {
        const blocker = trimmed.replace(/^-+\s*/, "").trim();
        if (blocker && blocker.toLowerCase() !== "ninguno por ahora") {
          blockers.push(blocker);
        }
      }
    }

    return blockers;
  } catch {
    return [];
  }
}

function getFinishedThisWeek(projects: ProjectMetadata[]): ProjectMetadata[] {
  const cutoff = Date.now() - 7 * 86_400_000;

  return projects.filter((project) => {
    if (!project.finishedAt) {
      return false;
    }

    const finishedAt = new Date(project.finishedAt).getTime();
    return Number.isFinite(finishedAt) && finishedAt >= cutoff;
  });
}

function isStaleProject(project: ProjectMetadata): boolean {
  if (project.status !== "active") {
    return false;
  }

  if (!project.lastOpenedAt) {
    return false;
  }

  const openedAt = new Date(project.lastOpenedAt).getTime();
  if (!Number.isFinite(openedAt)) {
    return false;
  }

  return Date.now() - openedAt >= 14 * 86_400_000;
}

async function showFirstRunOnboarding(
  context: vscode.ExtensionContext,
  settingsService: SettingsService
): Promise<void> {
  const seen = context.globalState.get<boolean>("shipone.firstRunSeen", false);
  if (seen) {
    return;
  }

  await context.globalState.update("shipone.firstRunSeen", true);

  const settings = settingsService.getSettings();
  const choice = await vscode.window.showInformationMessage(
    `ShipOne listo. Ruta base: ${settings.projectsRoot}. Solo un proyecto Active a la vez.`,
    "Crear proyecto",
    "Crear idea de ejemplo",
    "Abrir ajustes",
    "Entendido"
  );

  if (choice === "Crear proyecto") {
    await vscode.commands.executeCommand(COMMAND_CREATE_PROJECT);
    return;
  }

  if (choice === "Crear idea de ejemplo") {
    await vscode.commands.executeCommand(COMMAND_CREATE_SAMPLE_IDEA);
    return;
  }

  if (choice === "Abrir ajustes") {
    await vscode.commands.executeCommand("workbench.action.openSettings", "ShipOne");
  }
}

export function deactivate() {}
