import { execFile } from "child_process";
import * as vscode from "vscode";
import { promisify } from "util";
import { t } from "../localization";
import { translationKeys as k } from "../localization/keys";

const execFileAsync = promisify(execFile);
const GITHUB_PROVIDER_ID = "github";
const GITHUB_SCOPES = ["repo"];
const GITHUB_API_VERSION = "2022-11-28";

export class GitHubService {
  private readonly outputChannel =
    vscode.window.createOutputChannel("ShipOne GitHub");

  async connectGitHub(): Promise<void> {
    const githubReady = await this.getGitHubSession(true);
    if (githubReady) {
      vscode.window.showInformationMessage(t(k.github.connected));
      return;
    }

    vscode.window.showWarningMessage(t(k.github.notAuthenticated));
  }

  async isGitHubAuthenticated(): Promise<boolean> {
    return (await this.getGitHubSession(false)) !== undefined;
  }

  async createGitHubRepo(
    folderUri: vscode.Uri,
    repoName: string,
    visibility: "private" | "public"
  ): Promise<string | null> {
    try {
      const session = await this.getGitHubSession(true);
      if (!session) {
        return null;
      }

      const createdRepo = await this.createAuthenticatedRepo(
        session.accessToken,
        repoName,
        visibility
      );

      if (!createdRepo) {
        return null;
      }

      await this.configureOriginAndPush(folderUri, createdRepo.clone_url);

      return createdRepo.html_url ?? createdRepo.clone_url ?? null;
    } catch (error) {
      this.logError("No se pudo crear el repo de GitHub.", error);
      return null;
    }
  }

  async deleteGitHubRepo(repoUrl: string): Promise<boolean> {
    const repoSlug = this.parseRepoSlug(repoUrl);
    if (!repoSlug) {
      this.logError(
        "No se pudo resolver el nombre del repo de GitHub para borrar.",
        repoUrl
      );
      return false;
    }

    try {
      const session = await this.getGitHubSession(false);
      if (!session) {
        return false;
      }

      const response = await fetch(`https://api.github.com/repos/${repoSlug}`, {
        method: "DELETE",
        headers: this.buildGitHubHeaders(session.accessToken),
      });

      if (response.ok) {
        return true;
      }

      const body = await this.readResponseBody(response);
      throw new Error(body || `GitHub repo delete failed (${response.status})`);
    } catch (error) {
      this.logError("No se pudo borrar el repo de GitHub.", error);
      return false;
    }
  }

  private async getGitHubSession(
    allowInteractiveSession: boolean
  ): Promise<vscode.AuthenticationSession | undefined> {
    try {
      return await vscode.authentication.getSession(
        GITHUB_PROVIDER_ID,
        GITHUB_SCOPES,
        {
          createIfNone: allowInteractiveSession
            ? {
                detail: t(k.github.notAuthenticated),
              }
            : false,
        }
      );
    } catch (error) {
      this.logError("No se pudo obtener la sesion de GitHub en VS Code.", error);
      return undefined;
    }
  }

  private async createAuthenticatedRepo(
    token: string,
    repoName: string,
    visibility: "private" | "public"
  ): Promise<{ html_url?: string; clone_url: string } | null> {
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: this.buildGitHubHeaders(token),
      body: JSON.stringify({
        name: repoName,
        private: visibility === "private",
        has_issues: true,
        has_projects: true,
        has_wiki: true,
        auto_init: false,
      }),
    });

    if (!response.ok) {
      const body = await this.readResponseBody(response);
      throw new Error(body || `GitHub repo create failed (${response.status})`);
    }

    return (await response.json()) as { html_url?: string; clone_url: string };
  }

  private async configureOriginAndPush(
    folderUri: vscode.Uri,
    remoteUrl: string
  ): Promise<void> {
    await execFileAsync("git", ["remote", "remove", "origin"], {
      cwd: folderUri.fsPath,
    }).catch(() => undefined);

    await execFileAsync("git", ["remote", "add", "origin", remoteUrl], {
      cwd: folderUri.fsPath,
    });
    await execFileAsync("git", ["push", "-u", "origin", "main"], {
      cwd: folderUri.fsPath,
    });
  }

  private buildGitHubHeaders(token: string): Record<string, string> {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "Content-Type": "application/json",
    };
  }

  private async readResponseBody(response: Response): Promise<string> {
    try {
      return (await response.text()).trim();
    } catch {
      return "";
    }
  }

  private logError(message: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.outputChannel.appendLine(`[error] ${message}`);
    this.outputChannel.appendLine(detail);
  }

  private parseRepoSlug(repoUrl: string): string | undefined {
    try {
      const parsed = new URL(repoUrl);
      const segments = parsed.pathname.split("/").filter(Boolean);

      if (segments.length < 2) {
        return undefined;
      }

      return `${segments[0]}/${segments[1].replace(/\.git$/i, "")}`;
    } catch {
      return undefined;
    }
  }
}
