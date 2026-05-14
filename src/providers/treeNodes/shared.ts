import { ProjectMetadata, ProjectStatus } from "../../models/project";

export function getStatusIcon(status: ProjectStatus): string {
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

export function getMvpProgress(
  tasks: ProjectMetadata["mvpTasks"]
): string | null {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  const done = tasks.filter((task) => task.done).length;
  return `${done}/${tasks.length}`;
}

export function formatProjectType(type: string): string {
  switch (type) {
    case "blank":
      return "Blank";
    case "react-vite":
      return "React Vite";
    case "nextjs":
      return "Next.js";
    case "python":
      return "Python";
    default:
      return type;
  }
}
