import * as vscode from "vscode";
import { ShipOneSettings } from "../models/settings";

const CONFIG_SECTION = "shipone";

export class SettingsService {
  getSettings(): ShipOneSettings {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

    return {
      projectsRoot: config.get<string>("projectsRoot", "C:\\dev\\proyectos"),
      defaultVisibility: config.get<"private" | "public">("defaultVisibility", "private"),
      openAfterCreate: config.get<boolean>("openAfterCreate", true),
    };
  }
}
