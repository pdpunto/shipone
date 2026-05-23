import { execFile } from "child_process";
import { promisify } from "util";
import type * as vscode from "vscode";

const execFileAsync = promisify(execFile);

export class GitService {
  async isGitRepository(folderUri: vscode.Uri): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["rev-parse", "--is-inside-work-tree"],
        { cwd: folderUri.fsPath }
      );
      return stdout.trim() === "true";
    } catch {
      return false;
    }
  }

  async initializeGit(folderUri: vscode.Uri): Promise<boolean> {
    try {
      await execFileAsync("git", ["init"], { cwd: folderUri.fsPath });
      return true;
    } catch {
      return false;
    }
  }

  async createInitialCommit(folderUri: vscode.Uri): Promise<boolean> {
    try {
      await execFileAsync("git", ["add", "."], { cwd: folderUri.fsPath });
      await execFileAsync("git", ["commit", "-m", "chore: initial commit"], {
        cwd: folderUri.fsPath,
      });
      await execFileAsync("git", ["branch", "-M", "main"], {
        cwd: folderUri.fsPath,
      });
      return true;
    } catch {
      return false;
    }
  }
}
