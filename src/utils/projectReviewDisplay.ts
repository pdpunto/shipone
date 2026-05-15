import { t } from "../localization";

export function buildPausedProjectDescription(
  pauseReason: string | null | undefined,
  nextAction: string | null | undefined,
  pauseNote: string | null | undefined
): string {
  return [
    t("Pausado"),
    pauseReason ? t("Motivo: {0}", pauseReason) : undefined,
    nextAction ? t("Siguiente: {0}", nextAction) : undefined,
    pauseNote ? t("Nota: {0}", pauseNote) : undefined,
  ]
    .filter(Boolean)
    .join(" \u00b7 ");
}
