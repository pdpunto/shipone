import * as vscode from "vscode";
import type { ProjectMetadata, ProjectStatus } from "../models/project";

export class TreeIconProvider {
  getGroupIcon(status: ProjectStatus): vscode.ThemeIcon {
    switch (status) {
      case "active":
        return new vscode.ThemeIcon("play", new vscode.ThemeColor("charts.green"));
      case "idea":
        return new vscode.ThemeIcon("lightbulb", new vscode.ThemeColor("charts.blue"));
      case "paused":
        return new vscode.ThemeIcon("debug-pause", new vscode.ThemeColor("charts.orange"));
      case "finished":
        return new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.purple"));
    }
  }

  getMetricsIcon(): vscode.ThemeIcon {
    return new vscode.ThemeIcon("graph", new vscode.ThemeColor("charts.blue"));
  }

  getMetricItemIcon(name: string): vscode.ThemeIcon {
    switch (name.toLowerCase()) {
      case "ideas":
        return new vscode.ThemeIcon("lightbulb", new vscode.ThemeColor("charts.blue"));
      case "active":
        return new vscode.ThemeIcon("play", new vscode.ThemeColor("charts.green"));
      case "paused":
        return new vscode.ThemeIcon("debug-pause", new vscode.ThemeColor("charts.orange"));
      case "finished":
        return new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.purple"));
      case "finish ratio":
        return new vscode.ThemeIcon("pie-chart", new vscode.ThemeColor("charts.green"));
      default:
        return new vscode.ThemeIcon("symbol-numeric", new vscode.ThemeColor("foreground"));
    }
  }

  getEmptyStateIcon(): vscode.ThemeIcon {
    return new vscode.ThemeIcon("info", new vscode.ThemeColor("charts.blue"));
  }

  getWarningIcon(): vscode.ThemeIcon {
    return new vscode.ThemeIcon("alert", new vscode.ThemeColor("charts.orange"));
  }

  getFocusIcon(): vscode.ThemeIcon {
    return new vscode.ThemeIcon("eye", new vscode.ThemeColor("charts.green"));
  }

  getProjectIcon(project: ProjectMetadata): vscode.ThemeIcon {
    if (project.favorite) {
      return new vscode.ThemeIcon("star-full", new vscode.ThemeColor("charts.yellow"));
    }

    return this.getGroupIcon(project.status);
  }
}
