import * as vscode from "vscode";
import { TextDecoder, TextEncoder } from "util";
import { ProjectMetadata, ProjectStatus } from "../models/project";
import {
  normalizeProjectList,
  normalizeProjectMetadata,
} from "../models/projectValidation";

const STORAGE_FILE_NAME = "projects.json";
const STORAGE_BACKUP_FILE_NAME = "projects.json.bak";
const STORAGE_VERSION = 2;
const EMPTY_GROUPS: ProjectStatus[] = ["idea", "active", "paused", "finished"];

type ProjectStoreSnapshot = {
  version: number;
  projects: ProjectMetadata[];
};

export class ProjectStoreService {
  private readonly outputChannel = vscode.window.createOutputChannel("ShipOne Storage");

  constructor(private readonly context: vscode.ExtensionContext) {}

  async initialize(): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);

    const exists = await this.pathExists(this.storageFileUri);
    if (!exists) {
      await this.saveProjects([]);
      return;
    }

    const { projects, version } = await this.readProjectsWithRecovery();
    if (version < STORAGE_VERSION) {
      await this.saveProjects(projects);
    }
  }

  async loadProjects(): Promise<ProjectMetadata[]> {
    await this.initialize();

    const { projects } = await this.readProjectsWithRecovery();
    return projects;
  }

  async recoverFromBackup(): Promise<boolean> {
    try {
      const recovered = await this.readProjectsFromUri(this.backupFileUri);
      await this.saveProjects(recovered.projects, false);
      this.logInfo("Recuperación completada desde backup.");
      return true;
    } catch (error) {
      this.logError("No se pudo recuperar el almacenamiento desde backup.", error);
      return false;
    }
  }

  async saveProjects(projects: ProjectMetadata[], createBackup = true): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);

    if (createBackup && (await this.pathExists(this.storageFileUri))) {
      await vscode.workspace.fs.copy(this.storageFileUri, this.backupFileUri, {
        overwrite: true,
      });
    }

    const normalized = projects
      .map((project) => normalizeProjectMetadata(project))
      .filter((project): project is ProjectMetadata => Boolean(project));

    const payload = new TextEncoder().encode(
      JSON.stringify({ version: STORAGE_VERSION, projects: normalized }, null, 2)
    );

    await vscode.workspace.fs.writeFile(this.storageFileUri, payload);
  }

  async upsertProject(project: ProjectMetadata): Promise<void> {
    const projects = await this.loadProjects();
    const index = projects.findIndex((existing) => existing.id === project.id);

    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }

    await this.saveProjects(projects);
  }

  async createProject(project: ProjectMetadata, enforceOneActiveProject = true): Promise<void> {
    const projects = await this.loadProjects();
    const normalized = this.normalizeActiveProject(projects, project, enforceOneActiveProject);
    projects.push(normalized);
    await this.saveProjects(projects);
  }

  async setProjectStatus(
    projectId: string,
    status: ProjectStatus,
    enforceOneActiveProject = true
  ): Promise<void> {
    const projects = await this.loadProjects();
    const target = this.getRequiredProject(projects, projectId);

    if (status === "active" && enforceOneActiveProject) {
      for (const project of projects) {
        if (project.id !== projectId && project.status === "active") {
          project.status = "paused";
        }
      }
    }

    target.status = status;
    if (status !== "paused") {
      target.pauseReason = null;
      target.pauseNote = null;
    }

    if (status === "finished") {
      target.finishedAt = new Date().toISOString();
    } else {
      target.finishedAt = null;
    }

    if (status === "active") {
      target.lastOpenedAt = new Date().toISOString();
    }

    await this.saveProjects(projects);
  }

  async setNextAction(projectId: string, nextAction: string | null): Promise<void> {
    const projects = await this.loadProjects();
    const target = this.getRequiredProject(projects, projectId);

    target.nextAction = nextAction;
    await this.saveProjects(projects);
  }

  async toggleFavorite(projectId: string): Promise<void> {
    const projects = await this.loadProjects();
    const target = this.getRequiredProject(projects, projectId);

    target.favorite = !target.favorite;
    await this.saveProjects(projects);
  }

  async setMvpTasks(projectId: string, tasks: ProjectMetadata["mvpTasks"]): Promise<void> {
    const projects = await this.loadProjects();
    const target = this.getRequiredProject(projects, projectId);

    target.mvpTasks = tasks ?? [];
    await this.saveProjects(projects);
  }

  async markMvpTaskDone(projectId: string, taskId: string): Promise<void> {
    const projects = await this.loadProjects();
    const target = this.getRequiredProject(projects, projectId);

    const task = target.mvpTasks?.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("No se encontró la tarea.");
    }

    task.done = true;
    await this.saveProjects(projects);
  }

  async freezeProject(
    projectId: string,
    reason: string,
    nextAction: string | null,
    note: string
  ): Promise<void> {
    const projects = await this.loadProjects();
    const target = this.getRequiredProject(projects, projectId);

    target.status = "paused";
    target.pauseReason = reason;
    target.pauseNote = note;
    target.nextAction = nextAction;
    target.finishedAt = null;
    await this.saveProjects(projects);
  }

  async markProjectOpened(projectId: string): Promise<void> {
    const projects = await this.loadProjects();
    const target = this.getRequiredProject(projects, projectId);

    target.lastOpenedAt = new Date().toISOString();
    await this.saveProjects(projects);
  }

  async getProject(projectId: string): Promise<ProjectMetadata | undefined> {
    const projects = await this.loadProjects();
    return projects.find((project) => project.id === projectId);
  }

  async getProjectsByStatus(): Promise<Record<ProjectStatus, ProjectMetadata[]>> {
    const projects = await this.loadProjects();
    const grouped = this.createEmptyGroups();

    for (const project of projects) {
      grouped[project.status].push(project);
    }

    for (const status of EMPTY_GROUPS) {
      grouped[status].sort((left, right) => {
        if (left.favorite !== right.favorite) {
          return left.favorite ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      });
    }

    return grouped;
  }

  async createProjectFolder(folderUri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.createDirectory(folderUri);
  }

  private get storageFileUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.context.globalStorageUri, STORAGE_FILE_NAME);
  }

  private get backupFileUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.context.globalStorageUri, STORAGE_BACKUP_FILE_NAME);
  }

  private createEmptyGroups(): Record<ProjectStatus, ProjectMetadata[]> {
    return {
      idea: [],
      active: [],
      paused: [],
      finished: [],
    };
  }

  private normalizeActiveProject(
    projects: ProjectMetadata[],
    project: ProjectMetadata,
    enforceOneActiveProject: boolean
  ): ProjectMetadata {
    if (project.status === "active" && enforceOneActiveProject) {
      for (const existing of projects) {
        if (existing.status === "active") {
          existing.status = "paused";
        }
      }
    }

    return project;
  }

  private getRequiredProject(projects: ProjectMetadata[], projectId: string): ProjectMetadata {
    const target = projects.find((project) => project.id === projectId);

    if (!target) {
      throw new Error("No se encontró el proyecto.");
    }

    return target;
  }

  private async readProjectsWithRecovery(): Promise<{ projects: ProjectMetadata[]; version: number }> {
    try {
      return await this.readProjectsFromUri(this.storageFileUri);
    } catch (error) {
      this.logError("Falló la lectura del almacenamiento principal.", error);
      try {
        const recovered = await this.readProjectsFromUri(this.backupFileUri);
        await this.saveProjects(recovered.projects, false);
        this.logInfo("Se recuperó el almacenamiento desde el backup.");
        return recovered;
      } catch (backupError) {
        this.logError("Falló también la lectura del backup.", backupError);
        return { projects: [], version: STORAGE_VERSION };
      }
    }
  }

  private async readProjectsFromUri(
    uri: vscode.Uri
  ): Promise<{ projects: ProjectMetadata[]; version: number }> {
    const raw = await vscode.workspace.fs.readFile(uri);
    if (raw.length === 0) {
      return { projects: [], version: STORAGE_VERSION };
    }

    const parsed = JSON.parse(new TextDecoder().decode(raw)) as unknown;

    if (Array.isArray(parsed)) {
      return { projects: normalizeProjectList(parsed), version: 1 };
    }

    if (typeof parsed === "object" && parsed !== null) {
      const snapshot = parsed as Partial<ProjectStoreSnapshot> & {
        projects?: unknown;
      };
      const version = typeof snapshot.version === "number" ? snapshot.version : 1;
      return {
        projects: normalizeProjectList(snapshot.projects),
        version,
      };
    }

    return { projects: [], version: STORAGE_VERSION };
  }

  private async pathExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private logInfo(message: string): void {
    this.outputChannel.appendLine(`[info] ${message}`);
  }

  private logError(message: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.outputChannel.appendLine(`[error] ${message}`);
    this.outputChannel.appendLine(detail);
  }
}

