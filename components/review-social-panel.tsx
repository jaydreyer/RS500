"use client";

import { useMemo, useState, useTransition } from "react";
import { MessageCircle, Send, SmilePlus, Trash2 } from "lucide-react";

import { upsertReactionAction } from "@/app/(club)/board/actions";
import {
  createReviewReplyAction,
  deleteReviewReplyAction,
} from "@/app/(club)/history/actions";
import { ClubAvatar } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import {
  EXTRA_REACTIONS,
  EXTRA_REACTION_GROUPS,
  QUICK_REACTION_KEYS,
  QUICK_REACTIONS,
  getEmojiReactionLabel,
  getReactionKey,
  normalizeEmojiSearch,
} from "@/lib/reaction-options";
import { cn } from "@/lib/utils";
import type { HistoryReaction, HistoryReply } from "@/lib/history";

const MAX_REPLY_BODY = 280;

export function ReviewSocialPanel({
  currentUserId,
  listenId,
  reactions,
  replies,
}: {
  currentUserId: string;
  listenId: string;
  reactions: HistoryReaction[];
  replies: HistoryReply[];
}) {
  const existing = reactions.find((reaction) => reaction.userId === currentUserId);
  const [emoji, setEmoji] = useState(existing?.emoji ?? "");
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedReactionKey = getReactionKey(emoji);
  const savedComment = existing?.comment ?? "";
  const reactionComments = reactions.filter((reaction) => reaction.comment);

  function saveReaction(nextEmoji: string) {
    setMessage(null);
    setEmoji(nextEmoji);

    startTransition(async () => {
      const result = await upsertReactionAction({
        listenId,
        emoji: nextEmoji,
        comment: savedComment,
      });

      setMessage(result.status === "error" ? result.message : null);
    });
  }

  function createReply() {
    setMessage(null);
    startTransition(async () => {
      const result = await createReviewReplyAction({
        listenId,
        body: reply,
      });

      if (result.status === "success") {
        setReply("");
        setMessage(null);
      } else {
        setMessage(result.message);
      }
    });
  }

  function deleteReply(replyId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteReviewReplyAction({ replyId });

      setMessage(result.status === "error" ? result.message : null);
    });
  }

  return (
    <div className="grid gap-3 border-t border-[var(--line)] pt-3">
      <ReactionForms
        currentUserId={currentUserId}
        currentEmoji={emoji}
        listenId={listenId}
        reactions={reactions}
        selectedReactionKey={selectedReactionKey}
        onSelect={saveReaction}
      />

      {(reactionComments.length > 0 || replies.length > 0) && (
        <div className="grid gap-2">
          {reactionComments.map((entry) => (
            <div
              key={`reaction-comment-${entry.id}`}
              className="flex gap-2 rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] p-2"
            >
              <ClubAvatar
                imageUrl={entry.user.avatarUrl}
                initials={entry.user.initials}
                label={entry.user.displayName}
                size="sm"
              />
              <p className="min-w-0 flex-1 text-sm leading-snug text-[var(--ink-soft)]">
                <strong className="text-[var(--ink)]">{entry.user.displayName}</strong>{" "}
                {entry.comment}
              </p>
            </div>
          ))}
          {replies.map((entry) => (
            <div
              key={`reply-${entry.id}`}
              className="flex gap-2 rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] p-2"
            >
              <ClubAvatar
                imageUrl={entry.user.avatarUrl}
                initials={entry.user.initials}
                label={entry.user.displayName}
                size="sm"
              />
              <p className="min-w-0 flex-1 text-sm leading-snug text-[var(--ink-soft)]">
                <strong className="text-[var(--ink)]">{entry.user.displayName}</strong>{" "}
                {entry.body}
              </p>
              {entry.userId === currentUserId && (
                <Button
                  type="button"
                  aria-label="Delete reply"
                  title="Delete reply"
                  size="icon"
                  variant="quiet"
                  className="size-8 shrink-0 px-0"
                  disabled={isPending}
                  onClick={() => deleteReply(entry.id)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createReply();
        }}
      >
        <label className="sr-only" htmlFor={`review-reply-${listenId}`}>
          Reply
        </label>
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-3 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_18%,transparent)]">
          <MessageCircle className="size-4 shrink-0 text-[var(--ink-faint)]" aria-hidden="true" />
          <input
            id={`review-reply-${listenId}`}
            value={reply}
            maxLength={MAX_REPLY_BODY}
            onChange={(event) => setReply(event.target.value)}
            placeholder="reply to this review"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
          />
        </div>
        <Button
          type="submit"
          aria-label="Post reply"
          title="Post reply"
          size="icon"
          variant="quiet"
          className="size-10 px-0"
          disabled={isPending}
        >
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
      {message && <p className="text-xs text-[var(--accent)]">{message}</p>}
    </div>
  );
}

function ReactionForms({
  currentUserId,
  currentEmoji,
  listenId,
  reactions,
  selectedReactionKey,
  onSelect,
}: {
  currentUserId: string;
  currentEmoji: string;
  listenId: string;
  reactions: HistoryReaction[];
  selectedReactionKey?: string;
  onSelect: (emoji: string) => void;
}) {
  const quickGrouped = useMemo(
    () =>
      QUICK_REACTIONS.map((reaction) => ({
        ...reaction,
        count: reactions.filter((entry) => entry.emoji === reaction.key).length,
        active: selectedReactionKey === reaction.key,
      })),
    [reactions, selectedReactionKey],
  );
  const extraGrouped = useMemo(() => {
    const byEmoji = new Map<string, { active: boolean; count: number; emoji: string }>();

    reactions.forEach((reaction) => {
      if (!reaction.emoji || QUICK_REACTION_KEYS.has(reaction.emoji)) {
        return;
      }

      const entry = byEmoji.get(reaction.emoji) ?? {
        active: false,
        count: 0,
        emoji: reaction.emoji,
      };

      entry.count += 1;
      entry.active = entry.active || reaction.userId === currentUserId;
      byEmoji.set(reaction.emoji, entry);
    });

    return [...byEmoji.values()].sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }, [currentUserId, reactions]);

  return (
    <div className="flex flex-wrap items-center gap-1.5 overflow-visible">
      {quickGrouped.map((reaction) => (
        <ReactionButton
          key={reaction.key}
          active={reaction.active}
          count={reaction.count}
          emoji={reaction.emoji}
          label={reaction.label}
          value={reaction.key}
          onSelect={onSelect}
        />
      ))}
      {extraGrouped.map((reaction) => (
        <ReactionButton
          key={reaction.emoji}
          active={reaction.active}
          count={reaction.count}
          emoji={reaction.emoji}
          label={getEmojiReactionLabel(reaction.emoji)}
          value={reaction.emoji}
          onSelect={onSelect}
        />
      ))}
      <EmojiReactionPicker currentEmoji={currentEmoji} idBase={listenId} onSelect={onSelect} />
    </div>
  );
}

function ReactionButton({
  active,
  count,
  emoji,
  label,
  value,
  onSelect,
}: {
  active: boolean;
  count: number;
  emoji: string;
  label: string;
  value: string;
  onSelect: (emoji: string) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={`React ${emoji} ${label}`}
      onClick={() => onSelect(active ? "" : value)}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm leading-none transition-colors",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
          : "border-[var(--line-strong)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
      )}
    >
      <span>{emoji}</span>
      {count > 0 && <span className="mono text-[10px]">{count}</span>}
    </button>
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
            <label className="sr-only" htmlFor={`review-emoji-search-${idBase}`}>
              Search emoji
            </label>
            <input
              id={`review-emoji-search-${idBase}`}
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
                    onSelect(currentEmoji === reaction.emoji ? "" : reaction.emoji);
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
