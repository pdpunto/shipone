import type * as vscode from "vscode";
import { ShipOneApp } from "./shiponeApp";

export async function initializeShipOne(
  context: vscode.ExtensionContext
): Promise<vscode.Disposable[]> {
  const app = new ShipOneApp(context);
  return app.init();
}
