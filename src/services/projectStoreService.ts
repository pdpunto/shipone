import * as vscode from "vscode";
import { TextDecoder, TextEncoder } from "util";
import { MvpTask, ProjectMetadata, ProjectStatus } from "../models/project";

const STORAGE_FILE_NAME = "projects.json";
const EMPTY_GROUPS: ProjectStatus[] = ["idea", "active", "paused", "finished"];

export class ProjectStoreService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async initialize(): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);

    const exists = await this.pathExists(this.storageFileUri);
    if (!exists) {
      await this.saveProjects([]);
    }
  }

  async loadProjects(): Promise<ProjectMetadata[]> {
    await this.initialize();

    try {
      const raw = await vscode.workspace.fs.readFile(this.storageFileUri);
      if (raw.length === 0) {
        return [];
      }

      const parsed = JSON.parse(new TextDecoder().decode(raw)) as unknown;
      return this.coerceProjects(parsed);
    } catch {
      return [];
    }
  }

  async saveProjects(projects: ProjectMetadata[]): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);

    const payload = new TextEncoder().encode(JSON.stringify(projects, null, 2));
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

  async createProject(project: ProjectMetadata): Promise<void> {
    const projects = await this.loadProjects();
    const normalized = await this.normalizeActiveProject(projects, project);
    projects.push(normalized);
    await this.saveProjects(projects);
  }

  async setProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
    const projects = await this.loadProjects();
    const target = projects.find((project) => project.id === projectId);

    if (!target) {
      throw new Error("No se encontró el proyecto.");
    }

    if (status === "active") {
      for (const project of projects) {
        if (project.id !== projectId && project.status === "active") {
          project.status = "paused";
        }
      }
    }

    target.status = status;
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
    const target = projects.find((project) => project.id === projectId);

    if (!target) {
      throw new Error("No se encontró el proyecto.");
    }

    target.nextAction = nextAction;
    await this.saveProjects(projects);
  }

  async toggleFavorite(projectId: string): Promise<void> {
    const projects = await this.loadProjects();
    const target = projects.find((project) => project.id === projectId);

    if (!target) {
      throw new Error("No se encontró el proyecto.");
    }

    target.favorite = !target.favorite;
    await this.saveProjects(projects);
  }

  async setMvpTasks(projectId: string, tasks: MvpTask[]): Promise<void> {
    const projects = await this.loadProjects();
    const target = projects.find((project) => project.id === projectId);

    if (!target) {
      throw new Error("No se encontrÃ³ el proyecto.");
    }

    target.mvpTasks = tasks;
    await this.saveProjects(projects);
  }

  async markMvpTaskDone(projectId: string, taskId: string): Promise<void> {
    const projects = await this.loadProjects();
    const target = projects.find((project) => project.id === projectId);

    if (!target) {
      throw new Error("No se encontrÃ³ el proyecto.");
    }

    const task = target.mvpTasks?.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("No se encontrÃ³ la tarea.");
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
    const target = projects.find((project) => project.id === projectId);

    if (!target) {
      throw new Error("No se encontrÃ³ el proyecto.");
    }

    target.status = "paused";
    target.pauseReason = reason;
    target.pauseNote = note;
    target.nextAction = nextAction;
    target.finishedAt = null;
    await this.saveProjects(projects);
  }

  async markProjectOpened(projectId: string): Promise<void> {
    const projects = await this.loadProjects();
    const target = projects.find((project) => project.id === projectId);

    if (!target) {
      throw new Error("No se encontrÃ³ el proyecto.");
    }

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

  private createEmptyGroups(): Record<ProjectStatus, ProjectMetadata[]> {
    return {
      idea: [],
      active: [],
      paused: [],
      finished: [],
    };
  }

  private coerceProjects(value: unknown): ProjectMetadata[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(isProjectMetadata);
  }

  private async normalizeActiveProject(
    projects: ProjectMetadata[],
    project: ProjectMetadata
  ): Promise<ProjectMetadata> {
    if (project.status === "active") {
      for (const existing of projects) {
        if (existing.status === "active") {
          existing.status = "paused";
        }
      }
    }

    return project;
  }

  private async pathExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}

  function isProjectMetadata(value: unknown): value is ProjectMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const project = value as Record<string, unknown>;
  return (
    typeof project.id === "string" &&
    typeof project.name === "string" &&
    typeof project.description === "string" &&
    typeof project.type === "string" &&
    isProjectStatus(project.status) &&
    typeof project.path === "string" &&
    typeof project.createdAt === "string"
  );
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return value === "idea" || value === "active" || value === "paused" || value === "finished";
}
