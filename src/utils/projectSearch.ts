import { ProjectMetadata } from "../models/project";

export function filterProjectsByName(projects: ProjectMetadata[], searchTerm: string) {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  if (!normalizedTerm) {
    return projects;
  }

  return projects.filter((project) => project.name.toLowerCase().includes(normalizedTerm));
}

export function filterProjectsByType(projects: ProjectMetadata[], type: string | null) {
  if (!type) {
    return projects;
  }

  return projects.filter((project) => project.type === type);
}

export function filterProjectsByTag(projects: ProjectMetadata[], tag: string) {
  const normalizedTag = tag.trim().toLowerCase();

  if (!normalizedTag) {
    return projects;
  }

  return projects.filter((project) =>
    (project.tags ?? []).some((projectTag) => projectTag.toLowerCase().includes(normalizedTag))
  );
}

export function buildProjectDetail(project: {
  path: string;
  tags?: string[];
  nextAction?: string | null;
}): string {
  const parts = [project.path];

  if (project.tags && project.tags.length > 0) {
    parts.push(`Etiquetas: ${project.tags.join(", ")}`);
  }

  if (project.nextAction) {
    parts.push(`Siguiente: ${project.nextAction}`);
  }

  return parts.join(" · ");
}
