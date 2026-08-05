import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createSuperuserPocketBase } from "@/lib/auth";
import {
  githubIssueStateToIdeaStatus,
  mapIdeaStatusToFeedbackStatus,
} from "@/lib/feedback-rules";

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") {
    return NextResponse.json({ ok: true });
  }
  if (event !== "issues") {
    return NextResponse.json({ ignored: true });
  }

  let payload: GitHubIssuesPayload;
  try {
    payload = JSON.parse(body) as GitHubIssuesPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const repository = asString(payload.repository?.full_name);
  const issueNumber = asPositiveInteger(payload.issue?.number);
  if (!repository || !issueNumber) {
    return NextResponse.json({ error: "Missing issue details." }, { status: 400 });
  }

  const labels = Array.isArray(payload.issue?.labels)
    ? payload.issue.labels.map((label) => asString(label?.name)).filter(Boolean)
    : [];
  const status = githubIssueStateToIdeaStatus({
    labels,
    state: asString(payload.issue?.state),
    stateReason: asString(payload.issue?.state_reason),
  });
  const pb = await createSuperuserPocketBase();
  const links = await pb.collection("feedback_work_links").getFullList({
    filter: pb.filter("repository = {:repository} && issue_number = {:issueNumber}", {
      repository,
      issueNumber,
    }),
    requestKey: null,
  });

  await Promise.all(
    links.map((link) =>
      pb.collection("feedback_work_links").update(
        link.id,
        { state: buildIssueState(payload.issue) },
        { requestKey: null },
      ),
    ),
  );

  if (status) {
    for (const link of links) {
      const ideaId = asString(link.idea);
      const submissionId = asString(link.submission);

      if (ideaId) {
        await pb.collection("feedback_ideas").update(
          ideaId,
          { status },
          { requestKey: null },
        );
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
      } else if (submissionId) {
        await pb.collection("feedback_submissions").update(
          submissionId,
          {
            status: mapIdeaStatusToFeedbackStatus(status),
            user_unread: true,
          },
          { requestKey: null },
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    linksUpdated: links.length,
    status: status ?? null,
  });
}

type GitHubIssuesPayload = {
  issue?: {
    number?: unknown;
    state?: unknown;
    state_reason?: unknown;
    labels?: Array<{ name?: unknown }>;
  };
  repository?: {
    full_name?: unknown;
  };
};

function verifySignature(body: string, signature: string, secret: string) {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length
    && timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

function buildIssueState(issue: GitHubIssuesPayload["issue"]) {
  const state = asString(issue?.state) || "unknown";
  const reason = asString(issue?.state_reason);
  return reason ? `${state}:${reason}` : state;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0;
}
