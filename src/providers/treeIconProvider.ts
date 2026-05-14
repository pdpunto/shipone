import { ProjectMetadata, ProjectStatus } from "../models/project";

export class TreeIconProvider {
  getGroupIcon(status: ProjectStatus): string {
    switch (status) {
      case "active":
        return "play";
      case "idea":
        return "lightbulb";
      case "paused":
        return "debug-pause";
      case "finished":
        return "check";
    }
  }

  getMetricsIcon(): string {
    return "graph";
  }

  getMetricItemIcon(name: string): string {
    switch (name.toLowerCase()) {
      case "ideas":
        return "lightbulb";
      case "active":
        return "play";
      case "paused":
        return "debug-pause";
      case "finished":
        return "check";
      case "finish ratio":
        return "pie-chart";
      default:
        return "symbol-numeric";
    }
  }

  getEmptyStateIcon(): string {
    return "info";
  }

  getWarningIcon(): string {
    return "alert";
  }

  getFocusIcon(): string {
    return "eye";
  }

  getProjectIcon(project: ProjectMetadata): string {
    return project.favorite ? "star-full" : this.getGroupIcon(project.status);
  }
}
