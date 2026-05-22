import * as vscode from "vscode";

export class LocalizationService {
  translate(
    message: string,
    ...args: Array<string | number | boolean | null | undefined>
  ): string {
    const values = args.filter(
      (value): value is string | number | boolean =>
        value !== null && value !== undefined
    );

    try {
      const translated = vscode.l10n.t(message, ...values);

      if (translated.trim().length > 0) {
        return translated;
      }
    } catch {
      // If the active language bundle is missing, we fall back to the base message below.
    }

    return formatMessage(message, values);
  }
}

function formatMessage(
  message: string,
  values: Array<string | number | boolean>
): string {
  return message.replace(/\{(\d+)\}/g, (_match, index: string) => {
    const value = values[Number(index)];
    return value === undefined ? _match : String(value);
  });
}
