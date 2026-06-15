export type MentionUserRecord = {
  id: string;
  email?: unknown;
  display_name?: unknown;
  name?: unknown;
  [key: string]: unknown;
};

const MENTION_PATTERN =
  /(^|[^\p{L}\p{N}_])@([\p{L}\p{N}](?:[\p{L}\p{N}._-]{0,30}[\p{L}\p{N}])?)/gu;

export function extractMentionHandles(value: string) {
  const handles = new Set<string>();

  for (const match of value.matchAll(MENTION_PATTERN)) {
    const handle = normalizeMentionHandle(match[2]);

    if (handle) {
      handles.add(handle);
    }
  }

  return Array.from(handles);
}

export function resolveMentionRecipients(
  users: MentionUserRecord[],
  handles: string[],
  actorUserId: string,
) {
  if (handles.length === 0) {
    return [];
  }

  const usersByHandle = new Map<string, MentionUserRecord[]>();

  for (const user of users) {
    if (user.id === actorUserId || isDeactivatedUserRecord(user)) {
      continue;
    }

    for (const handle of getMentionHandleCandidates(user)) {
      usersByHandle.set(handle, [...(usersByHandle.get(handle) ?? []), user]);
    }
  }

  const recipients = new Map<string, MentionUserRecord>();

  for (const handle of handles) {
    const matches = usersByHandle.get(handle) ?? [];

    if (matches.length === 1) {
      recipients.set(matches[0].id, matches[0]);
    }
  }

  return Array.from(recipients.values());
}

export function getMentionHandleCandidates(user: MentionUserRecord) {
  return getMentionHandleCandidateLabels(user).map((candidate) =>
    normalizeMentionHandle(candidate),
  );
}

export function getPreferredMentionHandle(
  user: MentionUserRecord,
  users: MentionUserRecord[],
  actorUserId: string,
) {
  const handleOwners = new Map<string, Set<string>>();

  for (const candidateUser of users) {
    if (candidateUser.id === actorUserId || isDeactivatedUserRecord(candidateUser)) {
      continue;
    }

    for (const handle of getMentionHandleCandidates(candidateUser)) {
      handleOwners.set(handle, (handleOwners.get(handle) ?? new Set()).add(candidateUser.id));
    }
  }

  for (const candidate of getMentionHandleCandidateLabels(user)) {
    const normalized = normalizeMentionHandle(candidate);

    if (normalized && handleOwners.get(normalized)?.size === 1) {
      return sanitizeMentionHandle(candidate);
    }
  }

  return "";
}

function getMentionHandleCandidateLabels(user: MentionUserRecord) {
  const displayName = getDisplayName(user);
  const displayParts = displayName.split(/\s+/).filter(Boolean);
  const firstName = displayParts[0] ?? "";
  const lastName = displayParts.length > 1 ? displayParts.at(-1) ?? "" : "";
  const emailLocalPart = getEmailLocalPart(user);
  const candidates = [
    firstName && lastName ? `${firstName}${lastName[0]}` : "",
    firstName,
    displayParts.map((part) => part[0]).join(""),
    displayName,
    emailLocalPart,
  ];

  return Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.trim())
        .filter((candidate) => normalizeMentionHandle(candidate).length >= 2),
    ),
  );
}

function sanitizeMentionHandle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function normalizeMentionHandle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase()
    .trim();
}

function getDisplayName(user: MentionUserRecord) {
  return asString(user.display_name) || asString(user.name) || asString(user.email);
}

function getEmailLocalPart(user: MentionUserRecord) {
  return asString(user.email).split("@")[0] ?? "";
}

function isDeactivatedUserRecord(user: MentionUserRecord) {
  return Boolean(asString(user.deactivated_at));
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
