import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { ProjectMetadata, ProjectStatus } from "../models/project";
import { ShipOneSettings } from "../models/settings";
import { ProjectStoreService } from "./projectStoreService";

const PROJECT_TYPES = [
  { label: "Blank", value: "blank" },
  { label: "React Vite", value: "react-vite" },
  { label: "Next.js", value: "nextjs" },
  { label: "Python", value: "python" },
] as const;
const STATUS_FILE_NAME = "STATUS.md";

export class ProjectCreationService {
  constructor(private readonly projectStore: ProjectStoreService) {}

  async createProject(settings: ShipOneSettings): Promise<ProjectMetadata | undefined> {
    const name = await vscode.window.showInputBox({
      prompt: "Nombre del proyecto",
      placeHolder: "my-saas-app",
      validateInput: validateProjectName,
    });

    if (!name) {
      return undefined;
    }

    const type = await this.pickProjectType();
    if (!type) {
      return undefined;
    }

    const description = (await vscode.window.showInputBox({
      prompt: "Descripción",
      placeHolder: "Proyecto simple para ShipOne",
    })) ?? "";

    const folderName = sanitizeFolderName(name);
    const folderUri = vscode.Uri.joinPath(vscode.Uri.file(settings.projectsRoot), folderName);
    const projectExists = await this.pathExists(folderUri);

    if (projectExists) {
      vscode.window.showErrorMessage("Ya existe una carpeta con ese nombre.");
      return undefined;
    }

    await this.projectStore.createProjectFolder(folderUri);
    await this.writeStatusFile(folderUri, name, description);

    const project: ProjectMetadata = {
      id: randomUUID(),
      name,
      description,
      type,
      status: "active" as ProjectStatus,
      path: folderUri.fsPath,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      finishedAt: null,
      nextAction: null,
      favorite: false,
      tags: [],
    };

    await this.projectStore.createProject(project);

    if (settings.openAfterCreate) {
      await vscode.commands.executeCommand("vscode.openFolder", folderUri, false);
    }

    return project;
  }

  private async pickProjectType(): Promise<string | undefined> {
    const choice = await vscode.window.showQuickPick(PROJECT_TYPES, {
      title: "Tipo de proyecto",
      placeHolder: "Elige un starter",
    });

    return choice?.value;
  }

  private async pathExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private async writeStatusFile(
    folderUri: vscode.Uri,
    projectName: string,
    description: string
  ): Promise<void> {
    const content = [
      "# Estado actual",
      "",
      "## Objetivo",
      description || "Describe el objetivo principal aquí.",
      "",
      "## MVP",
      "- [ ]",
      "- [ ]",
      "- [ ]",
      "",
      "## Próximo paso",
      "Define el siguiente paso aquí.",
      "",
      "## Bloqueos",
      "- Ninguno por ahora",
      "",
      "## Proyecto",
      projectName,
      "",
      `## Actualizado`,
      new Date().toISOString().slice(0, 10),
      "",
    ].join("\n");

    const statusFileUri = vscode.Uri.joinPath(folderUri, STATUS_FILE_NAME);
    const bytes = new TextEncoder().encode(content);
    await vscode.workspace.fs.writeFile(statusFileUri, bytes);
  }
}

function validateProjectName(value: string): string | undefined {
  if (!value.trim()) {
    return "Escribe un nombre.";
  }

  if (!/^[a-zA-Z0-9 _.-]+$/.test(value)) {
    return "Usa solo letras, números, espacios, guiones o puntos.";
  }

  return undefined;
}

function sanitizeFolderName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9 _.-]/g, "-").replace(/\s+/g, "-");
}
