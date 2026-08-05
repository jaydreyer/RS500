export const FEEDBACK_KINDS = ["idea", "bug", "question", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_STATUSES = [
  "received",
  "needs_clarification",
  "under_review",
  "deferred",
  "planned",
  "in_progress",
  "shipped",
  "not_planned",
  "resolved",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const IDEA_STATUSES = [
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "not_planned",
] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  received: "Received",
  needs_clarification: "Needs clarification",
  under_review: "Under review",
  deferred: "Saved for later",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  not_planned: "Not planned",
  resolved: "Resolved",
};

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  under_review: "Under review",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  not_planned: "Not planned",
};

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  idea: "Idea",
  bug: "Something is broken",
  question: "Question",
  other: "Other",
};

export type GitHubIssueReference = {
  repository: string;
  issueNumber: number;
  issueUrl: string;
};

export function parseFeedbackKind(value: unknown): FeedbackKind {
  const normalized = asString(value);

  if (FEEDBACK_KINDS.includes(normalized as FeedbackKind)) {
    return normalized as FeedbackKind;
  }

  throw new Error("Choose what kind of feedback this is.");
}

export function parseFeedbackStatus(value: unknown): FeedbackStatus {
  const normalized = asString(value);

  if (FEEDBACK_STATUSES.includes(normalized as FeedbackStatus)) {
    return normalized as FeedbackStatus;
  }

  throw new Error("Choose a valid feedback status.");
}

export function parseIdeaStatus(value: unknown): IdeaStatus {
  const normalized = asString(value);

  if (IDEA_STATUSES.includes(normalized as IdeaStatus)) {
    return normalized as IdeaStatus;
  }

  throw new Error("Choose a valid idea status.");
}

export function mapIdeaStatusToFeedbackStatus(status: IdeaStatus): FeedbackStatus {
  return status;
}

export function normalizeFeedbackText(
  value: unknown,
  {
    label,
    max,
    min = 1,
    optional = false,
  }: {
    label: string;
    max: number;
    min?: number;
    optional?: boolean;
  },
) {
  const text = asString(value).replace(/\r\n/g, "\n");

  if (!text && optional) {
    return "";
  }

  if (text.length < min) {
    throw new Error(`${label} must be at least ${min} characters.`);
  }

  if (text.length > max) {
    throw new Error(`${label} must be ${max} characters or less.`);
  }

  return text;
}

export function parseGitHubIssueUrl(value: unknown): GitHubIssueReference {
  const raw = asString(value);
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a complete GitHub issue URL.");
  }

  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
    throw new Error("Use an https://github.com issue URL.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[2] !== "issues") {
    throw new Error("Use a GitHub issue URL such as https://github.com/owner/repo/issues/123.");
  }

  const issueNumber = Number.parseInt(parts[3], 10);
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1 || String(issueNumber) !== parts[3]) {
    throw new Error("The GitHub issue URL has an invalid issue number.");
  }

  const owner = parts[0];
  const repo = parts[1];

  if (!isGitHubName(owner) || !isGitHubName(repo)) {
    throw new Error("The GitHub issue URL has an invalid repository.");
  }

  return {
    repository: `${owner}/${repo}`,
    issueNumber,
    issueUrl: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
  };
}

export function githubIssueStateToIdeaStatus({
  labels,
  state,
  stateReason,
}: {
  labels: readonly string[];
  state: string;
  stateReason?: string;
}): IdeaStatus | null {
  const normalizedLabels = new Set(labels.map((label) => label.trim().toLowerCase()));

  if (
    stateReason?.toLowerCase() === "not_planned"
    || normalizedLabels.has("status:not-planned")
    || normalizedLabels.has("not planned")
  ) {
    return "not_planned";
  }
  if (normalizedLabels.has("status:shipped") || normalizedLabels.has("shipped")) {
    return "shipped";
  }
  if (state.toLowerCase() === "closed") {
    return "shipped";
  }
  if (normalizedLabels.has("status:in-progress") || normalizedLabels.has("in progress")) {
    return "in_progress";
  }
  if (normalizedLabels.has("status:planned") || normalizedLabels.has("planned")) {
    return "planned";
  }
  if (normalizedLabels.has("feedback:reviewing") || normalizedLabels.has("under review")) {
    return "under_review";
  }

  return null;
}

function isGitHubName(value: string) {
  return /^[A-Za-z0-9_.-]+$/.test(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
