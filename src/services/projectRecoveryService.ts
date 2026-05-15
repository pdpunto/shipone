import { ProjectStoreService } from "./projectStoreService";

export class ProjectRecoveryService {
  constructor(private readonly projectStore: ProjectStoreService) {}

  recoverFromBackup(): Promise<boolean> {
    return this.projectStore.recoverFromBackup();
  }
}
