import * as vscode from "vscode";
import { ShipOneSettings } from "../models/settings";

const CONFIG_SECTION = "shipone";

export class SettingsService {
  getSettings(): ShipOneSettings {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

    return {
      projectsRoot: config.get<string>("projectsRoot", "C:\\dev\\proyectos"),
      defaultVisibility: config.get<"private" | "public">("defaultVisibility", "private"),
      defaultProjectType: config.get<"blank" | "react-vite" | "nextjs" | "python">(
        "defaultProjectType",
        "blank"
      ),
      createGitRepoByDefault: config.get<boolean>("createGitRepoByDefault", true),
      createGitHubRepoByDefault: config.get<boolean>("createGitHubRepoByDefault", true),
      enforceOneActiveProject: config.get<boolean>("enforceOneActiveProject", true),
      openAfterCreate: config.get<boolean>("openAfterCreate", true),
      inactiveWarningDays: config.get<number>("inactiveWarningDays", 7),
      staleWarningDays: config.get<number>("staleWarningDays", 30),
      showFinishedProjects: config.get<boolean>("showFinishedProjects", true),
    };
  }
}
