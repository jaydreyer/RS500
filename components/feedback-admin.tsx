"use client";

import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Lightbulb,
  LockKeyhole,
  MessageSquareReply,
  Send,
  Users,
  GitPullRequest,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  addFeedbackInternalNoteAction,
  createGitHubIssueAction,
  linkFeedbackToIdeaAction,
  linkGitHubIssueAction,
  publishFeedbackIdeaAction,
  respondToFeedbackAction,
  updateFeedbackIdeaAction,
  type FeedbackAdminActionState,
} from "@/app/(club)/feedback/admin/actions";
import { FeedbackKindIcon, StatusBadge } from "@/components/feedback-hub";
import { ClubAvatar, Eyebrow } from "@/components/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import type {
  FeedbackAdminState,
  FeedbackIdea,
  FeedbackSubmission,
} from "@/lib/feedback";
import {
  FEEDBACK_KIND_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  IDEA_STATUSES,
  IDEA_STATUS_LABELS,
} from "@/lib/feedback-rules";
import { cn } from "@/lib/utils";

const INITIAL_STATE: FeedbackAdminActionState = {
  status: "idle",
  message: null,
};

export function FeedbackAdmin({
  state,
  selectedId,
  githubConfigured,
}: {
  state: FeedbackAdminState;
  selectedId: string | null;
  githubConfigured: boolean;
}) {
  const selected =
    state.submissions.find((submission) => submission.id === selectedId)
    ?? state.submissions[0]
    ?? null;
  const newCount = state.submissions.filter((item) => item.status === "received").length;

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow>ADMIN / FEEDBACK LOOP</Eyebrow>
          <h1 className="title-wrap mt-3 text-5xl md:text-7xl">Feedback inbox</h1>
          <p className="mt-3 max-w-2xl font-quote text-xl leading-snug text-[var(--ink-soft)]">
            Respond with context, curate ideas, and promote only actionable work to GitHub.
          </p>
        </div>
        <Link className={buttonVariants({ variant: "ghost" })} href="/feedback">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to feedback
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStat label="new" value={newCount} accent />
        <AdminStat label="total" value={state.submissions.length} />
        <AdminStat label="public ideas" value={state.ideas.length} />
        <AdminStat
          label="supporters"
          value={state.ideas.reduce((total, idea) => total + idea.supportCount, 0)}
        />
      </div>

      {selected ? (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <InboxList selectedId={selected.id} submissions={state.submissions} />
          <SubmissionDetail
            githubConfigured={githubConfigured}
            state={state}
            submission={selected}
          />
        </div>
      ) : (
        <div className="pressed-panel rounded-lg px-6 py-14 text-center">
          <MessageSquareReply className="mx-auto size-9 text-[var(--accent)]" />
          <h2 className="mt-4 text-3xl">Inbox zero</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            New user feedback will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function InboxList({
  submissions,
  selectedId,
}: {
  submissions: FeedbackSubmission[];
  selectedId: string;
}) {
  return (
    <aside className="surface-panel h-fit max-h-[calc(100vh-160px)] overflow-y-auto rounded-lg">
      <div className="sticky top-0 z-10 border-b border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
        <p className="tag">All feedback</p>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {submissions.map((submission) => (
          <Link
            className={cn(
              "block px-4 py-4 transition-colors hover:bg-[var(--paper-2)]",
              submission.id === selectedId &&
                "border-l-2 border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--paper-2))]",
            )}
            href={`/feedback/admin?item=${submission.id}`}
            key={submission.id}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 tag">
                <FeedbackKindIcon kind={submission.kind} />
                {FEEDBACK_KIND_LABELS[submission.kind]}
              </span>
              <time className="mono text-[10px] text-[var(--ink-faint)]">
                {formatShortDate(submission.updated)}
              </time>
            </div>
            <h2 className="mt-2 line-clamp-2 font-display text-lg font-extrabold leading-tight">
              {submission.title}
            </h2>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="truncate text-xs text-[var(--ink-soft)]">
                {submission.user.displayName}
              </span>
              <span className="tag text-[10px]">
                {FEEDBACK_STATUS_LABELS[submission.status]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function SubmissionDetail({
  state,
  submission,
  githubConfigured,
}: {
  state: FeedbackAdminState;
  submission: FeedbackSubmission;
  githubConfigured: boolean;
}) {
  const notes = state.notes.filter((note) => note.submissionId === submission.id);
  const workLink =
    state.workLinks.find((link) => link.submissionId === submission.id)
    ?? (
      submission.idea
        ? state.workLinks.find((link) => link.ideaId === submission.idea?.id)
        : undefined
    );

  return (
    <div className="grid min-w-0 gap-5">
      <article className="hard-panel overflow-hidden rounded-lg">
        <header className="border-b border-[var(--line-strong)] bg-[var(--paper-2)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="tag inline-flex items-center gap-1.5">
                  <FeedbackKindIcon kind={submission.kind} />
                  {FEEDBACK_KIND_LABELS[submission.kind]}
                </span>
                <span className="tag">submitted {formatDateTime(submission.created)}</span>
              </div>
              <h2 className="title-wrap text-4xl">{submission.title}</h2>
            </div>
            <StatusBadge
              label={FEEDBACK_STATUS_LABELS[submission.status]}
              status={submission.status}
            />
          </div>
        </header>

        <div className="grid gap-5 p-5">
          <div className="flex items-center gap-3">
            <ClubAvatar
              imageUrl={submission.user.avatarUrl}
              initials={submission.user.initials}
              label={submission.user.displayName}
              ring
            />
            <div>
              <p className="font-display font-extrabold">{submission.user.displayName}</p>
              <p className="text-xs text-[var(--ink-faint)]">{submission.user.email}</p>
            </div>
          </div>

          <p className="whitespace-pre-wrap text-base leading-7">{submission.body}</p>

          {submission.pageContext && (
            <div className="rounded-md border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2">
              <span className="tag">Context </span>
              <span className="ml-2 text-sm">{submission.pageContext}</span>
            </div>
          )}

          {submission.screenshotUrl && (
            <a href={submission.screenshotUrl} rel="noreferrer" target="_blank">
              <Image
                alt={`Screenshot attached to ${submission.title}`}
                className="max-h-[520px] w-auto rounded-md border border-[var(--line-strong)] object-contain"
                height={640}
                src={submission.screenshotUrl}
                unoptimized
                width={1080}
              />
            </a>
          )}

          {submission.messages.length > 0 && (
            <div className="grid gap-3 border-t border-[var(--line)] pt-4">
              <p className="tag">Conversation</p>
              {submission.messages.map((message) => (
                <div
                  className={cn(
                    "rounded-md border px-4 py-3",
                    message.fromAdmin
                      ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--line-strong))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--paper-2))]"
                      : "border-[var(--line-strong)] bg-[var(--paper-2)]",
                  )}
                  key={message.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold">
                      {message.author.displayName}
                      {message.fromAdmin ? " · Admin" : ""}
                    </span>
                    <time className="mono text-[10px] text-[var(--ink-faint)]">
                      {formatDateTime(message.created)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-2">
        <ResponsePanel key={`response-${submission.id}`} submission={submission} />
        <InternalNotesPanel
          key={`notes-${submission.id}`}
          notes={notes}
          submission={submission}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <IdeaPanel
          ideas={state.ideas}
          key={`idea-${submission.id}-${submission.idea?.id ?? "private"}`}
          submission={submission}
        />
        <GitHubPanel
          configured={githubConfigured}
          key={`github-${submission.id}-${submission.idea?.id ?? "private"}`}
          submission={submission}
          workLink={workLink}
        />
      </div>
    </div>
  );
}

function ResponsePanel({ submission }: { submission: FeedbackSubmission }) {
  const [state, action] = useActionState(respondToFeedbackAction, INITIAL_STATE);

  return (
    <AdminPanel
      icon={MessageSquareReply}
      eyebrow="User-visible"
      title="Respond & set status"
    >
      <form action={action} className="grid gap-3">
        <input name="submissionId" type="hidden" value={submission.id} />
        <label className="grid gap-1.5">
          <span className="tag">Status</span>
          <select
            className="input-control"
            defaultValue={submission.status}
            key={submission.status}
            name="status"
          >
            {FEEDBACK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {FEEDBACK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="tag">Response (optional)</span>
          <textarea
            className="input-control min-h-32 resize-y"
            maxLength={2000}
            name="response"
            placeholder="Explain what happens next—or why it may not."
          />
        </label>
        <FormFooter state={state}>
          <Send className="size-4" aria-hidden="true" />
          Send update
        </FormFooter>
      </form>
    </AdminPanel>
  );
}

function InternalNotesPanel({
  submission,
  notes,
}: {
  submission: FeedbackSubmission;
  notes: FeedbackAdminState["notes"];
}) {
  const [state, action] = useActionState(addFeedbackInternalNoteAction, INITIAL_STATE);

  return (
    <AdminPanel icon={LockKeyhole} eyebrow="Private" title="Internal notes">
      {notes.length > 0 && (
        <div className="mb-3 grid max-h-48 gap-2 overflow-y-auto">
          {notes.map((note) => (
            <div className="rounded-md bg-[var(--paper-2)] px-3 py-2" key={note.id}>
              <p className="text-sm leading-5">{note.body}</p>
              <p className="mono mt-1 text-[10px] text-[var(--ink-faint)]">
                {note.author.displayName} · {formatDateTime(note.created)}
              </p>
            </div>
          ))}
        </div>
      )}
      <form action={action} className="grid gap-3">
        <input name="submissionId" type="hidden" value={submission.id} />
        <textarea
          className="input-control min-h-28 resize-y"
          maxLength={3000}
          name="body"
          placeholder="Technical detail, prioritization context, related conversations…"
          required
        />
        <FormFooter state={state} variant="ghost">
          Add private note
        </FormFooter>
      </form>
    </AdminPanel>
  );
}

function IdeaPanel({
  submission,
  ideas,
}: {
  submission: FeedbackSubmission;
  ideas: FeedbackIdea[];
}) {
  const [publishState, publishAction] = useActionState(
    publishFeedbackIdeaAction,
    INITIAL_STATE,
  );
  const [linkState, linkAction] = useActionState(linkFeedbackToIdeaAction, INITIAL_STATE);
  const [updateState, updateAction] = useActionState(updateFeedbackIdeaAction, INITIAL_STATE);
  const currentIdea = submission.idea;

  return (
    <AdminPanel icon={Lightbulb} eyebrow="Curated" title="Ideas board">
      {currentIdea ? (
        <form action={updateAction} className="grid gap-3">
          <input name="ideaId" type="hidden" value={currentIdea.id} />
          <div className="rounded-md border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2">
            <p className="font-display font-extrabold">{currentIdea.title}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--ink-soft)]">
              <Users className="size-3.5" />
              {currentIdea.supportCount} interested
            </p>
          </div>
          <label className="grid gap-1.5">
            <span className="tag">Public status</span>
            <select className="input-control" defaultValue={currentIdea.status} name="status">
              {IDEA_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {IDEA_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="tag">Public response</span>
            <textarea
              className="input-control min-h-28 resize-y"
              defaultValue={currentIdea.response}
              maxLength={2000}
              name="response"
              placeholder="What should everyone know?"
            />
          </label>
          <FormFooter state={updateState}>Update public idea</FormFooter>
        </form>
      ) : (
        <div className="grid gap-4">
          <form action={publishAction} className="grid gap-3">
            <input name="submissionId" type="hidden" value={submission.id} />
            <label className="grid gap-1.5">
              <span className="tag">Public title</span>
              <input
                className="input-control"
                defaultValue={submission.title}
                maxLength={120}
                minLength={4}
                name="title"
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="tag">Public summary</span>
              <textarea
                className="input-control min-h-28 resize-y"
                defaultValue={submission.body.slice(0, 1200)}
                maxLength={1200}
                minLength={10}
                name="summary"
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="tag">Public status</span>
              <select className="input-control" defaultValue="under_review" name="status">
                {IDEA_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {IDEA_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="tag">Public response (optional)</span>
              <textarea
                className="input-control min-h-24 resize-y"
                maxLength={2000}
                name="response"
              />
            </label>
            <FormFooter state={publishState}>Publish as an idea</FormFooter>
          </form>

          {ideas.length > 0 && (
            <form action={linkAction} className="grid gap-3 border-t border-[var(--line)] pt-4">
              <label className="grid gap-1.5">
                <span className="tag">Or merge with an existing idea</span>
                <select className="input-control" defaultValue="" name="ideaId" required>
                  <option disabled value="">
                    Choose an idea…
                  </option>
                  {ideas.map((idea) => (
                    <option key={idea.id} value={idea.id}>
                      {idea.title} ({idea.supportCount})
                    </option>
                  ))}
                </select>
              </label>
              <input name="submissionId" type="hidden" value={submission.id} />
              <FormFooter state={linkState} variant="ghost">
                Link existing idea
              </FormFooter>
            </form>
          )}
        </div>
      )}
    </AdminPanel>
  );
}

function GitHubPanel({
  submission,
  configured,
  workLink,
}: {
  submission: FeedbackSubmission;
  configured: boolean;
  workLink: FeedbackAdminState["workLinks"][number] | undefined;
}) {
  const [linkState, linkAction] = useActionState(linkGitHubIssueAction, INITIAL_STATE);
  const [createState, createAction] = useActionState(createGitHubIssueAction, INITIAL_STATE);
  const targetType = submission.idea ? "idea" : "submission";
  const targetId = submission.idea?.id ?? submission.id;

  return (
    <AdminPanel icon={GitPullRequest} eyebrow="Promoted work only" title="GitHub">
      {workLink ? (
        <div className="rounded-md border border-[color-mix(in_srgb,var(--good)_50%,var(--line-strong))] bg-[color-mix(in_srgb,var(--good)_8%,var(--paper-2))] p-4">
          <p className="tag text-[var(--good)]">Linked</p>
          <a
            className="mt-2 inline-flex items-center gap-2 font-display text-lg font-extrabold hover:text-[var(--accent)]"
            href={workLink.issueUrl}
            rel="noreferrer"
            target="_blank"
          >
            {workLink.repository} #{workLink.issueNumber}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">{workLink.state}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <form action={linkAction} className="grid gap-3">
            <input name="targetType" type="hidden" value={targetType} />
            <input name="targetId" type="hidden" value={targetId} />
            <label className="grid gap-1.5">
              <span className="tag">Link an existing issue</span>
              <input
                className="input-control"
                name="issueUrl"
                placeholder="https://github.com/owner/repo/issues/123"
                type="url"
                required
              />
            </label>
            <FormFooter state={linkState} variant="ghost">
              <GitBranch className="size-4" aria-hidden="true" />
              Link issue
            </FormFooter>
          </form>

          <form action={createAction} className="border-t border-[var(--line)] pt-4">
            <input name="targetType" type="hidden" value={targetType} />
            <input name="targetId" type="hidden" value={targetId} />
            <p className="mb-3 text-xs leading-5 text-[var(--ink-soft)]">
              Creates a clean work item without sending the user&apos;s identity or private
              conversation to GitHub.
            </p>
            <FormFooter disabled={!configured} state={createState}>
              <GitPullRequest className="size-4" aria-hidden="true" />
              {configured ? "Create GitHub issue" : "GitHub not configured"}
            </FormFooter>
            {!configured && (
              <p className="mt-2 text-xs text-[var(--ink-faint)]">
                Manual linking still works. Add the GitHub server environment values to enable
                issue creation.
              </p>
            )}
          </form>
        </div>
      )}
    </AdminPanel>
  );
}

function AdminPanel({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: typeof Lightbulb;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel overflow-hidden rounded-lg">
      <header className="flex items-center gap-3 border-b border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
        <Icon className="size-4 text-[var(--accent)]" aria-hidden="true" />
        <div>
          <p className="tag">{eyebrow}</p>
          <h3 className="mt-1 text-xl">{title}</h3>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function FormFooter({
  state,
  children,
  variant = "accent",
  disabled = false,
}: {
  state: FeedbackAdminActionState;
  children: React.ReactNode;
  variant?: "accent" | "ghost";
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <AdminActionMessage state={state} />
      <AdminPendingButton disabled={disabled} pendingLabel="Saving…" variant={variant}>
        {children}
      </AdminPendingButton>
    </div>
  );
}

function AdminActionMessage({ state }: { state: FeedbackAdminActionState }) {
  return state.message ? (
    <p
      aria-live="polite"
      className={cn(
        "text-xs font-bold",
        state.status === "error" ? "text-[var(--accent)]" : "text-[var(--good)]",
      )}
    >
      {state.message}
    </p>
  ) : (
    <span />
  );
}

function AdminPendingButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending || disabled} type="submit" {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

function AdminStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="pressed-panel rounded-lg px-4 py-3">
      <p className={cn("font-display text-3xl font-extrabold", accent && "text-[var(--accent)]")}>
        {value}
      </p>
      <p className="tag mt-1">{label}</p>
    </div>
  );
}

const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatShortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : shortDateFormatter.format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateTimeFormatter.format(date);
}
