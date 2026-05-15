import { execFile } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import { t } from "../localization";

const execFileAsync = promisify(execFile);

export class GitHubService {
  private readonly outputChannel =
    vscode.window.createOutputChannel("ShipOne GitHub");

  async connectGitHub(): Promise<void> {
    const ghInstalled = await this.isGitHubCliInstalled();

    if (!ghInstalled) {
      vscode.window.showErrorMessage(
        t("GitHub CLI no esta instalado. Instala 'gh' y prueba otra vez.")
      );
      return;
    }

    const githubReady = await this.isGitHubAuthenticated();

    if (githubReady) {
      vscode.window.showInformationMessage(t("GitHub ya esta conectado."));
      return;
    }

    const terminal = vscode.window.createTerminal("ShipOne GitHub");
    terminal.show(true);
    terminal.sendText("gh auth login -h github.com");
    vscode.window.showInformationMessage(
      t("Abre la terminal para conectar GitHub.")
    );
  }

  async isGitHubAuthenticated(): Promise<boolean> {
    try {
      await execFileAsync("gh", ["auth", "status", "-h", "github.com"]);
      return true;
    } catch (error) {
      this.logError("No se pudo comprobar autenticacion de GitHub.", error);
      return false;
    }
  }

  async createGitHubRepo(
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
    } catch (error) {
      this.logError("No se pudo crear el repo de GitHub.", error);
      return null;
    }
  }

  async isGitHubCliInstalled(): Promise<boolean> {
    try {
      await execFileAsync("gh", ["--version"]);
      return true;
    } catch (error) {
      this.logError("No se pudo verificar GitHub CLI.", error);
      return false;
    }
  }

  private logError(message: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.outputChannel.appendLine(`[error] ${message}`);
    this.outputChannel.appendLine(detail);
  }
}
