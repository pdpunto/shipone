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

export function buildWeeklyReviewSummaryLines(summary: {
  activeName: string | null;
  pausedCount: number;
  finishedThisWeekCount: number;
}): string {
  return [
    t("Activo: {0}", summary.activeName ?? t("ninguno")),
    t("Pausados: {0}", summary.pausedCount),
    t("Terminados esta semana: {0}", summary.finishedThisWeekCount),
  ].join(" | ");
}
