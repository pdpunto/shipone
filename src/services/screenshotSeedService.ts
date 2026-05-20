import * as vscode from "vscode";
import { TextDecoder, TextEncoder } from "util";
import { randomUUID } from "crypto";
import { createProjectMetadata } from "../models/projectValidation";
import type { ProjectMetadata, ProjectStatus } from "../models/project";
import type { ProjectContextService } from "./projectContextService";
import type { ProjectStoreService } from "./projectStoreService";
import type { StatusFileService } from "./statusFileService";

type ScreenshotSeedFile = {
  projects: ScreenshotSeedProject[];
};

type ScreenshotSeedProject = {
  id?: string;
  folderName?: string;
  name: string;
  description: string;
  type: string;
  status: ProjectStatus;
  nextAction?: string | null;
  favorite?: boolean;
  tags?: string[];
  mvpTasks?: Array<{
    id?: string;
    text: string;
    done?: boolean;
  }>;
  createdAt?: string;
  lastOpenedAt?: string;
  finishedAt?: string | null;
  pauseReason?: string | null;
  pauseNote?: string | null;
  repoUrl?: string | null;
};

export class ScreenshotSeedService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly projectStore: ProjectStoreService,
    private readonly statusFileService: StatusFileService,
    private readonly projectContextService: ProjectContextService
  ) {}

  async loadSeedProjects(): Promise<{
    workspaceFolder: vscode.Uri;
    demoRoot: vscode.Uri;
    projects: ProjectMetadata[];
  }> {
    const workspaceFolder = this.getWorkspaceFolder();
    const seedFileUri = vscode.Uri.joinPath(
      workspaceFolder,
      ".shipone-private",
      "screenshot-data.json"
    );

    const seed = await this.readSeedFile(seedFileUri);
    const demoRoot = vscode.Uri.joinPath(
      workspaceFolder,
      ".shipone-private",
      "demo-workspace"
    );

    await this.resetDirectory(demoRoot);
    await vscode.workspace.fs.createDirectory(demoRoot);

    const projects: ProjectMetadata[] = [];
    const now = new Date().toISOString();

    for (const [index, item] of seed.projects.entries()) {
      const folderName = this.normalizeFolderName(
        item.folderName ?? item.id ?? item.name
      );
      const projectPath = vscode.Uri.joinPath(demoRoot, folderName);
      const project = this.buildProjectMetadata(item, projectPath.fsPath, now, index);

      await vscode.workspace.fs.createDirectory(projectPath);
      await this.writeReadme(projectPath, project, item);
      await this.writeDemoMarker(projectPath);
      await this.statusFileService.syncStatusFile(project);
      await this.projectContextService.generateAiContext(project);

      projects.push(project);
    }

    await this.projectStore.replaceProjects(projects, true);

    return {
      workspaceFolder,
      demoRoot,
      projects,
    };
  }

  private getWorkspaceFolder(): vscode.Uri {
    return this.context.extensionUri;
  }

  private async hasSeedFile(folder: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(
        vscode.Uri.joinPath(folder, ".shipone-private", "screenshot-data.json")
      );
      return true;
    } catch {
      return false;
    }
  }

  private async readSeedFile(uri: vscode.Uri): Promise<ScreenshotSeedFile> {
    try {
      const raw = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(raw);
      const parsed = JSON.parse(text) as unknown;

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Formato de seed invalido.");
      }

      const candidate = parsed as Partial<ScreenshotSeedFile>;
      if (!Array.isArray(candidate.projects) || candidate.projects.length === 0) {
        throw new Error("El seed no contiene proyectos.");
      }

      return {
        projects: candidate.projects
          .filter((project): project is ScreenshotSeedProject => this.isSeedProject(project))
          .map((project) => ({
            ...project,
            tags: Array.isArray(project.tags) ? project.tags : [],
            mvpTasks: Array.isArray(project.mvpTasks) ? project.mvpTasks : [],
          })),
      };
    } catch (error) {
      if (error instanceof Error && /ENOENT/i.test(error.message)) {
        throw new Error(
          "No se encontro .shipone-private/screenshot-data.json. Crea ese archivo para cargar los datos de captura."
        );
      }

      throw error;
    }
  }

  private isSeedProject(value: unknown): value is ScreenshotSeedProject {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.name === "string" &&
      typeof candidate.description === "string" &&
      typeof candidate.type === "string" &&
      typeof candidate.status === "string"
    );
  }

  private buildProjectMetadata(
    seed: ScreenshotSeedProject,
    projectPath: string,
    now: string,
    index: number
  ): ProjectMetadata {
    const status = this.normalizeStatus(seed.status);
    const createdAt = seed.createdAt ?? now;
    const lastOpenedAt =
      seed.lastOpenedAt ?? (status === "active" ? now : createdAt);
    const finishedAt =
      seed.finishedAt ?? (status === "finished" ? now : null);

    return createProjectMetadata({
      id: seed.id ?? `${this.normalizeFolderName(seed.name)}-${index + 1}`,
      name: seed.name,
      description: seed.description,
      type: seed.type,
      status,
      path: projectPath,
      repoUrl: seed.repoUrl ?? null,
      createdAt,
      lastOpenedAt,
      finishedAt,
      nextAction: seed.nextAction ?? null,
      favorite: seed.favorite ?? false,
      tags: seed.tags ?? [],
      mvpTasks: (seed.mvpTasks ?? []).map((task, taskIndex) => ({
        id: task.id ?? `${projectPath}-${taskIndex + 1}`,
        text: task.text,
        done: task.done ?? false,
      })),
      pauseReason: seed.pauseReason ?? null,
      pauseNote: seed.pauseNote ?? null,
    });
  }

  private normalizeStatus(value: string): ProjectStatus {
    if (value === "idea" || value === "active" || value === "paused" || value === "finished") {
      return value;
    }

    return "idea";
  }

  private async writeReadme(
    projectPath: vscode.Uri,
    project: ProjectMetadata,
    seed: ScreenshotSeedProject
  ): Promise<void> {
    const lines = [
      `# ${project.name}`,
      "",
      project.description,
      "",
      "## Contexto",
      `- Estado: ${project.status}`,
      `- Tipo: ${project.type}`,
      `- Siguiente paso: ${project.nextAction ?? "Ninguno"}`,
      "",
      "## Uso",
      ...(seed.mvpTasks?.length
        ? seed.mvpTasks.map((task) => `- [${task.done ? "x" : " "}] ${task.text}`)
        : ["- [ ] Preparar demo", "- [ ] Tomar captura"]),
      "",
    ].join("\n");

    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectPath, "README.md"),
      new TextEncoder().encode(lines)
    );
  }

  private async writeDemoMarker(projectPath: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectPath, ".shipone-demo"),
      new TextEncoder().encode("demo")
    );
  }

  private async resetDirectory(uri: vscode.Uri): Promise<void> {
    try {
      await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
    } catch {
      // Si no existe, no pasa nada.
    }
  }

  private normalizeFolderName(value: string): string {
    const base = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return base || `project-${randomUUID().slice(0, 8)}`;
  }
}
