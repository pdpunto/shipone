import * as vscode from "vscode";

export type TodoTask = {
  kind: "TODO" | "FIXME";
  fileName: string;
  text: string;
  line: number;
  uri: vscode.Uri;
};

export class TodoScannerService {
  async scanProjectTodoTasks(projectPath: string): Promise<TodoTask[]> {
    const rootUri = vscode.Uri.file(projectPath);
    const tasks: TodoTask[] = [];

    await this.walkTodoFiles(rootUri, tasks);
    return tasks;
  }

  private async walkTodoFiles(
    dirUri: vscode.Uri,
    tasks: TodoTask[]
  ): Promise<void> {
    const entries = await vscode.workspace.fs.readDirectory(dirUri);

    for (const [name, type] of entries) {
      if (
        name === ".git" ||
        name === "node_modules" ||
        name === "out" ||
        name === "dist"
      ) {
        continue;
      }

      const childUri = vscode.Uri.joinPath(dirUri, name);

      if (type === vscode.FileType.Directory) {
        await this.walkTodoFiles(childUri, tasks);
        continue;
      }

      if (type !== vscode.FileType.File || !this.isLikelyTodoTextFile(name)) {
        continue;
      }

      const fileTasks = await this.readTodoTasksFromFile(childUri);
      tasks.push(...fileTasks);
    }
  }

  private async readTodoTasksFromFile(uri: vscode.Uri): Promise<TodoTask[]> {
    try {
      const raw = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(raw);
      const lines = text.split(/\r?\n/);
      const tasks: TodoTask[] = [];

      lines.forEach((line, index) => {
        const match = line.match(/\b(TODO|FIXME)\b[:\s-]?(.*)/i);
        if (!match) {
          return;
        }

        const kind = match[1].toUpperCase() as "TODO" | "FIXME";
        const text = match[2].trim() || line.trim();

        tasks.push({
          kind,
          fileName: vscode.workspace.asRelativePath(uri, false),
          text,
          line: index + 1,
          uri,
        });
      });

      return tasks;
    } catch {
      return [];
    }
  }

  private isLikelyTodoTextFile(fileName: string): boolean {
    const lower = fileName.toLowerCase();

    if (
      lower === "readme" ||
      lower === "readme.md" ||
      lower === "license" ||
      lower === "license.md" ||
      lower === ".gitignore"
    ) {
      return true;
    }

    return [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".json",
      ".md",
      ".py",
      ".css",
      ".html",
      ".htm",
      ".yaml",
      ".yml",
      ".txt",
      ".toml",
      ".ini",
      ".sh",
    ].some((extension) => lower.endsWith(extension));
  }
}
