"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSuperuserPocketBase, getAuthenticatedPocketBase } from "@/lib/auth";
import {
  mapIdeaStatusToFeedbackStatus,
  normalizeFeedbackText,
  parseFeedbackStatus,
  parseGitHubIssueUrl,
  parseIdeaStatus,
  type IdeaStatus,
} from "@/lib/feedback-rules";
import { createGitHubFeedbackIssue } from "@/lib/github-feedback";

export type FeedbackAdminActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export async function respondToFeedbackAction(
  _previousState: FeedbackAdminActionState,
  formData: FormData,
): Promise<FeedbackAdminActionState> {
  try {
    const { user } = await requireAdmin();
    const pb = await createSuperuserPocketBase();
    const submissionId = parseId(formData.get("submissionId"), "Missing feedback item.");
    const status = parseFeedbackStatus(formData.get("status"));
    const response = normalizeFeedbackText(formData.get("response"), {
      label: "Response",
      max: 2000,
      optional: true,
    });

    await pb.collection("feedback_submissions").getOne(submissionId, {
      requestKey: null,
    });

    if (response) {
      await pb.collection("feedback_messages").create(
        {
          submission: submissionId,
          author: user.id,
          from_admin: true,
          body: response,
        },
        { requestKey: null },
      );
    }

    await pb.collection("feedback_submissions").update(
      submissionId,
      {
        status,
        user_unread: true,
      },
      { requestKey: null },
    );

    revalidateFeedbackPaths();
    return {
      status: "success",
      message: response ? "Response sent and status updated." : "Status updated.",
    };
  } catch (error) {
    return handleActionError(error, "Could not update the feedback.");
  }
}

export async function addFeedbackInternalNoteAction(
  _previousState: FeedbackAdminActionState,
  formData: FormData,
): Promise<FeedbackAdminActionState> {
  try {
    const { user } = await requireAdmin();
    const pb = await createSuperuserPocketBase();
    const submissionId = parseId(formData.get("submissionId"), "Missing feedback item.");
    const body = normalizeFeedbackText(formData.get("body"), {
      label: "Note",
      min: 2,
      max: 3000,
    });

    await pb.collection("feedback_submissions").getOne(submissionId, {
      requestKey: null,
    });
    await pb.collection("feedback_internal_notes").create(
      {
        submission: submissionId,
        author: user.id,
        body,
      },
      { requestKey: null },
    );

    revalidateFeedbackPaths();
    return {
      status: "success",
      message: "Private note added.",
    };
  } catch (error) {
    return handleActionError(error, "Could not save the private note.");
  }
}

export async function publishFeedbackIdeaAction(
  _previousState: FeedbackAdminActionState,
  formData: FormData,
): Promise<FeedbackAdminActionState> {
  try {
    await requireAdmin();
    const pb = await createSuperuserPocketBase();
    const submissionId = parseId(formData.get("submissionId"), "Missing feedback item.");
    const ideaId = parseOptionalId(formData.get("ideaId"));
    const title = normalizeFeedbackText(formData.get("title"), {
      label: "Public title",
      min: 4,
      max: 120,
    });
    const summary = normalizeFeedbackText(formData.get("summary"), {
      label: "Public summary",
      min: 10,
      max: 1200,
    });
    const status = parseIdeaStatus(formData.get("status"));
    const response = normalizeFeedbackText(formData.get("response"), {
      label: "Public response",
      max: 2000,
      optional: true,
    });
    await pb.collection("feedback_submissions").getOne(submissionId, {
      requestKey: null,
    });

    const idea = ideaId
      ? await pb.collection("feedback_ideas").update(
        ideaId,
        { title, summary, status, response },
        { requestKey: null },
      )
      : await pb.collection("feedback_ideas").create(
        {
          title,
          summary,
          status,
          response,
          support_count: 0,
        },
        { requestKey: null },
      );

    await pb.collection("feedback_submissions").update(
      submissionId,
      {
        idea: idea.id,
        status: mapIdeaStatusToFeedbackStatus(status),
        user_unread: true,
      },
      { requestKey: null },
    );

    revalidateFeedbackPaths();
    return {
      status: "success",
      message: ideaId ? "Public idea updated." : "Published to the Ideas board.",
    };
  } catch (error) {
    return handleActionError(error, "Could not publish the idea.");
  }
}

export async function linkFeedbackToIdeaAction(
  _previousState: FeedbackAdminActionState,
  formData: FormData,
): Promise<FeedbackAdminActionState> {
  try {
    await requireAdmin();
    const pb = await createSuperuserPocketBase();
    const submissionId = parseId(formData.get("submissionId"), "Missing feedback item.");
    const ideaId = parseId(formData.get("ideaId"), "Choose an idea.");
    const idea = await pb.collection("feedback_ideas").getOne(ideaId, {
      requestKey: null,
    });
    const status = parseIdeaStatus(idea.status);

    await pb.collection("feedback_submissions").update(
      submissionId,
      {
        idea: ideaId,
        status: mapIdeaStatusToFeedbackStatus(status),
        user_unread: true,
      },
      { requestKey: null },
    );

    revalidateFeedbackPaths();
    return {
      status: "success",
      message: "Feedback linked to the existing idea.",
    };
  } catch (error) {
    return handleActionError(error, "Could not link the feedback.");
  }
}

export async function updateFeedbackIdeaAction(
  _previousState: FeedbackAdminActionState,
  formData: FormData,
): Promise<FeedbackAdminActionState> {
  try {
    await requireAdmin();
    const pb = await createSuperuserPocketBase();
    const ideaId = parseId(formData.get("ideaId"), "Missing idea.");
    const status = parseIdeaStatus(formData.get("status"));
    const response = normalizeFeedbackText(formData.get("response"), {
      label: "Public response",
      max: 2000,
      optional: true,
    });

    await pb.collection("feedback_ideas").update(
      ideaId,
      { status, response },
      { requestKey: null },
    );
    await syncLinkedSubmissions(pb, ideaId, status);

    revalidateFeedbackPaths();
    return {
      status: "success",
      message: "Idea and linked feedback updated.",
    };
  } catch (error) {
    return handleActionError(error, "Could not update the idea.");
  }
}

export async function linkGitHubIssueAction(
  _previousState: FeedbackAdminActionState,
  formData: FormData,
): Promise<FeedbackAdminActionState> {
  try {
    await requireAdmin();
    const pb = await createSuperuserPocketBase();
    const target = parseWorkTarget(formData);
    const issue = parseGitHubIssueUrl(formData.get("issueUrl"));
    await assertTargetExists(pb, target);
    await upsertWorkLink(pb, target, {
      ...issue,
      state: "linked",
    });

    revalidateFeedbackPaths();
    return {
      status: "success",
      message: `Linked GitHub issue #${issue.issueNumber}.`,
    };
  } catch (error) {
    return handleActionError(error, "Could not link the GitHub issue.");
  }
}

export async function createGitHubIssueAction(
  _previousState: FeedbackAdminActionState,
  formData: FormData,
): Promise<FeedbackAdminActionState> {
  try {
    await requireAdmin();
    const pb = await createSuperuserPocketBase();
    const target = parseWorkTarget(formData);
    const details = await getTargetDetails(pb, target);
    const issue = await createGitHubFeedbackIssue({
      title: details.title,
      body: details.body,
    });
    await upsertWorkLink(pb, target, issue);

    revalidateFeedbackPaths();
    return {
      status: "success",
      message: `Created and linked GitHub issue #${issue.issueNumber}.`,
    };
  } catch (error) {
    return handleActionError(error, "Could not create the GitHub issue.");
  }
}

async function requireAdmin() {
  const auth = await getAuthenticatedPocketBase();
  if (!auth.user.isAdmin) {
    throw new Error("Forbidden.");
  }

  return auth;
}

async function syncLinkedSubmissions(
  pb: Awaited<ReturnType<typeof createSuperuserPocketBase>>,
  ideaId: string,
  status: IdeaStatus,
) {
  const submissions = await pb.collection("feedback_submissions").getFullList({
    filter: pb.filter("idea = {:idea}", { idea: ideaId }),
    requestKey: null,
  });

  await Promise.all(
    submissions.map((submission) =>
      pb.collection("feedback_submissions").update(
        submission.id,
        {
          status: mapIdeaStatusToFeedbackStatus(status),
          user_unread: true,
        },
        { requestKey: null },
      ),
    ),
  );
}

type WorkTarget =
  | { type: "idea"; id: string }
  | { type: "submission"; id: string };

function parseWorkTarget(formData: FormData): WorkTarget {
  const type = asString(formData.get("targetType"));
  const id = parseId(formData.get("targetId"), "Missing feedback target.");

  if (type !== "idea" && type !== "submission") {
    throw new Error("Choose an idea or feedback item to link.");
  }

  return { type, id };
}

async function assertTargetExists(
  pb: Awaited<ReturnType<typeof createSuperuserPocketBase>>,
  target: WorkTarget,
) {
  const collection = target.type === "idea" ? "feedback_ideas" : "feedback_submissions";
  await pb.collection(collection).getOne(target.id, { requestKey: null });
}

async function getTargetDetails(
  pb: Awaited<ReturnType<typeof createSuperuserPocketBase>>,
  target: WorkTarget,
) {
  if (target.type === "idea") {
    const idea = await pb.collection("feedback_ideas").getOne(target.id, {
      requestKey: null,
    });
    const submissions = await pb.collection("feedback_submissions").getFullList({
      filter: pb.filter("idea = {:idea}", { idea: target.id }),
      requestKey: null,
    });

    return {
      title: asString(idea.title),
      body: [
        asString(idea.summary),
        "",
        `User signal: ${asNumber(idea.support_count)} interested, ${submissions.length} direct ${submissions.length === 1 ? "submission" : "submissions"}.`,
        "",
        "Created from the Spin 500 feedback inbox. User identities and private conversations remain in the app.",
      ].join("\n"),
    };
  }

  const submission = await pb.collection("feedback_submissions").getOne(target.id, {
    requestKey: null,
  });

  return {
    title: asString(submission.title),
    body: [
      asString(submission.body),
      "",
      `Feedback type: ${asString(submission.kind)}`,
      "",
      "Created from the Spin 500 feedback inbox. User identity and private conversation remain in the app.",
    ].join("\n"),
  };
}

async function upsertWorkLink(
  pb: Awaited<ReturnType<typeof createSuperuserPocketBase>>,
  target: WorkTarget,
  issue: {
    repository: string;
    issueNumber: number;
    issueUrl: string;
    state: string;
  },
) {
  const existing = await findExistingWorkLink(pb, target);
  const payload = {
    provider: "github",
    repository: issue.repository,
    issue_number: issue.issueNumber,
    issue_url: issue.issueUrl,
    state: issue.state,
    [target.type]: target.id,
  };

  if (existing) {
    await pb.collection("feedback_work_links").update(existing.id, payload, {
      requestKey: null,
    });
    return;
  }

  await pb.collection("feedback_work_links").create(payload, {
    requestKey: null,
  });
}

async function findExistingWorkLink(
  pb: Awaited<ReturnType<typeof createSuperuserPocketBase>>,
  target: WorkTarget,
) {
  try {
    return await pb.collection("feedback_work_links").getFirstListItem(
      pb.filter(`${target.type} = {:id}`, { id: target.id }),
      { requestKey: null },
    );
  } catch {
    return null;
  }
}

function parseId(value: unknown, errorMessage: string) {
  const id = asString(value);
  if (!/^[A-Za-z0-9_-]{10,32}$/.test(id)) {
    throw new Error(errorMessage);
  }

  return id;
}

function parseOptionalId(value: unknown) {
  const id = asString(value);
  return id ? parseId(id, "Invalid idea.") : "";
}

function revalidateFeedbackPaths() {
  revalidatePath("/feedback");
  revalidatePath("/feedback/admin");
}

function handleActionError(error: unknown, fallback: string): FeedbackAdminActionState {
  if (error instanceof Error && error.message === "Unauthorized.") {
    redirect("/auth");
  }

  return {
    status: "error",
    message: error instanceof Error ? error.message : fallback,
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
