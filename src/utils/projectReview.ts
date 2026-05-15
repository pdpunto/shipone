import { randomUUID } from "crypto";
import { ProjectMetadata } from "../models/project";

export function parseMvpTasks(
  rawValue: string,
  currentTasks: NonNullable<ProjectMetadata["mvpTasks"]>
) {
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

export function getFinishedThisWeek(
  projects: ProjectMetadata[]
): ProjectMetadata[] {
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
