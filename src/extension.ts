import * as vscode from "vscode";
import { initializeShipOne } from "./bootstrap/shiponeBootstrap";

export async function activate(context: vscode.ExtensionContext) {
  const disposables = await initializeShipOne(context);
  context.subscriptions.push(...disposables);
}

export function deactivate() {}
