import * as vscode from "vscode";
import { t } from "../localization";
import { dirname, relative } from "path";
import type { ShipOneSettings } from "../models/settings";

type TemplateContext = {
  folderUri: vscode.Uri;
  projectName: string;
  description: string;
  packageManager: ShipOneSettings["defaultPackageManager"];
  gitignore: string;
};

type TemplateDefinition = {
  type: ShipOneSettings["defaultProjectType"];
  buildFiles: (context: TemplateContext) => TemplateFile[];
};

type TemplateFile = { uri: vscode.Uri; content: string };

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    type: "blank",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "README.md"),
        content: [
          `# ${context.projectName}`,
          "",
          context.description || t("Proyecto creado con ShipOne."),
          "",
          t("## Proximo paso"),
          t("- Define el primer objetivo."),
          "",
        ].join("\n"),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"),
        content: context.gitignore,
      },
    ],
  },
  {
    type: "react-vite",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "package.json"),
        content: JSON.stringify(
          {
            name: sanitizePackageName(context.projectName),
            private: true,
            version: "0.0.0",
            packageManager: formatPackageManager(context.packageManager),
            scripts: {
              dev: "vite",
              build: "vite build",
              preview: "vite preview",
            },
          },
          null,
          2
        ),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "index.html"),
        content: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${context.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "src", "main.tsx"),
        content: `import "./style.css";

const root = document.getElementById("root");

if (root) {
  root.innerHTML = \`
    <main class="app">
      <h1>${context.projectName}</h1>
      <p>${t("Proyecto creado con ShipOne.")}</p>
    </main>
  \`;
}
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "src", "style.css"),
        content: `body {
  font-family: system-ui, sans-serif;
  margin: 0;
}

.app {
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
}
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"),
        content: context.gitignore,
      },
    ],
  },
  {
    type: "nextjs",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "package.json"),
        content: JSON.stringify(
          {
            name: sanitizePackageName(context.projectName),
            private: true,
            version: "0.0.0",
            packageManager: formatPackageManager(context.packageManager),
            scripts: {
              dev: "next dev",
              build: "next build",
              start: "next start",
            },
          },
          null,
          2
        ),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "app", "layout.tsx"),
        content: `export const metadata = {
  title: "${context.projectName}",
  description: "${escapeForTsx(context.description || t("Proyecto creado con ShipOne."))}",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "app", "page.tsx"),
        content: `export default function Page() {
  return (
    <main>
      <h1>${context.projectName}</h1>
      <p>${escapeForTsx(context.description || t("Proyecto creado con ShipOne."))}</p>
    </main>
  );
}
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"),
        content: context.gitignore,
      },
    ],
  },
  {
    type: "python",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "main.py"),
        content: [
          '"""',
          context.projectName,
          context.description || t("Proyecto creado con ShipOne."),
          '"""',
          "",
          "def main() -> None:",
          `    print("${escapeForPython(context.projectName)}")`,
          "",
          "",
          'if __name__ == "__main__":',
          "    main()",
          "",
        ].join("\n"),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "requirements.txt"),
        content: "# Requisitos del proyecto\n",
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"),
        content: context.gitignore,
      },
    ],
  },
  {
    type: "node-api",
    buildFiles: (context) => [
      {
        uri: vscode.Uri.joinPath(context.folderUri, "package.json"),
        content: JSON.stringify(
          {
            name: sanitizePackageName(context.projectName),
            private: true,
            version: "0.0.0",
            packageManager: formatPackageManager(context.packageManager),
            scripts: {
              dev: "node --watch src/index.js",
              start: "node src/index.js",
            },
          },
          null,
          2
        ),
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, "src", "index.js"),
        content: `const http = require("http");

const port = Number(process.env.PORT ?? 3000);

const server = http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("ShipOne API");
});

server.listen(port, () => {
  console.log("ShipOne API running on http://localhost:" + port);
});
`,
      },
      {
        uri: vscode.Uri.joinPath(context.folderUri, ".gitignore"),
        content: context.gitignore,
      },
    ],
  },
];

export class TemplateService {
  async createSelectedTemplate(
    folderUri: vscode.Uri,
    projectName: string,
    description: string,
    type: ShipOneSettings["defaultProjectType"],
    packageManager: ShipOneSettings["defaultPackageManager"],
    customTemplateFolder: string
  ): Promise<void> {
    const templates = [
      ...(await this.getCustomTemplateFiles(
        folderUri,
        customTemplateFolder,
        type
      )),
      ...this.getTemplateFiles(
        folderUri,
        projectName,
        description,
        type,
        packageManager
      ),
    ];

    for (const file of templates) {
      await this.writeFileIfMissing(file.uri, file.content);
    }
  }

  private getTemplateFiles(
    folderUri: vscode.Uri,
    projectName: string,
    description: string,
    type: ShipOneSettings["defaultProjectType"],
    packageManager: ShipOneSettings["defaultPackageManager"]
  ): TemplateFile[] {
    const gitignore = [
      "node_modules/",
      ".venv/",
      "__pycache__/",
      ".DS_Store",
      ".env",
      "",
    ].join("\n");
    const definition =
      TEMPLATE_DEFINITIONS.find((item) => item.type === type) ??
      TEMPLATE_DEFINITIONS[0];
    return definition.buildFiles({
      folderUri,
      projectName,
      description,
      packageManager,
      gitignore,
    });
  }

  private async getCustomTemplateFiles(
    destinationRootUri: vscode.Uri,
    customTemplateFolder: string,
    type: ShipOneSettings["defaultProjectType"]
  ): Promise<TemplateFile[]> {
    if (!customTemplateFolder.trim()) {
      return [];
    }

    const rootUri = vscode.Uri.file(customTemplateFolder);
    if (!(await this.pathExists(rootUri))) {
      return [];
    }

    const typeUri = vscode.Uri.joinPath(rootUri, type);
    const sourceUri = (await this.pathExists(typeUri)) ? typeUri : rootUri;

    return this.collectTemplateFiles(sourceUri, destinationRootUri, sourceUri);
  }

  private async collectTemplateFiles(
    sourceRootUri: vscode.Uri,
    destinationRootUri: vscode.Uri,
    currentUri: vscode.Uri
  ): Promise<TemplateFile[]> {
    const entries = await vscode.workspace.fs.readDirectory(currentUri);
    const files: TemplateFile[] = [];

    for (const [name, type] of entries) {
      if (
        name === ".git" ||
        name === "node_modules" ||
        name === "out" ||
        name === "dist"
      ) {
        continue;
      }

      const entryUri = vscode.Uri.joinPath(currentUri, name);
      if (type === vscode.FileType.Directory) {
        files.push(
          ...(await this.collectTemplateFiles(
            sourceRootUri,
            destinationRootUri,
            entryUri
          ))
        );
        continue;
      }

      if (type !== vscode.FileType.File) {
        continue;
      }

      const content = new TextDecoder().decode(
        await vscode.workspace.fs.readFile(entryUri)
      );
      const targetRelativePath = relative(
        sourceRootUri.fsPath,
        entryUri.fsPath
      );

      files.push({
        uri: vscode.Uri.joinPath(
          destinationRootUri,
          ...targetRelativePath.split(/[\\/]+/).filter(Boolean)
        ),
        content,
      });
    }

    return files;
  }

  private async writeFileIfMissing(
    uri: vscode.Uri,
    content: string
  ): Promise<void> {
    if (await this.pathExists(uri)) {
      return;
    }

    await vscode.workspace.fs.createDirectory(
      vscode.Uri.file(dirname(uri.fsPath))
    );
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  }

  private async pathExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}

export function sanitizePackageName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeForTsx(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeForPython(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatPackageManager(
  value: ShipOneSettings["defaultPackageManager"]
): string {
  switch (value) {
    case "pnpm":
      return "pnpm@latest";
    case "yarn":
      return "yarn@latest";
    default:
      return "npm@latest";
  }
}
