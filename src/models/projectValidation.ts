import type { MvpTask, ProjectMetadata, ProjectStatus } from "./project";
import {
  applyProjectMetadataMigrations,
  PROJECT_SCHEMA_VERSION,
  type ProjectMetadataInput,
} from "./projectMigrations";

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

  return hasProjectMetadataSchema(value as ProjectMetadataInput);
}

export function createProjectMetadata(
  project: Omit<ProjectMetadata, "schemaVersion"> & {
    schemaVersion?: number;
  }
): ProjectMetadata {
  return normalizeProjectMetadata({
    schemaVersion: PROJECT_SCHEMA_VERSION,
    repoUrl: null,
    finishedAt: null,
    nextAction: null,
    favorite: false,
    tags: [],
    mvpTasks: [],
    pauseReason: null,
    pauseNote: null,
    ...project,
  }) as ProjectMetadata;
}

export function normalizeProjectMetadata(
  value: unknown
): ProjectMetadata | undefined {
  if (
    !hasProjectMetadataSchema(value) &&
    !hasLegacyProjectMetadataSchema(value)
  ) {
    return undefined;
  }

  const project = value as unknown as ProjectMetadataInput;
  const migrated = applyProjectMetadataMigrations(project);

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: requireString(migrated.id),
    name: requireString(migrated.name),
    description: requireString(migrated.description),
    type: requireString(migrated.type),
    status: requireProjectStatus(migrated.status),
    path: requireString(migrated.path),
    repoUrl: normalizeNullableString(migrated.repoUrl),
    createdAt: requireString(migrated.createdAt),
    lastOpenedAt: normalizeOptionalString(migrated.lastOpenedAt),
    finishedAt: normalizeNullableString(migrated.finishedAt),
    nextAction: normalizeNullableString(migrated.nextAction),
    favorite:
      typeof migrated.favorite === "boolean" ? migrated.favorite : false,
    tags: normalizeStringArray(migrated.tags),
    mvpTasks: normalizeMvpTasks(migrated.mvpTasks),
    pauseReason: normalizeNullableString(migrated.pauseReason),
    pauseNote: normalizeNullableString(migrated.pauseNote),
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

  const uniqueValues = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.trim();
    if (!normalized) {
      continue;
    }

    uniqueValues.add(normalized);
  }

  return [...uniqueValues];
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

function isOptionalString(
  value: unknown,
  allowNull: boolean
): value is string | null | undefined {
  return (
    typeof value === "string" ||
    (allowNull && value === null) ||
    value === undefined
  );
}

function isStringArray(value: unknown): value is string[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function isMvpTaskArray(value: unknown): value is MvpTask[] | undefined {
  return (
    value === undefined || (Array.isArray(value) && value.every(isMvpTask))
  );
}

function hasProjectMetadataSchema(project: unknown): boolean {
  if (typeof project !== "object" || project === null) {
    return false;
  }

  const typed = project as ProjectMetadataInput;
  return (
    isSchemaVersion(typed.schemaVersion) &&
    typeof typed.id === "string" &&
    typeof typed.name === "string" &&
    typeof typed.description === "string" &&
    typeof typed.type === "string" &&
    isProjectStatus(typed.status) &&
    typeof typed.path === "string" &&
    typeof typed.createdAt === "string" &&
    isOptionalString(typed.repoUrl, true) &&
    isOptionalString(typed.lastOpenedAt, false) &&
    isOptionalString(typed.finishedAt, true) &&
    isOptionalString(typed.nextAction, true) &&
    (typed.favorite === undefined || typeof typed.favorite === "boolean") &&
    isStringArray(typed.tags) &&
    isMvpTaskArray(typed.mvpTasks) &&
    isOptionalString(typed.pauseReason, true) &&
    isOptionalString(typed.pauseNote, true)
  );
}

function hasLegacyProjectMetadataSchema(
  project: unknown
): project is ProjectMetadataInput {
  if (typeof project !== "object" || project === null) {
    return false;
  }

  const legacy = project as ProjectMetadataInput;
  return (
    typeof legacy.id === "string" &&
    typeof legacy.name === "string" &&
    typeof legacy.description === "string" &&
    typeof legacy.type === "string" &&
    isProjectStatus(legacy.status) &&
    typeof legacy.path === "string" &&
    typeof legacy.createdAt === "string"
  );
}

function isSchemaVersion(value: unknown): value is number | undefined {
  return value === undefined || isValidSchemaVersion(value);
}

function isValidSchemaVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}
