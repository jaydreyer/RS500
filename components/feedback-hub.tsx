"use client";

import {
  ArrowRight,
  Bug,
  Check,
  CircleHelp,
  ExternalLink,
  Lightbulb,
  MessageCircle,
  MessageSquarePlus,
  Send,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import {
  createFeedbackAction,
  replyToFeedbackAction,
  saveIdeaSupportReasonAction,
  toggleIdeaSupportAction,
  type FeedbackActionState,
} from "@/app/(club)/feedback/actions";
import { ClubAvatar, Eyebrow } from "@/components/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import type {
  FeedbackHubState,
  FeedbackIdea,
  FeedbackSubmission,
} from "@/lib/feedback";
import {
  FEEDBACK_KIND_LABELS,
  FEEDBACK_STATUS_LABELS,
  IDEA_STATUS_LABELS,
} from "@/lib/feedback-rules";
import { cn } from "@/lib/utils";

const INITIAL_ACTION_STATE: FeedbackActionState = {
  status: "idle",
  message: null,
};

export type FeedbackView = "ideas" | "mine" | "new";

export function FeedbackHub({
  state,
  view,
  isAdmin,
}: {
  state: FeedbackHubState;
  view: FeedbackView;
  isAdmin: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow>LISTEN / SHAPE THE CLUB</Eyebrow>
          <h1 className="title-wrap mt-3 text-5xl md:text-7xl">Ideas & feedback</h1>
          <p className="mt-4 max-w-2xl font-quote text-xl leading-snug text-[var(--ink-soft)]">
            Share what would make Spin 500 better, follow our response, or support an idea
            you&apos;d use too.
          </p>
        </div>
        {isAdmin && (
          <Link className={buttonVariants({ variant: "ghost" })} href="/feedback/admin">
            Open admin inbox
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      <FeedbackTabs state={state} view={view} />

      {view === "ideas" && <IdeasBoard ideas={state.ideas} />}
      {view === "mine" && <MyFeedback submissions={state.submissions} />}
      {view === "new" && <SubmitFeedback />}
    </section>
  );
}

function FeedbackTabs({
  state,
  view,
}: {
  state: FeedbackHubState;
  view: FeedbackView;
}) {
  const tabs = [
    {
      href: "/feedback?view=ideas",
      label: "Ideas",
      count: state.ideas.length,
      active: view === "ideas",
    },
    {
      href: "/feedback?view=mine",
      label: "My feedback",
      count: state.submissions.length,
      unread: state.unreadCount,
      active: view === "mine",
    },
    {
      href: "/feedback?view=new",
      label: "Share feedback",
      active: view === "new",
    },
  ];

  return (
    <nav
      aria-label="Feedback sections"
      className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-[var(--line-strong)] bg-[var(--paper-2)] p-1"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          className={cn(
            "relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-4 font-display text-sm font-extrabold transition-colors",
            tab.active
              ? "bg-[var(--ink)] text-[var(--paper)]"
              : "text-[var(--ink-soft)] hover:bg-[var(--card)] hover:text-[var(--ink)]",
          )}
          href={tab.href}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span
              className={cn(
                "mono rounded-full px-2 py-0.5 text-[10px]",
                tab.active
                  ? "bg-[color-mix(in_srgb,var(--paper)_18%,transparent)]"
                  : "bg-[var(--card)]",
              )}
            >
              {tab.count}
            </span>
          )}
          {Boolean(tab.unread) && (
            <span
              className="size-2 rounded-full bg-[var(--accent)]"
              title={`${tab.unread} updated`}
            />
          )}
        </Link>
      ))}
    </nav>
  );
}

function IdeasBoard({ ideas }: { ideas: FeedbackIdea[] }) {
  if (ideas.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No public ideas yet"
        body="Have the first one? Send it privately and we may publish it here for the club."
        actionHref="/feedback?view=new"
        actionLabel="Share an idea"
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {ideas.map((idea) => (
        <IdeaCard idea={idea} key={idea.id} />
      ))}
    </div>
  );
}

function IdeaCard({ idea }: { idea: FeedbackIdea }) {
  return (
    <article className="hard-panel flex min-h-full flex-col overflow-hidden rounded-lg">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <StatusBadge status={idea.status} label={IDEA_STATUS_LABELS[idea.status]} />
          <span className="mono text-xs text-[var(--ink-faint)]">
            Updated {formatShortDate(idea.updated)}
          </span>
        </div>
        <div>
          <h2 className="title-wrap text-3xl">{idea.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{idea.summary}</p>
        </div>

        {idea.response && (
          <div className="rounded-md border-l-2 border-[var(--accent)] bg-[var(--paper-2)] px-4 py-3">
            <p className="tag mb-1 text-[var(--accent)]">Response from Jay</p>
            <p className="text-sm leading-6">{idea.response}</p>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--line-strong)] bg-[var(--paper-2)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-extrabold">
              {idea.supportCount} {idea.supportCount === 1 ? "person wants" : "people want"} this
            </p>
            <p className="text-xs text-[var(--ink-faint)]">
              Supporting also subscribes you to updates.
            </p>
          </div>
          <form action={toggleIdeaSupportAction}>
            <input name="ideaId" type="hidden" value={idea.id} />
            <PendingButton
              pendingLabel={idea.isSupported ? "Removing…" : "Adding…"}
              size="default"
              variant={idea.isSupported ? "solid" : "accent"}
            >
              {idea.isSupported ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <ThumbsUp className="size-4" aria-hidden="true" />
              )}
              {idea.isSupported ? "You want this" : "I want this too"}
            </PendingButton>
          </form>
        </div>

        {idea.isSupported && <SupportReasonForm idea={idea} />}
      </div>
    </article>
  );
}

function SupportReasonForm({ idea }: { idea: FeedbackIdea }) {
  const [state, action] = useActionState(saveIdeaSupportReasonAction, INITIAL_ACTION_STATE);

  return (
    <details className="mt-3 border-t border-[var(--line)] pt-3">
      <summary className="cursor-pointer text-xs font-bold text-[var(--ink-soft)] hover:text-[var(--ink)]">
        {idea.supportReason ? "Edit why you want this" : "Tell us why you want this"}
      </summary>
      <form action={action} className="mt-3 grid gap-2">
        <input name="ideaId" type="hidden" value={idea.id} />
        <textarea
          className="input-control min-h-24 resize-y text-sm"
          defaultValue={idea.supportReason}
          maxLength={1000}
          name="reason"
          placeholder="What would this help you do?"
          required
        />
        <div className="flex items-center justify-between gap-3">
          <ActionMessage state={state} compact />
          <PendingButton pendingLabel="Saving…" size="sm" variant="ghost">
            Save use case
          </PendingButton>
        </div>
      </form>
    </details>
  );
}

function MyFeedback({ submissions }: { submissions: FeedbackSubmission[] }) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Nothing here yet"
        body="When you share feedback, you’ll be able to follow our response and status here."
        actionHref="/feedback?view=new"
        actionLabel="Share feedback"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}

function SubmissionCard({ submission }: { submission: FeedbackSubmission }) {
  return (
    <article
      className={cn(
        "surface-panel overflow-hidden rounded-lg",
        submission.userUnread && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper)]",
      )}
    >
      <div className="grid gap-4 border-b border-[var(--line-strong)] p-5 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="tag">{FEEDBACK_KIND_LABELS[submission.kind]}</span>
            {submission.userUnread && (
              <span className="tag rounded-full bg-[var(--accent)] px-2 py-1 text-[var(--accent-ink)]">
                Updated
              </span>
            )}
          </div>
          <h2 className="title-wrap text-3xl">{submission.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-soft)]">
            {submission.body}
          </p>
        </div>
        <StatusBadge
          status={submission.status}
          label={FEEDBACK_STATUS_LABELS[submission.status]}
        />
      </div>

      {submission.screenshotUrl && (
        <div className="border-b border-[var(--line-strong)] bg-[var(--paper-2)] p-4">
          <a href={submission.screenshotUrl} rel="noreferrer" target="_blank">
            <Image
              alt={`Screenshot attached to ${submission.title}`}
              className="max-h-80 w-auto rounded-md border border-[var(--line-strong)] object-contain"
              height={480}
              src={submission.screenshotUrl}
              unoptimized
              width={960}
            />
          </a>
        </div>
      )}

      {submission.idea && (
        <Link
          aria-label={`View public idea: ${submission.idea.title}`}
          className="flex items-center justify-between gap-4 border-b border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--accent-2)_10%,var(--paper-2))] px-5 py-3 text-sm font-bold hover:bg-[color-mix(in_srgb,var(--accent-2)_16%,var(--paper-2))]"
          href="/feedback?view=ideas"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--accent-2)]" aria-hidden="true" />
            This feedback helped shape “{submission.idea.title}”
          </span>
          <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      )}

      <div className="grid gap-4 p-5">
        {submission.messages.length > 0 ? (
          <div className="grid gap-3">
            <p className="tag">Conversation</p>
            {submission.messages.map((message) => (
              <div
                className={cn(
                  "flex gap-3",
                  !message.fromAdmin && "flex-row-reverse text-right",
                )}
                key={message.id}
              >
                <ClubAvatar
                  imageUrl={message.author.avatarUrl}
                  initials={message.author.initials}
                  label={message.author.displayName}
                  size="sm"
                />
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg border px-3 py-2 text-left",
                    message.fromAdmin
                      ? "border-[color-mix(in_srgb,var(--accent)_50%,var(--line-strong))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--paper-2))]"
                      : "border-[var(--line-strong)] bg-[var(--paper-2)]",
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold">{message.author.displayName}</span>
                    <time className="mono text-[10px] text-[var(--ink-faint)]">
                      {formatDateTime(message.created)}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-faint)]">
            We&apos;ve received this and will respond here when there&apos;s an update.
          </p>
        )}

        <FeedbackReplyForm submissionId={submission.id} />
      </div>
    </article>
  );
}

function FeedbackReplyForm({ submissionId }: { submissionId: string }) {
  const [state, action] = useActionState(replyToFeedbackAction, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form action={action} className="grid gap-2 border-t border-[var(--line)] pt-4" ref={formRef}>
      <input name="submissionId" type="hidden" value={submissionId} />
      <label className="grid gap-1.5">
        <span className="tag">Reply</span>
        <textarea
          className="input-control min-h-24 resize-y"
          maxLength={2000}
          name="body"
          placeholder="Add context or answer a question…"
          required
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ActionMessage state={state} compact />
        <PendingButton pendingLabel="Sending…" variant="ghost">
          <Send className="size-4" aria-hidden="true" />
          Send reply
        </PendingButton>
      </div>
    </form>
  );
}

function SubmitFeedback() {
  const [state, action] = useActionState(createFeedbackAction, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form action={action} className="hard-panel grid gap-5 rounded-lg p-5 md:p-6" ref={formRef}>
        <div>
          <p className="tag text-[var(--accent)]">Private by default</p>
          <h2 className="title-wrap mt-2 text-3xl">What&apos;s on your mind?</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
            It starts as a private conversation. If it could help the club, we&apos;ll ask
            the idea—not your personal details—to do some public work.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="tag">Type</span>
            <select className="input-control" defaultValue="idea" name="kind" required>
              <option value="idea">I have an idea</option>
              <option value="bug">Something is broken</option>
              <option value="question">I have a question</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="tag">Where were you?</span>
            <input
              className="input-control"
              maxLength={500}
              name="pageContext"
              placeholder="Optional — e.g. The Board"
            />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="tag">Short title</span>
          <input
            className="input-control"
            maxLength={120}
            minLength={4}
            name="title"
            placeholder="A quick summary"
            required
          />
        </label>

        <label className="grid gap-1.5">
          <span className="tag">Tell us more</span>
          <textarea
            className="input-control min-h-40 resize-y"
            maxLength={4000}
            minLength={10}
            name="body"
            placeholder="What are you trying to do, and what would a good outcome look like?"
            required
          />
        </label>

        <label className="grid gap-1.5">
          <span className="tag">Screenshot (optional)</span>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="input-control file:mr-4 file:rounded-md file:border-0 file:bg-[var(--ink)] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[var(--paper)]"
            name="screenshot"
            type="file"
          />
          <span className="text-xs text-[var(--ink-faint)]">JPG, PNG, or WebP up to 8 MB.</span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <ActionMessage state={state} />
          <PendingButton pendingLabel="Sending…" size="lg" variant="accent">
            <MessageSquarePlus className="size-5" aria-hidden="true" />
            Send feedback
          </PendingButton>
        </div>
      </form>

      <aside className="pressed-panel h-fit rounded-lg p-5">
        <p className="tag text-[var(--accent-2)]">What happens next</p>
        <ol className="mt-4 grid gap-4">
          {[
            ["1", "We read it", "Every submission lands in the feedback inbox."],
            ["2", "We respond", "You’ll see our reasoning, questions, and status changes."],
            ["3", "Ideas can grow", "Useful suggestions may join the Ideas board for support."],
            ["4", "We close the loop", "You’ll know if it ships—or why it may not."],
          ].map(([number, title, body]) => (
            <li className="flex gap-3" key={number}>
              <span className="mono grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-bold text-[var(--paper)]">
                {number}
              </span>
              <div>
                <p className="font-display font-extrabold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  icon: typeof Lightbulb;
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="pressed-panel grid place-items-center rounded-lg px-6 py-14 text-center">
      <Icon className="size-9 text-[var(--accent)]" aria-hidden="true" />
      <h2 className="mt-4 text-3xl">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--ink-soft)]">{body}</p>
      <Link className={cn(buttonVariants({ variant: "accent" }), "mt-5")} href={actionHref}>
        {actionLabel}
      </Link>
    </div>
  );
}

export function FeedbackKindIcon({ kind }: { kind: FeedbackSubmission["kind"] }) {
  const Icon =
    kind === "idea"
      ? Lightbulb
      : kind === "bug"
        ? Bug
        : kind === "question"
          ? CircleHelp
          : MessageCircle;

  return <Icon className="size-4" aria-hidden="true" />;
}

export function StatusBadge({
  status,
  label,
}: {
  status: FeedbackSubmission["status"] | FeedbackIdea["status"];
  label: string;
}) {
  const positive = status === "shipped" || status === "resolved";
  const active = status === "planned" || status === "in_progress";
  const declined = status === "not_planned";

  return (
    <span
      className={cn(
        "tag inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1.5",
        positive &&
          "border-[color-mix(in_srgb,var(--good)_55%,var(--line-strong))] bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[var(--good)]",
        active &&
          "border-[color-mix(in_srgb,var(--accent-2)_55%,var(--line-strong))] bg-[color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)]",
        declined &&
          "border-[var(--line-strong)] bg-[var(--paper-2)] text-[var(--ink-soft)]",
        !positive &&
          !active &&
          !declined &&
          "border-[color-mix(in_srgb,var(--accent)_50%,var(--line-strong))] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-[var(--accent)]",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function ActionMessage({
  state,
  compact = false,
}: {
  state: FeedbackActionState;
  compact?: boolean;
}) {
  if (!state.message) {
    return <span />;
  }

  return (
    <p
      aria-live="polite"
      className={cn(
        "text-sm font-bold",
        compact && "text-xs",
        state.status === "error" ? "text-[var(--accent)]" : "text-[var(--good)]",
      )}
    >
      {state.message}
    </p>
  );
}

function PendingButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatShortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : dateFormatter.format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateTimeFormatter.format(date);
}
