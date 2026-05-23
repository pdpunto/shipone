import { t } from "../localization";
import { translationKeys as k } from "../localization/keys";

export type HealthIssueGroup = {
  label: string;
  issues: string[];
};

const ISSUE_GROUPS: Array<{
  label: string;
  issues: Set<string>;
}> = [
  {
    label: t(k.issueGroup.documentation),
    issues: new Set([
      "empty-readme",
      "no-readme",
      "no-status",
      "no-package-json",
      "no-requirements",
    ]),
  },
  {
    label: t(k.issueGroup.planning),
    issues: new Set(["missing-next-action"]),
  },
  {
    label: t(k.issueGroup.activity),
    issues: new Set(["inactive-active", "no-recent-commits"]),
  },
];

export function groupHealthIssues(issues: string[]): HealthIssueGroup[] {
  const grouped = ISSUE_GROUPS.map((group) => ({
    label: group.label,
    issues: issues.filter((issue) => group.issues.has(issue)),
  })).filter((group) => group.issues.length > 0);

  const knownIssues = new Set(
    ISSUE_GROUPS.flatMap((group) => [...group.issues])
  );
  const unknownIssues = issues.filter((issue) => !knownIssues.has(issue));

  if (unknownIssues.length > 0) {
    grouped.push({
      label: t(k.issueGroup.other),
      issues: unknownIssues,
    });
  }

  return grouped;
}

export function formatGroupedHealthIssues(
  issues: string[]
): string | undefined {
  if (issues.length === 0) {
    return undefined;
  }

  const grouped = groupHealthIssues(issues);
  const segments = grouped.map((group) =>
    t(
      "{0}: {1}",
      group.label,
      group.issues.map((issue) => renderIssueLabel(issue)).join(", ")
    )
  );

  return segments.length === 1
    ? t("Problema: {0}", segments[0])
    : t("Problemas: {0}", segments.join(" \u00b7 "));
}

function renderIssueLabel(issue: string): string {
  switch (issue) {
    case "empty-readme":
      return t(k.issue.emptyReadme);
    case "missing-next-action":
      return t(k.issue.missingNextAction);
    case "inactive-active":
      return t(k.issue.inactiveActive);
    case "no-readme":
      return t(k.issue.noReadme);
    case "no-status":
      return t(k.issue.noStatus);
    case "no-package-json":
      return t(k.issue.noPackageJson);
    case "no-requirements":
      return t(k.issue.noRequirements);
    case "no-recent-commits":
      return t(k.issue.noRecentCommits);
    default:
      return issue;
  }
}
