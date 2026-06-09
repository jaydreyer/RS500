"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Disc3, ExternalLink, MessageCircle, Music2, Send, SmilePlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PocketBase, { BaseAuthStore, type UnsubscribeFunc } from "pocketbase";

import { upsertReactionAction } from "@/app/(club)/board/actions";
import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, ScoreBadge } from "@/components/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { RATING_SCALE } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { BoardListen, BoardMember, BoardReaction, BoardState } from "@/lib/board";

const QUICK_EMOJI = ["fire", "100", "heart", "wow", "eyes"];

export function BoardClient({
  initialState,
  pbUrl,
  authToken,
}: {
  initialState: BoardState;
  pbUrl: string;
  authToken: string;
}) {
  const router = useRouter();
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const pb = useMemo(() => {
    const client = new PocketBase(pbUrl, new BaseAuthStore());
    client.autoCancellation(false);
    client.authStore.save(authToken);
    return client;
  }, [authToken, pbUrl]);

  const cards = useMemo(
    () =>
      initialState.members.map((member) => ({
        member,
        pick: initialState.listens.find((listen) => listen.userId === member.id) ?? null,
      })),
    [initialState.listens, initialState.members],
  );
  const ratedCount = cards.filter((card) => card.pick?.status === "rated").length;
  const listeningCount = cards.filter((card) => card.pick?.status === "listening").length;

  useEffect(() => {
    let cancelled = false;
    const unsubscribers: UnsubscribeFunc[] = [];

    async function subscribe() {
      try {
        const [unsubscribeListens, unsubscribeReactions] = await Promise.all([
          pb.collection("listens").subscribe(
            "*",
            (event) => {
              setLiveMessage(formatLiveMessage("listen", event.action));
              router.refresh();
            },
            {
              filter: pb.filter('week = {:week} && kind = "fresh"', {
                week: initialState.weekKey,
              }),
              expand: "album,user",
            },
          ),
          pb.collection("reactions").subscribe("*", (event) => {
            setLiveMessage(formatLiveMessage("reaction", event.action));
            router.refresh();
          }),
        ]);

        if (cancelled) {
          await Promise.all([unsubscribeListens(), unsubscribeReactions()]);
          return;
        }

        unsubscribers.push(unsubscribeListens, unsubscribeReactions);
        setRealtimeError(null);
      } catch {
        if (!cancelled) {
          setRealtimeError("Live updates could not connect. Refreshing the page will still show the latest board.");
        }
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      void Promise.all(unsubscribers.map((unsubscribe) => unsubscribe()));
    };
  }, [initialState.weekKey, pb, router]);

  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="tag flex items-center gap-3">
            <span className="h-0.5 w-4 bg-[var(--accent)]" />
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--accent)] animate-live-blink" />
              LIVE
            </span>
            <span>/ {initialState.weekLabel}</span>
          </div>
          <h1 className="mt-3 text-5xl md:text-7xl">The Board</h1>
        </div>
        <div className="pressed-panel flex flex-wrap gap-4 rounded-lg px-4 py-3">
          <Stat label="rated" value={ratedCount} />
          <Stat label="listening" value={listeningCount} accent />
          <Stat label="crew" value={initialState.members.length} />
        </div>
      </div>

      {(liveMessage || realtimeError) && (
        <div
          className={cn(
            "surface-panel mb-5 rounded-md px-4 py-3 text-sm animate-rise-in",
            realtimeError
              ? "border-[var(--line-strong)] text-[var(--ink-soft)]"
              : "border-dashed border-[var(--accent)] text-[var(--ink-soft)]",
          )}
        >
          {!realtimeError && <span className="mono text-[var(--accent)]">just now</span>}{" "}
          {realtimeError ?? liveMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[repeat(auto-fill,minmax(310px,1fr))]">
        {cards.map(({ member, pick }) => (
          <BoardCard
            key={member.id}
            currentUserId={initialState.currentUser.id}
            member={member}
            pick={pick}
            reactions={pick ? initialState.reactions.filter((reaction) => reaction.listenId === pick.id) : []}
          />
        ))}
      </div>
    </section>
  );
}

function BoardCard({
  currentUserId,
  member,
  pick,
  reactions,
}: {
  currentUserId: string;
  member: BoardMember;
  pick: BoardListen | null;
  reactions: BoardReaction[];
}) {
  const isMe = currentUserId === member.id;

  if (!pick) {
    return (
      <article className="pressed-panel grid min-h-[300px] place-items-center rounded-lg p-5 text-center">
        <div>
          <ClubAvatar initials={member.initials} size="lg" ring={isMe} />
          <h2 className="title-wrap mt-4 text-2xl">{isMe ? "You" : member.displayName}</h2>
          <p className="tag mt-2">{isMe ? "haven't drawn yet" : "no pick this week"}</p>
          {isMe && (
            <Link
              href="/week"
              className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-5")}
            >
                <Disc3 className="size-4" />
                Draw your pick
            </Link>
          )}
        </div>
      </article>
    );
  }

  const listening = pick.status === "listening";
  const commentReactions = reactions.filter((reaction) => reaction.comment);

  return (
    <article className="hard-panel flex overflow-hidden rounded-lg flex-col transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center gap-3 border-b border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
        <ClubAvatar initials={member.initials} size="sm" ring={isMe} />
        <h2 className="min-w-0 truncate text-lg">{isMe ? "You" : member.displayName}</h2>
        <div className="ml-auto shrink-0">
          {listening ? <ListeningBadge /> : <ScoreBadge score={pick.rating} label={`/${RATING_SCALE.max}`} />}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[124px_1fr]">
        <Link href={`/albums/${pick.album.id}`} className="mx-auto w-[min(46vw,124px)] shrink-0 sm:mx-0">
          <AlbumCover
            rank={pick.album.rank}
            src={pick.album.coverUrl}
            title={pick.album.title}
            className="cover-lift rounded-sm"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="mono text-[11px] text-[var(--ink-faint)]">
            #{pick.album.rank} / {pick.album.year}
          </p>
          <Link href={`/albums/${pick.album.id}`}>
            <h3 className="title-wrap mt-1 text-2xl leading-tight">{pick.album.title}</h3>
          </Link>
          <p className="mt-1 font-quote text-lg leading-tight text-[var(--ink-soft)]">
            {pick.album.artist}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        {pick.take ? (
          <p className="rounded-md border-l-2 border-[var(--accent)] bg-[var(--paper-2)] px-3 py-2 font-quote text-lg italic leading-snug text-[var(--ink)]">
            &quot;{pick.take}&quot;
          </p>
        ) : (
          <p className="tag rounded-md border border-dashed border-[var(--line-strong)] px-3 py-2">
            {listening ? "take drops when they rate it" : "no take logged"}
          </p>
        )}
      </div>

      <div className="mt-auto border-t border-[var(--line-strong)] px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <ReactionChips reactions={reactions} />
          <ServiceLinks album={pick.album} />
        </div>
        {commentReactions.length > 0 && (
          <div className="mb-3 grid gap-2">
            {commentReactions.map((reaction) => (
              <div
                key={reaction.id}
                className="flex gap-2 rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] p-2"
              >
                <ClubAvatar initials={reaction.user.initials} size="sm" />
                <p className="min-w-0 text-sm leading-snug text-[var(--ink-soft)]">
                  <strong className="text-[var(--ink)]">{reaction.user.displayName}</strong>{" "}
                  {reaction.comment}
                </p>
              </div>
            ))}
          </div>
        )}
        <ReactionEditor
          key={`${pick.id}-${reactions.find((reaction) => reaction.userId === currentUserId)?.updated ?? "new"}`}
          listenId={pick.id}
          existing={reactions.find((reaction) => reaction.userId === currentUserId)}
        />
      </div>
    </article>
  );
}

function ReactionEditor({
  listenId,
  existing,
}: {
  listenId: string;
  existing?: BoardReaction;
}) {
  const [emoji, setEmoji] = useState(existing?.emoji ?? "");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveReaction(nextEmoji = emoji, nextComment = comment) {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertReactionAction({
        listenId,
        emoji: nextEmoji,
        comment: nextComment,
      });

      setMessage(result.status === "error" ? result.message : null);
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SmilePlus className="mr-1 size-4 text-[var(--ink-faint)]" aria-hidden="true" />
        {QUICK_EMOJI.map((quickEmoji) => (
          <button
            key={quickEmoji}
            type="button"
            title={quickEmoji}
            aria-label={`React ${quickEmoji}`}
            onClick={() => {
              const nextEmoji = emoji === quickEmoji ? "" : quickEmoji;
              setEmoji(nextEmoji);
              saveReaction(nextEmoji, comment);
            }}
            className={cn(
              "mono rounded-full border px-2 py-1 text-[10px] transition-colors",
              emoji === quickEmoji
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                : "border-[var(--line-strong)] bg-[var(--paper-2)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
          >
            {quickEmoji}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          saveReaction();
        }}
      >
        <label className="sr-only" htmlFor={`comment-${listenId}`}>
          Comment
        </label>
        <div className="relative min-w-0 flex-1">
          <MessageCircle
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-faint)]"
            aria-hidden="true"
          />
          <input
            id={`comment-${listenId}`}
            value={comment}
            maxLength={180}
            onChange={(event) => setComment(event.target.value)}
            placeholder="short comment"
            className="input-control h-10 pl-9 text-sm"
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

function ReactionChips({ reactions }: { reactions: BoardReaction[] }) {
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
          className="mono rounded-full border border-[var(--line-strong)] bg-[var(--paper-2)] px-2 py-1 text-[10px] text-[var(--ink-soft)]"
        >
          {reaction.emoji}
        </span>
      ))}
    </div>
  );
}

function ServiceLinks({ album }: { album: BoardListen["album"] }) {
  const links = [
    album.spotifyUrl ? { href: album.spotifyUrl, label: "Spotify" } : null,
    album.appleMusicUrl ? { href: album.appleMusicUrl, label: "Apple" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 px-2 text-[11px]",
          )}
        >
          <Music2 className="size-3.5" />
          {link.label}
          <ExternalLink className="size-3" />
        </a>
      ))}
    </div>
  );
}

function ListeningBadge() {
  return (
    <span className="tag inline-flex items-center gap-1.5 text-[var(--accent)]">
      <span className="size-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot" />
      listening
    </span>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="min-w-16 text-right">
      <div
        className={cn(
          "font-display text-3xl font-extrabold leading-none",
          accent && "text-[var(--accent)]",
        )}
      >
        {value}
      </div>
      <div className="tag mt-1">{label}</div>
    </div>
  );
}

function formatLiveMessage(collection: "listen" | "reaction", action: string) {
  if (collection === "listen") {
    if (action === "create") {
      return "A fresh pick hit the board.";
    }

    if (action === "update") {
      return "A board pick was updated.";
    }

    return "The board changed.";
  }

  if (action === "create") {
    return "A new reaction landed.";
  }

  if (action === "update") {
    return "A reaction was edited.";
  }

  return "The reaction row changed.";
}
