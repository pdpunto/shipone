export type ProjectStatus = "idea" | "active" | "paused" | "finished";

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  type: string;
  status: ProjectStatus;
  path: string;
  repoUrl?: string | null;
  createdAt: string;
  lastOpenedAt?: string;
  finishedAt?: string | null;
  nextAction?: string | null;
  favorite?: boolean;
  tags?: string[];
}
