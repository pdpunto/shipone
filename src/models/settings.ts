export interface ShipOneSettings {
  projectsRoot: string;
  defaultVisibility: "private" | "public";
  openAfterCreate: boolean;
  inactiveWarningDays: number;
  staleWarningDays: number;
}
