import "server-only";

import type PocketBase from "pocketbase";

import {
  createSuperuserPocketBase,
  getClubUserAvatarUrl,
  getClubUserDisplayName,
  getClubUserInitials,
  getPocketBaseUrl,
  type ClubUser,
} from "@/lib/auth";
import {
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  IDEA_STATUSES,
  type FeedbackKind,
  type FeedbackStatus,
  type IdeaStatus,
} from "@/lib/feedback-rules";

export type FeedbackPerson = {
  id: string;
  displayName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
};

export type FeedbackMessage = {
  id: string;
  body: string;
  created: string;
  fromAdmin: boolean;
  author: FeedbackPerson;
};

export type FeedbackIdea = {
  id: string;
  title: string;
  summary: string;
  status: IdeaStatus;
  response: string;
  supportCount: number;
  isSupported: boolean;
  supportReason: string;
  created: string;
  updated: string;
};

export type FeedbackSubmission = {
  id: string;
  kind: FeedbackKind;
  title: string;
  body: string;
  status: FeedbackStatus;
  pageContext: string;
  screenshotUrl: string | null;
  userUnread: boolean;
  created: string;
  updated: string;
  user: FeedbackPerson;
  idea: FeedbackIdea | null;
  messages: FeedbackMessage[];
};

export type FeedbackWorkLink = {
  id: string;
  submissionId: string | null;
  ideaId: string | null;
  repository: string;
  issueNumber: number;
  issueUrl: string;
  state: string;
};

export type FeedbackInternalNote = {
  id: string;
  submissionId: string;
  body: string;
  created: string;
  author: FeedbackPerson;
};

export type FeedbackHubState = {
  ideas: FeedbackIdea[];
  submissions: FeedbackSubmission[];
  unreadCount: number;
};

export type FeedbackAdminState = {
  ideas: FeedbackIdea[];
  submissions: FeedbackSubmission[];
  notes: FeedbackInternalNote[];
  workLinks: FeedbackWorkLink[];
};

type RecordLike = {
  id: string;
  created?: string;
  updated?: string;
  collectionName?: string;
  collectionId?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function getFeedbackHubState(
  pb: PocketBase,
  currentUser: ClubUser,
): Promise<FeedbackHubState> {
  const [ideaRecords, supportRecords, submissionRecords, messageRecords] = await Promise.all([
    pb.collection("feedback_ideas").getFullList({
      sort: "-support_count,-updated",
      requestKey: null,
    }),
    pb.collection("feedback_idea_support").getFullList({
      filter: pb.filter("user = {:user}", { user: currentUser.id }),
      requestKey: null,
    }),
    pb.collection("feedback_submissions").getFullList({
      filter: pb.filter("user = {:user}", { user: currentUser.id }),
      expand: "user,idea",
      sort: "-updated",
      requestKey: null,
    }),
    pb.collection("feedback_messages").getFullList({
      expand: "author",
      sort: "created",
      requestKey: null,
    }),
  ]);

  const supportsByIdea = new Map(
    supportRecords.map((record) => [
      asString(record.idea),
      {
        reason: asString(record.reason),
      },
    ]),
  );
  const ideas = ideaRecords.map((record) => mapIdea(record, supportsByIdea));
  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]));
  const messagesBySubmission = groupMessages(messageRecords);
  const submissions = submissionRecords.map((record) =>
    mapSubmission(record, {
      ideasById,
      messagesBySubmission,
    }),
  );

  return {
    ideas,
    submissions,
    unreadCount: submissions.filter((submission) => submission.userUnread).length,
  };
}

export async function getFeedbackAdminState(currentUser: ClubUser): Promise<FeedbackAdminState> {
  if (!currentUser.isAdmin) {
    throw new Error("Forbidden.");
  }

  const pb = await createSuperuserPocketBase();
  const [
    ideaRecords,
    submissionRecords,
    messageRecords,
    supportRecords,
    noteRecords,
    workLinkRecords,
  ] = await Promise.all([
    pb.collection("feedback_ideas").getFullList({
      sort: "-support_count,-updated",
      requestKey: null,
    }),
    pb.collection("feedback_submissions").getFullList({
      expand: "user,idea",
      sort: "-updated",
      requestKey: null,
    }),
    pb.collection("feedback_messages").getFullList({
      expand: "author",
      sort: "created",
      requestKey: null,
    }),
    pb.collection("feedback_idea_support").getFullList({
      requestKey: null,
    }),
    pb.collection("feedback_internal_notes").getFullList({
      expand: "author",
      sort: "created",
      requestKey: null,
    }),
    pb.collection("feedback_work_links").getFullList({
      sort: "-created",
      requestKey: null,
    }),
  ]);

  const supportCountByIdea = countByRelation(supportRecords, "idea");
  const ideas = ideaRecords.map((record) =>
    mapIdea(record, new Map(), supportCountByIdea.get(record.id)),
  );
  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]));
  const messagesBySubmission = groupMessages(messageRecords);

  return {
    ideas,
    submissions: submissionRecords.map((record) =>
      mapSubmission(record, {
        ideasById,
        messagesBySubmission,
      }),
    ),
    notes: noteRecords.map(mapInternalNote),
    workLinks: workLinkRecords.map(mapWorkLink),
  };
}

export async function getFeedbackUnreadCount(pb: PocketBase, userId: string) {
  try {
    const result = await pb.collection("feedback_submissions").getList(1, 1, {
      filter: pb.filter("user = {:user} && user_unread = true", { user: userId }),
      requestKey: null,
    });

    return result.totalItems;
  } catch {
    return 0;
  }
}

export async function markFeedbackRead(currentUser: ClubUser, submissionIds: string[]) {
  if (submissionIds.length === 0) {
    return;
  }

  const pb = await createSuperuserPocketBase();
  const records = await pb.collection("feedback_submissions").getFullList({
    filter: pb.filter("user = {:user} && user_unread = true", {
      user: currentUser.id,
    }),
    requestKey: null,
  });
  const allowedIds = new Set(submissionIds);

  await Promise.all(
    records
      .filter((record) => allowedIds.has(record.id))
      .map((record) =>
        pb.collection("feedback_submissions").update(
          record.id,
          { user_unread: false },
          { requestKey: null },
        ),
      ),
  );
}

function mapIdea(
  record: RecordLike,
  supportsByIdea: Map<string, { reason: string }>,
  actualSupportCount?: number,
): FeedbackIdea {
  const support = supportsByIdea.get(record.id);

  return {
    id: record.id,
    title: asString(record.title),
    summary: asString(record.summary),
    status: asIdeaStatus(record.status),
    response: asString(record.response),
    supportCount: actualSupportCount ?? asNumber(record.support_count),
    isSupported: Boolean(support),
    supportReason: support?.reason ?? "",
    created: asString(record.created),
    updated: asString(record.updated),
  };
}

function mapSubmission(
  record: RecordLike,
  {
    ideasById,
    messagesBySubmission,
  }: {
    ideasById: Map<string, FeedbackIdea>;
    messagesBySubmission: Map<string, FeedbackMessage[]>;
  },
): FeedbackSubmission {
  const userRecord = getExpandedRecord(record, "user");
  const ideaId = asString(record.idea);

  return {
    id: record.id,
    kind: asFeedbackKind(record.kind),
    title: asString(record.title),
    body: asString(record.body),
    status: asFeedbackStatus(record.status),
    pageContext: asString(record.page_context),
    screenshotUrl: getFileUrl(record, "screenshot", "960x0"),
    userUnread: Boolean(record.user_unread),
    created: asString(record.created),
    updated: asString(record.updated),
    user: mapPerson(userRecord),
    idea: ideaId ? ideasById.get(ideaId) ?? mapExpandedIdea(record) : null,
    messages: messagesBySubmission.get(record.id) ?? [],
  };
}

function mapExpandedIdea(record: RecordLike) {
  const expanded = getExpandedRecord(record, "idea", { optional: true });
  return expanded ? mapIdea(expanded, new Map()) : null;
}

function mapMessage(record: RecordLike): FeedbackMessage {
  return {
    id: record.id,
    body: asString(record.body),
    created: asString(record.created),
    fromAdmin: Boolean(record.from_admin),
    author: mapPerson(getExpandedRecord(record, "author")),
  };
}

function mapInternalNote(record: RecordLike): FeedbackInternalNote {
  return {
    id: record.id,
    submissionId: asString(record.submission),
    body: asString(record.body),
    created: asString(record.created),
    author: mapPerson(getExpandedRecord(record, "author")),
  };
}

function mapWorkLink(record: RecordLike): FeedbackWorkLink {
  return {
    id: record.id,
    submissionId: asNullableString(record.submission),
    ideaId: asNullableString(record.idea),
    repository: asString(record.repository),
    issueNumber: asNumber(record.issue_number),
    issueUrl: asString(record.issue_url),
    state: asString(record.state),
  };
}

function mapPerson(record: RecordLike): FeedbackPerson {
  return {
    id: record.id,
    displayName: getClubUserDisplayName(record),
    email: asString(record.email),
    initials: getClubUserInitials(record),
    avatarUrl: getClubUserAvatarUrl(record),
  };
}

function groupMessages(records: RecordLike[]) {
  const grouped = new Map<string, FeedbackMessage[]>();

  for (const record of records) {
    const submissionId = asString(record.submission);
    const current = grouped.get(submissionId) ?? [];
    current.push(mapMessage(record));
    grouped.set(submissionId, current);
  }

  return grouped;
}

function countByRelation(records: RecordLike[], relation: string) {
  const counts = new Map<string, number>();

  for (const record of records) {
    const id = asString(record[relation]);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return counts;
}

function getFileUrl(record: RecordLike, field: string, thumb?: string) {
  const filename = asString(record[field]);

  if (!filename) {
    return null;
  }

  const collection = asString(record.collectionName) || asString(record.collectionId);
  const baseUrl = getPocketBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(record.id)}/${encodeURIComponent(filename)}`;

  return thumb ? `${url}?thumb=${encodeURIComponent(thumb)}` : url;
}

function getExpandedRecord(
  record: RecordLike,
  key: string,
  options: { optional?: boolean } = {},
): RecordLike {
  const expanded = record.expand?.[key];
  const value = Array.isArray(expanded) ? expanded[0] : expanded;

  if (!value || typeof value !== "object" || !("id" in value)) {
    if (options.optional) {
      return null as unknown as RecordLike;
    }

    throw new Error(`Missing expanded ${key} data.`);
  }

  return value as RecordLike;
}

function asFeedbackKind(value: unknown): FeedbackKind {
  const kind = asString(value) as FeedbackKind;
  return FEEDBACK_KINDS.includes(kind) ? kind : "other";
}

function asFeedbackStatus(value: unknown): FeedbackStatus {
  const status = asString(value) as FeedbackStatus;
  return FEEDBACK_STATUSES.includes(status) ? status : "received";
}

function asIdeaStatus(value: unknown): IdeaStatus {
  const status = asString(value) as IdeaStatus;
  return IDEA_STATUSES.includes(status) ? status : "under_review";
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asString(value);
  return text || null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
