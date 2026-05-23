import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";
import type { ProjectMetadata } from "../../models/project";
export {
  getFinishedThisWeek,
  isStaleProject,
  parseMvpTasks,
} from "../../utils/projectReview";

const STATUS_FILE_NAME = "STATUS.md";

export async function pickProject(projectStore: {
  getProjectsByStatus(): Promise<Record<string, ProjectMetadata[]>>;
}) {
  const groupedProjects = await projectStore.getProjectsByStatus();
  const projects = Object.values(groupedProjects).flat();

  if (projects.length === 0) {
    vscode.window.showInformationMessage(t(k.common.noProjectsYetToStart));
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
      placeHolder: t(k.common.chooseProject),
    }
  );

  return choice?.project;
}

export function buildNoProjectsDetail(): string {
  return t(k.tree.noProjectsDetail);
}

export function buildNoActiveProjectDetail(): string {
  return t(k.tree.noActiveProjectDetail);
}

export async function confirmCanActivateProject(
  projectStore: {
    loadProjects(): Promise<ProjectMetadata[]>;
  },
  projectId: string
): Promise<boolean> {
  // Regla central: solo un proyecto puede quedar Active a la vez.
  const activeProjects = await projectStore.loadProjects();
  const otherActive = activeProjects.find(
    (item) => item.status === "active" && item.id !== projectId
  );

  if (!otherActive) {
    return true;
  }

  const choice = await vscode.window.showWarningMessage(
    t("Ya hay un proyecto activo: {0}.", otherActive.name),
    t("Pausar y activar"),
    t("Cancelar")
  );

  return choice === t("Pausar y activar");
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

export function buildReadmeContent(project: ProjectMetadata): string {
  return [
    t("# {0}", project.name),
    "",
    project.description || t("Proyecto creado con ShipOne."),
    "",
    t("## Proximo paso"),
    project.nextAction || t("Define el siguiente paso aqui."),
    "",
    t("## Objetivo"),
    project.description || t("Describe el objetivo principal aqui."),
    "",
  ].join("\n");
}

export function buildAiContextContent(
  project: ProjectMetadata,
  blockers: string[],
  gitSummary?: {
    branch?: string;
    statusLines?: string[];
    recentCommits?: string[];
  },
  extra?: {
    createdAt?: string;
    lastOpenedAt?: string;
    pauseReason?: string | null;
    pauseNote?: string | null;
    todoSummary?: string[];
    stackSummary?: string[];
  }
): string {
  const mvpTasks = project.mvpTasks ?? [];
  const doneTasks = mvpTasks.filter((task) => task.done).length;
  const mvpProgress =
    mvpTasks.length > 0 ? `${doneTasks}/${mvpTasks.length}` : t("sin tareas");
  const hasGitSummary =
    gitSummary &&
    Boolean(
      gitSummary.branch ||
      (gitSummary.statusLines && gitSummary.statusLines.length > 0) ||
      (gitSummary.recentCommits && gitSummary.recentCommits.length > 0)
    );

  const content = [
    t("# ShipOne Project Context"),
    "",
    t("## Proyecto"),
    t("- Nombre: {0}", project.name),
    t("- Estado: {0}", project.status),
    t("- Tipo: {0}", project.type),
    t("- Ruta: {0}", project.path),
    t("- Favorito: {0}", project.favorite ? t("si") : t("no")),
    "",
    t("## Estado"),
    t("- Creado: {0}", formatContextDate(extra?.createdAt)),
    t("- Ultima apertura: {0}", formatContextDate(extra?.lastOpenedAt)),
    ...(project.status === "paused" || extra?.pauseReason || extra?.pauseNote
      ? [
          t("- Pausa: {0}", extra?.pauseReason || t("Sin motivo registrado")),
          ...(extra?.pauseNote
            ? [t("- Nota de pausa: {0}", extra.pauseNote)]
            : []),
        ]
      : [t("- Pausa: ninguna")]),
    "",
    t("## Objetivo"),
    project.description ||
      t("Sin descripcion. Define el objetivo principal en una frase."),
    "",
    t("## Next action"),
    project.nextAction ||
      t("Sin next action. Define una accion concreta para retomar."),
    "",
    t("## MVP"),
    t("- Progreso: {0}", mvpProgress),
    ...(mvpTasks.length > 0
      ? mvpTasks.map((task) => `- [${task.done ? "x" : " "}] ${task.text}`)
      : [
          t("- Todavia no hay tareas. Anade 3 pasos pequenos y claros."),
          t("- Empieza por el trabajo minimo para avanzar."),
        ]),
    "",
    t("## Stack"),
    ...(extra?.stackSummary && extra.stackSummary.length > 0
      ? extra.stackSummary.map((line) => t("- {0}", line))
      : [t("- No detectado")]),
    "",
    t("## TODOs"),
    ...(extra?.todoSummary && extra.todoSummary.length > 0
      ? extra.todoSummary.map((line) => t("- {0}", line))
      : [t("- Ninguno detectado.")]),
    "",
    t("## Bloqueos"),
    ...(blockers.length > 0
      ? blockers.map((blocker) => t("- {0}", blocker))
      : [t("- Ninguno. Todo listo para seguir.")]),
    "",
    ...(hasGitSummary
      ? [
          t("## Git"),
          ...(gitSummary?.branch ? [t("- Rama: {0}", gitSummary.branch)] : []),
          ...(gitSummary?.statusLines && gitSummary.statusLines.length > 0
            ? [
                t("- Estado:"),
                ...gitSummary.statusLines.map((line) => t("  - {0}", line)),
              ]
            : [t("- Estado: limpio")]),
          ...(gitSummary?.recentCommits && gitSummary.recentCommits.length > 0
            ? [
                t("- Commits recientes:"),
                ...gitSummary.recentCommits.map((line) => t("  - {0}", line)),
              ]
            : []),
          "",
        ]
      : []),
    "",
    t("## Notas"),
    t("- Generado por ShipOne para ayudar a una IA a entender el proyecto."),
    t("- Mantener simple."),
    "",
  ];

  return content.join("\n");
}

function formatContextDate(value?: string): string {
  if (!value) {
    return t("Sin registrar");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

export function buildWeeklyReviewSummary(projects: ProjectMetadata[]) {
  return {
    active: projects.find((project) => project.status === "active") ?? null,
  };
}

export async function readStatusBlockers(
  projectPath: string
): Promise<string[]> {
  try {
    const statusFileUri = vscode.Uri.joinPath(
      vscode.Uri.file(projectPath),
      STATUS_FILE_NAME
    );
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
