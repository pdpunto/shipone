import * as vscode from "vscode";
import { TextDecoder, TextEncoder } from "util";
import { ProjectMetadata, ProjectStatus } from "../models/project";

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

  async getProjectsByStatus(): Promise<Record<ProjectStatus, ProjectMetadata[]>> {
    const projects = await this.loadProjects();
    const grouped = this.createEmptyGroups();

    for (const project of projects) {
      grouped[project.status].push(project);
    }

    for (const status of EMPTY_GROUPS) {
      grouped[status].sort((left, right) => left.name.localeCompare(right.name));
    }

    return grouped;
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
