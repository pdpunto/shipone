import { execFile } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";

const execFileAsync = promisify(execFile);

export class GithubService {
  async connectGithub(): Promise<void> {
    const ghInstalled = await this.isGithubCliInstalled();

    if (!ghInstalled) {
      vscode.window.showErrorMessage("GitHub CLI no esta instalado. Instala 'gh' y prueba otra vez.");
      return;
    }

    const githubReady = await this.isGithubAuthenticated();

    if (githubReady) {
      vscode.window.showInformationMessage("GitHub ya esta conectado.");
      return;
    }

    const terminal = vscode.window.createTerminal("ShipOne GitHub");
    terminal.show(true);
    terminal.sendText("gh auth login -h github.com");
    vscode.window.showInformationMessage("Abre la terminal para conectar GitHub.");
  }

  async isGithubAuthenticated(): Promise<boolean> {
    try {
      await execFileAsync("gh", ["auth", "status", "-h", "github.com"]);
      return true;
    } catch {
      return false;
    }
  }

  async createGithubRepo(
    folderUri: vscode.Uri,
    repoName: string,
    visibility: "private" | "public"
  ): Promise<string | null> {
    try {
      await execFileAsync(
        "gh",
        [
          "repo",
          "create",
          repoName,
          visibility === "private" ? "--private" : "--public",
          "--source",
          ".",
          "--remote",
          "origin",
          "--push",
          "--confirm",
        ],
        { cwd: folderUri.fsPath }
      );

      const { stdout } = await execFileAsync(
        "gh",
        ["repo", "view", "--json", "url", "--jq", ".url"],
        { cwd: folderUri.fsPath }
      );

      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  async isGithubCliInstalled(): Promise<boolean> {
    try {
      await execFileAsync("gh", ["--version"]);
      return true;
    } catch {
      return false;
    }
  }
}
