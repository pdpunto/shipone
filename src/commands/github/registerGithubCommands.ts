import * as vscode from "vscode";
import type { ProjectCreationService } from "../../services/projectCreationService";

const COMMAND_CONNECT_GITHUB = "shipone.connectGithub";

export function registerGithubCommands(options: {
  projectCreationService: ProjectCreationService;
}): vscode.Disposable[] {
  const { projectCreationService } = options;

  const connectGithubCommand = vscode.commands.registerCommand(
    COMMAND_CONNECT_GITHUB,
    async () => {
      await projectCreationService.connectGitHub();
    }
  );

  return [connectGithubCommand];
}
