export interface ShipOneSettings {
  projectsRoot: string;
  defaultVisibility: "private" | "public";
  defaultProjectType: "blank" | "react-vite" | "nextjs" | "python" | "node-api";
  createGitRepoByDefault: boolean;
  createGitHubRepoByDefault: boolean;
  enforceOneActiveProject: boolean;
  createStatusFileByDefault: boolean;
  defaultPackageManager: "npm" | "pnpm" | "yarn";
  customTemplateFolder: string;
  openAfterCreate: boolean;
  inactiveWarningDays: number;
  staleWarningDays: number;
  showFinishedProjects: boolean;
}
