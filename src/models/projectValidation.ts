import type { MvpTask, ProjectMetadata, ProjectStatus } from "./project";

type ProjectMetadataInput = Record<string, unknown>;

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    value === "idea" ||
    value === "active" ||
    value === "paused" ||
    value === "finished"
  );
}

export function isMvpTask(value: unknown): value is MvpTask {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    typeof task.text === "string" &&
    typeof task.done === "boolean"
  );
}

export function isProjectMetadata(value: unknown): value is ProjectMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const project = value as unknown as ProjectMetadataInput;
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

export function normalizeProjectMetadata(
  value: unknown
): ProjectMetadata | undefined {
  if (!isProjectMetadata(value)) {
    return undefined;
  }

  const project = value as unknown as ProjectMetadataInput;

  return {
    id: requireString(project.id),
    name: requireString(project.name),
    description: requireString(project.description),
    type: requireString(project.type),
    status: requireProjectStatus(project.status),
    path: requireString(project.path),
    repoUrl: normalizeNullableString(project.repoUrl),
    createdAt: requireString(project.createdAt),
    lastOpenedAt: normalizeOptionalString(project.lastOpenedAt),
    finishedAt: normalizeNullableString(project.finishedAt),
    nextAction: normalizeNullableString(project.nextAction),
    favorite: typeof project.favorite === "boolean" ? project.favorite : false,
    tags: normalizeStringArray(project.tags),
    mvpTasks: normalizeMvpTasks(project.mvpTasks),
    pauseReason: normalizeNullableString(project.pauseReason),
    pauseNote: normalizeNullableString(project.pauseNote),
  };
}

export function normalizeProjectListWithDiagnostics(value: unknown): {
  projects: ProjectMetadata[];
  corrupted: boolean;
} {
  if (!Array.isArray(value)) {
    return { projects: [], corrupted: false };
  }

  let corrupted = false;
  const projects: ProjectMetadata[] = [];

  for (const item of value) {
    const normalized = normalizeProjectMetadata(item);
    if (!normalized) {
      corrupted = true;
      continue;
    }

    projects.push(normalized);
  }

  return { projects, corrupted };
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return normalizeOptionalString(value);
}

function requireString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requireProjectStatus(value: unknown): ProjectStatus {
  return isProjectStatus(value) ? value : "idea";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeMvpTasks(value: unknown): MvpTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isMvpTask(item)) {
      return [];
    }

    return [
      {
        id: item.id,
        text: item.text,
        done: item.done,
      },
    ];
  });
}
