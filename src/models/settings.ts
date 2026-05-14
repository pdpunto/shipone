export interface ShipOneSettings {
  projectsRoot: string;
  defaultVisibility: "private" | "public";
  defaultProjectType: "blank" | "react-vite" | "nextjs" | "python";
  createGitRepoByDefault: boolean;
  createGitHubRepoByDefault: boolean;
  openAfterCreate: boolean;
  inactiveWarningDays: number;
  staleWarningDays: number;
  showFinishedProjects: boolean;
}
