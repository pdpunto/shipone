import { LocalizationService } from "./localizationService";

export const localizationService = new LocalizationService();

export function t(
  message: string,
  ...args: Array<string | number | boolean | null | undefined>
): string {
  return localizationService.translate(message, ...args);
}
