import * as vscode from "vscode";

export class LocalizationService {
  translate(
    message: string,
    ...args: Array<string | number | boolean | null | undefined>
  ): string {
    return vscode.l10n.t(
      message,
      ...args.filter(
        (value): value is string | number | boolean => value !== null && value !== undefined
      )
    );
  }
}
