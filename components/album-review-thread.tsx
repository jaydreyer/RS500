"use client";

import { useMemo, useState, useTransition } from "react";
import { MessageCircle, Send, SmilePlus } from "lucide-react";

import { upsertReactionAction } from "@/app/(club)/board/actions";
import { ClubAvatar, ScoreBadge } from "@/components/primitives";
import { ReviewMarkdown } from "@/components/review-markdown";
import { Button } from "@/components/ui/button";
import { RATING_SCALE } from "@/lib/config";
import {
  EXTRA_REACTIONS,
  EXTRA_REACTION_GROUPS,
  QUICK_REACTIONS,
  getReactionEmoji,
  getReactionKey,
  normalizeEmojiSearch,
} from "@/lib/reaction-options";
import { cn } from "@/lib/utils";
import type { AlbumDetailListen, AlbumDetailReaction } from "@/lib/catalog";

export function AlbumReviewThread({
  currentUserId,
  listens,
  reactions,
}: {
  currentUserId: string;
  listens: AlbumDetailListen[];
  reactions: AlbumDetailReaction[];
}) {
  if (listens.length === 0) {
    return (
      <section className="surface-panel mt-8 rounded-lg p-5">
        <h2 className="text-2xl">Crew reviews</h2>
        <p className="tag mt-4">Nobody in the crew has logged this yet</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl">Crew reviews</h2>
          <p className="tag mt-1">full takes, reactions, and comments</p>
        </div>
        <span className="tag rounded-sm border border-[var(--line-strong)] px-2 py-1">
          {listens.length} logged
        </span>
      </div>
      <div className="grid gap-4">
        {listens.map((listen) => {
          const listenReactions = reactions.filter(
            (reaction) => reaction.listenId === listen.id,
          );

          return (
            <ReviewEntry
              key={listen.id}
              currentUserId={currentUserId}
              listen={listen}
              reactions={listenReactions}
            />
          );
        })}
      </div>
    </section>
  );
}

function ReviewEntry({
  currentUserId,
  listen,
  reactions,
}: {
  currentUserId: string;
  listen: AlbumDetailListen;
  reactions: AlbumDetailReaction[];
}) {
  const existing = reactions.find((reaction) => reaction.userId === currentUserId);
  const comments = reactions.filter((reaction) => reaction.comment);

  return (
    <article className="hard-panel overflow-visible rounded-lg">
      <div className="flex flex-wrap items-center gap-3 rounded-t-md border-b border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
        <ClubAvatar
          imageUrl={listen.user.avatarUrl}
          initials={listen.user.initials}
          label={listen.user.displayName}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="font-display text-lg text-[var(--ink)]">
              {listen.user.displayName}
            </strong>
            <span className="tag rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
              {listen.kind === "skip" ? "already heard" : "fresh"}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          {listen.status === "listening" ? (
            <span className="tag inline-flex items-center gap-1.5 text-[var(--accent)]">
              <span className="size-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot" />
              listening
            </span>
          ) : (
            <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} emptyLabel="no score" />
          )}
        </div>
      </div>

      <div className="grid gap-4 p-4">
        {listen.take ? (
          <div className="rounded-md border-l-2 border-[var(--accent)] bg-[var(--paper-2)] px-4 py-3">
            <ReviewMarkdown
              quoted={false}
              className="font-quote text-xl leading-8 text-[var(--ink)]"
            >
              {listen.take}
            </ReviewMarkdown>
          </div>
        ) : (
          <p className="tag rounded-md border border-dashed border-[var(--line-strong)] px-3 py-2">
            {listen.status === "listening" ? "review drops when they rate it" : "no review logged"}
          </p>
        )}

        <div className="grid gap-3 border-t border-[var(--line)] pt-3">
          <ReactionChips reactions={reactions} />
          {comments.length > 0 && (
            <div className="grid gap-2">
              {comments.map((reaction) => (
                <div
                  key={reaction.id}
                  className="flex gap-2 rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] p-2"
                >
                  <ClubAvatar
                    imageUrl={reaction.user.avatarUrl}
                    initials={reaction.user.initials}
                    label={reaction.user.displayName}
                    size="sm"
                  />
                  <p className="min-w-0 text-sm leading-snug text-[var(--ink-soft)]">
                    <strong className="text-[var(--ink)]">{reaction.user.displayName}</strong>{" "}
                    {reaction.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
          <ReactionEditor
            key={`${listen.id}-${existing?.updated ?? "new"}`}
            listenId={listen.id}
            existing={existing}
          />
        </div>
      </div>
    </article>
  );
}

function ReactionEditor({
  listenId,
  existing,
}: {
  listenId: string;
  existing?: AlbumDetailReaction;
}) {
  const [emoji, setEmoji] = useState(existing?.emoji ?? "");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const savedComment = existing?.comment ?? "";
  const selectedReactionKey = getReactionKey(emoji);

  function saveReaction(
    nextEmoji = emoji,
    nextComment = comment,
    options: { clearCommentOnSuccess?: boolean } = {},
  ) {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertReactionAction({
        listenId,
        emoji: nextEmoji,
        comment: nextComment,
      });

      if (result.status === "success" && options.clearCommentOnSuccess) {
        setComment("");
      }

      setMessage(result.status === "error" ? result.message : null);
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SmilePlus className="mr-1 size-4 text-[var(--ink-faint)]" aria-hidden="true" />
        {QUICK_REACTIONS.map((reaction) => (
          <button
            key={reaction.key}
            type="button"
            title={reaction.label}
            aria-label={`React ${reaction.emoji} ${reaction.label}`}
            onClick={() => {
              const nextEmoji = selectedReactionKey === reaction.key ? "" : reaction.key;
              const nextComment = comment.trim() ? comment : savedComment;
              setEmoji(nextEmoji);
              saveReaction(nextEmoji, nextComment);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-sm leading-none transition-colors",
              selectedReactionKey === reaction.key
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                : "border-[var(--line-strong)] bg-[var(--paper-2)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
          >
            {reaction.emoji}
          </button>
        ))}
        <EmojiReactionPicker
          currentEmoji={emoji}
          idBase={listenId}
          onSelect={(value) => {
            const nextEmoji = emoji === value ? "" : value;
            const nextComment = comment.trim() ? comment : savedComment;
            setEmoji(nextEmoji);
            saveReaction(nextEmoji, nextComment);
          }}
        />
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          saveReaction(emoji, comment, { clearCommentOnSuccess: true });
        }}
      >
        <label className="sr-only" htmlFor={`album-comment-${listenId}`}>
          Comment
        </label>
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-3 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_18%,transparent)]">
          <MessageCircle className="size-4 shrink-0 text-[var(--ink-faint)]" aria-hidden="true" />
          <input
            id={`album-comment-${listenId}`}
            value={comment}
            maxLength={180}
            onChange={(event) => setComment(event.target.value)}
            placeholder={savedComment ? "replace your comment" : "comment on this review"}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
          />
        </div>
        <Button
          type="submit"
          aria-label="Save comment"
          title="Save comment"
          size="icon"
          variant="quiet"
          className="size-10 px-0"
          disabled={isPending}
        >
          <Send className="size-4" />
        </Button>
      </form>
      {message && <p className="text-xs text-[var(--accent)]">{message}</p>}
    </div>
  );
}

function EmojiReactionPicker({
  currentEmoji,
  idBase,
  onSelect,
}: {
  currentEmoji: string;
  idBase: string;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryKey, setCategoryKey] = useState<string>(EXTRA_REACTION_GROUPS[0].key);
  const normalizedQuery = normalizeEmojiSearch(query);
  const activeGroup =
    EXTRA_REACTION_GROUPS.find((group) => group.key === categoryKey) ?? EXTRA_REACTION_GROUPS[0];
  const matches = useMemo(() => {
    if (!normalizedQuery) {
      return activeGroup.reactions;
    }

    return EXTRA_REACTIONS.filter((reaction) =>
      normalizeEmojiSearch(`${reaction.emoji} ${reaction.label}`).includes(normalizedQuery),
    ).slice(0, 60);
  }, [activeGroup.reactions, normalizedQuery]);

  return (
    <div className={cn("relative", open && "z-50")}>
      <Button
        type="button"
        variant="quiet"
        size="icon"
        className="size-8 rounded-full border border-[var(--line-strong)] bg-[var(--card)] px-0"
        aria-label="More emoji"
        title="More emoji"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <SmilePlus className="size-4" aria-hidden="true" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--card)] shadow-[0_18px_44px_-24px_#000] sm:left-auto sm:right-0">
          <div className="border-b border-[var(--line)] bg-[var(--paper-2)] p-2">
            <label className="sr-only" htmlFor={`album-emoji-search-${idBase}`}>
              Search emoji
            </label>
            <input
              id={`album-emoji-search-${idBase}`}
              className="input-control h-9 w-full px-3 py-1 text-sm"
              placeholder="Search emoji"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div
            className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--paper-2)] px-2 py-1.5"
            role="tablist"
            aria-label="Emoji categories"
          >
            {EXTRA_REACTION_GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={group.key === categoryKey}
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-md border text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                  group.key === categoryKey
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                    : "border-transparent hover:bg-[var(--card)]",
                )}
                title={group.label}
                aria-label={group.label}
                onClick={() => {
                  setCategoryKey(group.key);
                  setQuery("");
                }}
              >
                <span aria-hidden="true">{group.icon}</span>
              </button>
            ))}
          </div>
          <div className="grid max-h-72 grid-cols-6 gap-1 overflow-auto p-2">
            {matches.length === 0 ? (
              <p className="tag col-span-6 px-1 py-2">No emoji found</p>
            ) : (
              matches.map((reaction) => (
                <button
                  key={`${reaction.emoji}-${reaction.label}`}
                  type="button"
                  className={cn(
                    "grid size-10 place-items-center rounded-md text-xl transition-colors hover:bg-[var(--paper-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    currentEmoji === reaction.emoji &&
                      "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]",
                  )}
                  title={reaction.label}
                  aria-label={`React ${reaction.emoji} ${reaction.label}`}
                  onClick={() => {
                    onSelect(reaction.emoji);
                    setOpen(false);
                  }}
                >
                  {reaction.emoji}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReactionChips({ reactions }: { reactions: AlbumDetailReaction[] }) {
  const emojiReactions = reactions.filter((reaction) => reaction.emoji);

  if (emojiReactions.length === 0) {
    return <span className="tag">no reactions yet</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {emojiReactions.map((reaction) => (
        <span
          key={reaction.id}
          title={reaction.user.displayName}
          className="rounded-full border border-[var(--line-strong)] bg-[var(--paper-2)] px-2 py-1 text-sm leading-none text-[var(--ink-soft)]"
        >
          {displayEmoji(reaction.emoji)}
        </span>
      ))}
    </div>
  );
}

function displayEmoji(value: string) {
  return getReactionEmoji(value);
}
