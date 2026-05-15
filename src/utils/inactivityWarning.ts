export function getInactivityWarning(
  lastOpenedAt: string | undefined,
  inactiveWarningDays: number,
  staleWarningDays: number
): string | null {
  const ageDays = getInactivityAgeDays(lastOpenedAt);
  if (ageDays === null) {
    return null;
  }

  if (ageDays >= staleWarningDays) {
    return `stale ${ageDays}d`;
  }

  if (ageDays >= inactiveWarningDays) {
    return `inactive ${ageDays}d`;
  }

  return null;
}

export function describeInactivityWarning(
  lastOpenedAt: string | undefined,
  inactiveWarningDays: number,
  staleWarningDays: number
): string | null {
  const ageDays = getInactivityAgeDays(lastOpenedAt);
  if (ageDays === null) {
    return null;
  }

  if (ageDays >= staleWarningDays) {
    return `Obsoleto hace ${ageDays} días`;
  }

  if (ageDays >= inactiveWarningDays) {
    return `Inactivo hace ${ageDays} días`;
  }

  return null;
}

function getInactivityAgeDays(lastOpenedAt: string | undefined): number | null {
  if (!lastOpenedAt) {
    return null;
  }

  const openedAt = new Date(lastOpenedAt);
  if (Number.isNaN(openedAt.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - openedAt.getTime()) / 86_400_000);
}
