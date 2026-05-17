import type { MvpTask } from "./project";

export type ProjectMetadataInput = Record<string, unknown>;

export const PROJECT_SCHEMA_VERSION = 2;

export interface ProjectMetadataMigration {
  fromVersion: number;
  toVersion: number;
  migrate(project: ProjectMetadataInput): ProjectMetadataInput;
}

const projectMetadataMigrations: ProjectMetadataMigration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate(project) {
      return {
        ...project,
        schemaVersion: PROJECT_SCHEMA_VERSION,
        tags: normalizeStringArray(project.tags),
        mvpTasks: normalizeMvpTasks(project.mvpTasks),
      };
    },
  },
];

export function applyProjectMetadataMigrations(
  project: ProjectMetadataInput
): ProjectMetadataInput {
  let migrated = { ...project };
  let currentVersion = normalizeSchemaVersion(migrated.schemaVersion);

  while (currentVersion < PROJECT_SCHEMA_VERSION) {
    const migration = projectMetadataMigrations.find(
      (entry) => entry.fromVersion === currentVersion
    );

    if (!migration) {
      return {
        ...migrated,
        schemaVersion: PROJECT_SCHEMA_VERSION,
      };
    }

    migrated = migration.migrate(migrated);
    currentVersion = migration.toVersion;
  }

  return {
    ...migrated,
    schemaVersion: PROJECT_SCHEMA_VERSION,
  };
}

function normalizeSchemaVersion(value: unknown): number {
  return isValidSchemaVersion(value) ? value : 1;
}

function isValidSchemaVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
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
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).id !== "string" ||
      typeof (item as Record<string, unknown>).text !== "string" ||
      typeof (item as Record<string, unknown>).done !== "boolean"
    ) {
      return [];
    }

    const task = item as MvpTask;
    return [
      {
        id: task.id,
        text: task.text,
        done: task.done,
      },
    ];
  });
}
