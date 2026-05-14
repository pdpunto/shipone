import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { t } from "../../localization";
import { ProjectMetadata } from "../../models/project";

const STATUS_FILE_NAME = "STATUS.md";

export async function pickProject(projectStore: {
  getProjectsByStatus(): Promise<Record<string, ProjectMetadata[]>>;
}) {
  const groupedProjects = await projectStore.getProjectsByStatus();
  const projects = Object.values(groupedProjects).flat();

  if (projects.length === 0) {
    vscode.window.showInformationMessage(t("Todavia no hay proyectos."));
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
      title: t("Proyecto"),
      placeHolder: t("Elige un proyecto"),
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
    t("# Estado actual"),
    "",
    t("## Objetivo"),
    project.description || t("Describe el objetivo principal aqui."),
    "",
    t("## MVP"),
    ...mvpLines,
    "",
    t("## Proximo paso"),
    project.nextAction || t("Define el siguiente paso aqui."),
    "",
    t("## Bloqueos"),
    t("- Ninguno por ahora"),
    "",
    t("## Proyecto"),
    project.name,
    "",
    t("## Actualizado"),
    new Date().toISOString().slice(0, 10),
    "",
  ].join("\n");
}

export function buildAiContextContent(project: ProjectMetadata, blockers: string[]): string {
  const mvpTasks = project.mvpTasks ?? [];
  const doneTasks = mvpTasks.filter((task) => task.done).length;
  const mvpProgress = mvpTasks.length > 0 ? `${doneTasks}/${mvpTasks.length}` : t("sin tareas");

  return [
    t("# ShipOne AI Context"),
    "",
    t("## Proyecto"),
    t("- Nombre: {0}", project.name),
    t("- Estado: {0}", project.status),
    t("- Tipo: {0}", project.type),
    t("- Ruta: {0}", project.path),
    t("- Favorito: {0}", project.favorite ? t("si") : t("no")),
    "",
    t("## Objetivo"),
    project.description || t("Sin descripcion"),
    "",
    t("## Next action"),
    project.nextAction || t("Sin next action"),
    "",
    t("## MVP"),
    t("- Progreso: {0}", mvpProgress),
    ...mvpTasks.map((task) => `- [${task.done ? "x" : " "}] ${task.text}`),
    "",
    t("## Bloqueos"),
    ...(blockers.length > 0 ? blockers.map((blocker) => t("- {0}", blocker)) : [t("- Ninguno")]),
    "",
    t("## Notas"),
    t("- Generado por ShipOne para ayudar a una IA a entender el proyecto."),
    t("- Mantener simple."),
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
