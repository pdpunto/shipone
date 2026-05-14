export interface ShipOneSettings {
  projectsRoot: string;
  defaultVisibility: "private" | "public";
  defaultProjectType: "blank" | "react-vite" | "nextjs" | "python" | "node-api";
  createGitRepoByDefault: boolean;
  createGitHubRepoByDefault: boolean;
  enforceOneActiveProject: boolean;
  createStatusFileByDefault: boolean;
  defaultPackageManager: "npm" | "pnpm" | "yarn";
  openAfterCreate: boolean;
  inactiveWarningDays: number;
  staleWarningDays: number;
  showFinishedProjects: boolean;
}
