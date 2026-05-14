import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { ProjectMetadata } from "../../models/project";

const STATUS_FILE_NAME = "STATUS.md";

export async function pickProject(projectStore: {
  getProjectsByStatus(): Promise<Record<string, ProjectMetadata[]>>;
}) {
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

export function parseMvpTasks(rawValue: string, currentTasks: NonNullable<ProjectMetadata["mvpTasks"]>) {
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

export function buildStatusFileContent(project: ProjectMetadata): string {
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

export function buildAiContextContent(project: ProjectMetadata, blockers: string[]): string {
  const mvpTasks = project.mvpTasks ?? [];
  const doneTasks = mvpTasks.filter((task) => task.done).length;
  const mvpProgress = mvpTasks.length > 0 ? `${doneTasks}/${mvpTasks.length}` : "sin tareas";

  return [
    "# ShipOne AI Context",
    "",
    "## Proyecto",
    `- Nombre: ${project.name}`,
    `- Estado: ${project.status}`,
    `- Tipo: ${project.type}`,
    `- Ruta: ${project.path}`,
    `- Favorito: ${project.favorite ? "si" : "no"}`,
    "",
    "## Objetivo",
    project.description || "Sin descripcion",
    "",
    "## Next action",
    project.nextAction || "Sin next action",
    "",
    "## MVP",
    `- Progreso: ${mvpProgress}`,
    ...mvpTasks.map((task) => `- [${task.done ? "x" : " "}] ${task.text}`),
    "",
    "## Bloqueos",
    ...(blockers.length > 0 ? blockers.map((blocker) => `- ${blocker}`) : ["- Ninguno"]),
    "",
    "## Notas",
    "- Generado por ShipOne para ayudar a una IA a entender el proyecto.",
    "- Mantener simple.",
    "",
  ].join("\n");
}

export function buildWeeklyReviewSummary(projects: ProjectMetadata[]) {
  return {
    active: projects.find((project) => project.status === "active") ?? null,
  };
}

export async function readStatusBlockers(projectPath: string): Promise<string[]> {
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

export async function scanProjectTodoTasks(
  projectPath: string
): Promise<
  Array<{
    kind: "TODO" | "FIXME";
    fileName: string;
    text: string;
    line: number;
    uri: vscode.Uri;
  }>
> {
  const rootUri = vscode.Uri.file(projectPath);
  const tasks: Array<{
    kind: "TODO" | "FIXME";
    fileName: string;
    text: string;
    line: number;
    uri: vscode.Uri;
  }> = [];

  await walkTodoFiles(rootUri, tasks);
  return tasks;
}

async function walkTodoFiles(
  dirUri: vscode.Uri,
  tasks: Array<{
    kind: "TODO" | "FIXME";
    fileName: string;
    text: string;
    line: number;
    uri: vscode.Uri;
  }>
): Promise<void> {
  const entries = await vscode.workspace.fs.readDirectory(dirUri);

  for (const [name, type] of entries) {
    if (name === ".git" || name === "node_modules" || name === "out" || name === "dist") {
      continue;
    }

    const childUri = vscode.Uri.joinPath(dirUri, name);

    if (type === vscode.FileType.Directory) {
      await walkTodoFiles(childUri, tasks);
      continue;
    }

    if (type !== vscode.FileType.File || !isLikelyTodoTextFile(name)) {
      continue;
    }

    const fileTasks = await readTodoTasksFromFile(childUri);
    tasks.push(...fileTasks);
  }
}

async function readTodoTasksFromFile(
  uri: vscode.Uri
): Promise<
  Array<{
    kind: "TODO" | "FIXME";
    fileName: string;
    text: string;
    line: number;
    uri: vscode.Uri;
  }>
> {
  try {
    const raw = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder().decode(raw);
    const lines = text.split(/\r?\n/);
    const tasks: Array<{
      kind: "TODO" | "FIXME";
      fileName: string;
      text: string;
      line: number;
      uri: vscode.Uri;
    }> = [];

    lines.forEach((line, index) => {
      const match = line.match(/\b(TODO|FIXME)\b[:\s-]?(.*)/i);
      if (!match) {
        return;
      }

      const kind = match[1].toUpperCase() as "TODO" | "FIXME";
      const text = match[2].trim() || line.trim();

      tasks.push({
        kind,
        fileName: vscode.workspace.asRelativePath(uri, false),
        text,
        line: index + 1,
        uri,
      });
    });

    return tasks;
  } catch {
    return [];
  }
}

function isLikelyTodoTextFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();

  if (
    lower === "readme" ||
    lower === "readme.md" ||
    lower === "license" ||
    lower === "license.md" ||
    lower === ".gitignore"
  ) {
    return true;
  }

  return [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".py",
    ".css",
    ".html",
    ".htm",
    ".yaml",
    ".yml",
    ".txt",
    ".toml",
    ".ini",
    ".sh",
  ].some((extension) => lower.endsWith(extension));
}

export function getFinishedThisWeek(projects: ProjectMetadata[]): ProjectMetadata[] {
  const cutoff = Date.now() - 7 * 86_400_000;

  return projects.filter((project) => {
    if (!project.finishedAt) {
      return false;
    }

    const finishedAt = new Date(project.finishedAt).getTime();
    return Number.isFinite(finishedAt) && finishedAt >= cutoff;
  });
}

export function isStaleProject(project: ProjectMetadata): boolean {
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
