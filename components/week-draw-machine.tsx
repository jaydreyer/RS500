"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Disc3, ExternalLink, Music2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  initialGroupDrawActionState,
  initialWeekActionState,
} from "@/app/(club)/week/action-state";
import {
  drawAction,
  groupDrawAction,
  keepFreshPickAction,
  replaceUnavailablePickAction,
  skipRatingAction,
} from "@/app/(club)/week/actions";
import { AlbumRatingPanel } from "@/components/album-rating-panel";
import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, Eyebrow, RatingInput } from "@/components/primitives";
import { ReviewTextarea } from "@/components/review-textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { RATING_SCALE } from "@/lib/config";
import { countTakeCharacters, TAKE_MAX_LENGTH } from "@/lib/draw-rules";
import type { ListenSummary, WeekState } from "@/lib/draw";
import type { UserGroupDraw, UserGroupDrawState } from "@/lib/group-draw-types";
import { cn } from "@/lib/utils";

type Phase = "idle" | "spinning" | "presented" | "rate-skip" | "kept";

const DRAW_LOCK_DELAY_MS = 1450;
const DRAW_REVEAL_DELAY_MS = 1950;

export function WeekDrawMachine({
  weekState,
  groupDrawState,
}: {
  weekState: WeekState;
  groupDrawState: UserGroupDrawState;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawnListen, setDrawnListen] = useState<ListenSummary | null>(null);
  const [scramble, setScramble] = useState("000");
  const [spinCue, setSpinCue] = useState("spinning the crate...");
  const [toast, setToast] = useState<string | null>(null);
  const [drawState, drawFormAction, isDrawPending] = useActionState(
    drawAction,
    initialWeekActionState,
  );
  const [keepState, keepFormAction, isKeepPending] = useActionState(
    keepFreshPickAction,
    initialWeekActionState,
  );
  const [skipState, skipFormAction, isSkipPending] = useActionState(
    skipRatingAction,
    initialWeekActionState,
  );
  const [replaceState, replaceFormAction, isReplacePending] = useActionState(
    replaceUnavailablePickAction,
    initialWeekActionState,
  );
  const [groupState, groupFormAction, isGroupPending] = useActionState(
    groupDrawAction,
    initialGroupDrawActionState,
  );

  useEffect(() => {
    if (phase !== "spinning") {
      return;
    }

    const interval = window.setInterval(() => {
      setScramble(String(1 + Math.floor(Math.random() * 500)).padStart(3, "0"));
    }, 80);

    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (drawState.status === "success" && drawState.listen) {
      const settleTimer = window.setTimeout(() => {
        setScramble(String(drawState.listen?.album.rank ?? 0).padStart(3, "0"));
        setSpinCue("needle dropped...");
      }, DRAW_LOCK_DELAY_MS);

      const revealTimer = window.setTimeout(() => {
        setDrawnListen(drawState.listen);
        setPhase("presented");
      }, DRAW_REVEAL_DELAY_MS);

      return () => {
        window.clearTimeout(settleTimer);
        window.clearTimeout(revealTimer);
      };
    }

    if (drawState.status === "error") {
      const timer = window.setTimeout(() => {
        setPhase("idle");
        setToast(drawState.message);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [drawState]);

  useEffect(() => {
    if (keepState.status === "success") {
      const timer = window.setTimeout(() => {
        setPhase("kept");
        setToast(keepState.message);
        router.refresh();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (keepState.status === "error") {
      const timer = window.setTimeout(() => setToast(keepState.message), 0);
      return () => window.clearTimeout(timer);
    }
  }, [keepState, router]);

  useEffect(() => {
    if (skipState.status === "success") {
      const timer = window.setTimeout(() => {
        setPhase("idle");
        setDrawnListen(null);
        setToast(skipState.message);
        router.refresh();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (skipState.status === "error") {
      const timer = window.setTimeout(() => setToast(skipState.message), 0);
      return () => window.clearTimeout(timer);
    }
  }, [skipState, router]);

  useEffect(() => {
    if (replaceState.status === "success" && replaceState.listen) {
      const timer = window.setTimeout(() => {
        setDrawnListen(replaceState.listen);
        setPhase("presented");
        setToast(replaceState.message);
        router.refresh();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (replaceState.status === "error") {
      const timer = window.setTimeout(() => setToast(replaceState.message), 0);
      return () => window.clearTimeout(timer);
    }
  }, [replaceState, router]);

  useEffect(() => {
    if (groupState.status === "success") {
      const timer = window.setTimeout(() => {
        setToast(groupState.message);
        router.refresh();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (groupState.status === "error") {
      const timer = window.setTimeout(() => setToast(groupState.message), 0);
      return () => window.clearTimeout(timer);
    }
  }, [groupState, router]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeFresh = weekState.activeFresh;
  const poolText = `${weekState.poolLeft} of ${weekState.totalAlbums} unlogged`;
  const showActivePick = Boolean(activeFresh) && phase === "idle";
  const isGroupMember = groupDrawState.groups.length > 0;

  function startDraw() {
    setDrawnListen(null);
    setPhase("spinning");
    setScramble("000");
    setSpinCue("digging through the crate...");
  }

  function resetMachine() {
    setDrawnListen(null);
    setPhase("idle");
  }

  return (
    <section className="mx-auto max-w-[920px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow>{showActivePick ? "CURRENT PICK" : "NEXT DRAW"}</Eyebrow>
          <h1 className="mt-3 text-5xl md:text-7xl">My Pick</h1>
        </div>
        <div className="pressed-panel flex flex-wrap gap-4 rounded-lg px-4 py-3">
          <Stat label="picks kept" value={weekState.freshCount} />
          <Stat label="skips logged" value={weekState.skipCount} />
          <Stat label="pool left" value={weekState.poolLeft} accent />
        </div>
      </div>

      {showActivePick && activeFresh ? (
        <>
          <ActivePickReview listen={activeFresh} />
          <LockedDrawPanel listen={activeFresh} poolText={poolText} />
        </>
      ) : isGroupMember ? (
        <GroupOnlyDrawPanel groupCount={groupDrawState.groups.length} />
      ) : (
        <div className="hard-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-5 py-3">
            <span className="tag">SPIN / 500 RANDOMIZER</span>
            <span className="mono text-[11px] text-[var(--ink-faint)]">{poolText}</span>
          </div>
          <div className="relative grid min-h-[500px] place-items-center overflow-hidden px-5 py-10 md:px-8">
            <div className="record-ring pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-[var(--line-strong)] opacity-25" />
            {phase === "idle" && (
              <IdleFace
                activeFresh={activeFresh}
                poolLeft={weekState.poolLeft}
                isPending={isDrawPending}
                onSubmit={startDraw}
                action={drawFormAction}
              />
            )}
            {phase === "spinning" && <SpinFace scramble={scramble} cue={spinCue} />}
            {(phase === "presented" || phase === "rate-skip" || phase === "kept") &&
              drawnListen && (
                <PresentedFace
                  phase={phase}
                  listen={drawnListen}
                  keepAction={keepFormAction}
                  skipAction={skipFormAction}
                  replaceAction={replaceFormAction}
                  isKeepPending={isKeepPending}
                  isSkipPending={isSkipPending}
                  isReplacePending={isReplacePending}
                  onHeard={() => setPhase("rate-skip")}
                  onReset={resetMachine}
                />
              )}
          </div>
        </div>
      )}

      {groupDrawState.groups.length > 0 && (
        <GroupDrawPanel
          groupDrawState={groupDrawState}
          action={groupFormAction}
          pending={isGroupPending}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow)]">
          {toast}
        </div>
      )}
    </section>
  );
}

function GroupOnlyDrawPanel({ groupCount }: { groupCount: number }) {
  return (
    <div className="hard-panel overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-5 py-3">
        <span className="tag">SPIN / GROUP MODE</span>
        <span className="mono text-[11px] text-[var(--ink-faint)]">
          {groupCount} active {groupCount === 1 ? "group" : "groups"}
        </span>
      </div>
      <div className="relative grid min-h-[360px] place-items-center overflow-hidden px-5 py-10 text-center md:px-8">
        <div className="record-ring pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-[var(--line-strong)] opacity-25" />
        <div className="animate-rise-in">
          <div className="mx-auto mb-8 grid size-40 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-2)]">
            <Users className="size-14 text-[var(--accent)]" aria-hidden="true" />
          </div>
          <h2 className="title-wrap mx-auto max-w-lg text-4xl md:text-6xl">
            Group draw is active.
          </h2>
          <p className="mx-auto mt-4 max-w-md font-quote text-lg text-[var(--ink-soft)]">
            Your next album comes from the shared group pool.
          </p>
          <a href="#group-draws" className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-7")}>
            <Users className="size-5" aria-hidden="true" />
            Go to group draw
          </a>
        </div>
      </div>
    </div>
  );
}

function ActivePickReview({ listen }: { listen: ListenSummary }) {
  return (
    <div className="hard-panel grid gap-7 overflow-hidden rounded-lg p-4 lg:grid-cols-[minmax(240px,340px)_1fr] lg:gap-10 lg:p-6">
      <div className="relative">
        <div className="record-ring absolute -left-16 top-10 hidden size-48 rounded-full opacity-25 lg:block" />
        <AlbumCover
          rank={listen.album.rank}
          src={listen.album.coverUrl}
          title={listen.album.title}
          sizes="(max-width: 1024px) calc(100vw - 2rem), 340px"
          loading="eager"
          fetchPriority="high"
          className="cover-lift relative w-full rounded-md"
        />
        <div className="mt-3 grid grid-cols-2 border-y border-[var(--line-strong)] py-3">
          <div>
            <div className="tag">RS rank</div>
            <div className="mono mt-1 text-2xl font-bold text-[var(--ink)]">
              #{listen.album.rank}
            </div>
          </div>
          <div className="border-l border-[var(--line-strong)] pl-4">
            <div className="tag">Released</div>
            <div className="mono mt-1 text-2xl font-bold text-[var(--ink)]">
              {listen.album.year}
            </div>
          </div>
        </div>
        <ActiveServiceLinks
          spotifyUrl={listen.album.spotifyUrl}
          appleMusicUrl={listen.album.appleMusicUrl}
          className="mt-4"
        />
      </div>

      <div className="min-w-0 py-1">
        <Eyebrow>rolling stone 500 / #{listen.album.rank}</Eyebrow>
        <h2 className="title-wrap mt-3 text-5xl md:text-7xl">{listen.album.title}</h2>
        <p className="mt-3 font-quote text-2xl text-[var(--ink-soft)]">
          {listen.album.artist}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-2.5 py-1 text-xs text-[var(--ink-soft)]">
            <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse-dot" />
            currently listening
          </span>
          <span className="tag rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
            fresh pick
          </span>
          {listen.week && (
            <span className="tag rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
              {listen.week}
            </span>
          )}
        </div>

        <AlbumRatingPanel
          key={`${listen.id}-${listen.ratedAt ?? "listening"}`}
          albumId={listen.album.id}
          initialListen={listen}
          replacementBehavior="refresh"
        />
      </div>
    </div>
  );
}

function LockedDrawPanel({
  listen,
  poolText,
}: {
  listen: ListenSummary;
  poolText: string;
}) {
  return (
    <div className="surface-panel mt-7 overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-[var(--line-strong)] px-5 py-3">
        <span className="tag">SPIN / 500 RANDOMIZER</span>
        <span className="mono text-[11px] text-[var(--ink-faint)]">{poolText}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <h3 className="title-wrap text-2xl">Next draw unlocks after this review.</h3>
          <p className="mt-2 font-quote text-lg text-[var(--ink-soft)]">
            Finish {listen.album.title}, then the crate opens again.
          </p>
        </div>
        <Button type="button" variant="accent" disabled>
          <Disc3 className="size-4" />
          Draw Next Album
        </Button>
      </div>
    </div>
  );
}

function ActiveServiceLinks({
  spotifyUrl,
  appleMusicUrl,
  className,
}: {
  spotifyUrl: string;
  appleMusicUrl: string;
  className?: string;
}) {
  const links = [
    spotifyUrl ? { href: spotifyUrl, label: getSpotifyLinkLabel(spotifyUrl) } : null,
    appleMusicUrl ? { href: appleMusicUrl, label: "Play on Apple Music" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  if (links.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {links.map((link, index) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: index === 0 ? "accent" : "ghost" }),
            "w-full",
          )}
        >
          <Music2 className="size-4" aria-hidden="true" />
          {link.label}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function getSpotifyLinkLabel(spotifyUrl: string) {
  return spotifyUrl.includes("open.spotify.com/search/") ? "Find on Spotify" : "Play on Spotify";
}

function IdleFace({
  activeFresh,
  poolLeft,
  isPending,
  onSubmit,
  action,
}: {
  activeFresh: ListenSummary | null;
  poolLeft: number;
  isPending: boolean;
  onSubmit: () => void;
  action: (payload: FormData) => void;
}) {
  const disabled = isPending || poolLeft === 0 || Boolean(activeFresh);

  return (
    <div className="animate-rise-in text-center">
      <RecordIcon className="mx-auto mb-8 size-40" />
      <h2 className="title-wrap mx-auto max-w-lg text-4xl md:text-6xl">
        {activeFresh ? "One pick at a time." : "Pull a record from the crate."}
      </h2>
      <p className="mx-auto mt-4 max-w-md font-quote text-lg text-[var(--ink-soft)]">
        {activeFresh
          ? `You're still listening to ${activeFresh.album.title}. Rate it below, then the crate opens again.`
          : "One album, drawn at random from the 500. No re-rolls. Discovery through constraint."}
      </p>
      <form action={action} onSubmit={onSubmit}>
        <Button type="submit" variant="accent" size="lg" className="mt-7" disabled={disabled}>
          <Disc3 className="size-5" />
          {isPending ? "DRAWING..." : "DRAW NEXT ALBUM"}
        </Button>
      </form>
      <p className="tag mt-5">
        rating scale / {RATING_SCALE.min}-{RATING_SCALE.max}
      </p>
    </div>
  );
}

function SpinFace({ scramble, cue }: { scramble: string; cue: string }) {
  return (
    <div className="text-center">
      <RecordIcon className="mx-auto mb-6 size-48 animate-spin-record motion-reduce:animate-none" />
      <div className="mono text-7xl font-bold text-[var(--accent)] md:text-9xl">#{scramble}</div>
      <div className="tag mt-3">{cue}</div>
    </div>
  );
}

function PresentedFace({
  phase,
  listen,
  keepAction,
  skipAction,
  replaceAction,
  isKeepPending,
  isSkipPending,
  isReplacePending,
  onHeard,
  onReset,
}: {
  phase: Phase;
  listen: ListenSummary;
  keepAction: (payload: FormData) => void;
  skipAction: (payload: FormData) => void;
  replaceAction: (payload: FormData) => void;
  isKeepPending: boolean;
  isSkipPending: boolean;
  isReplacePending: boolean;
  onHeard: () => void;
  onReset: () => void;
}) {
  return (
    <div className="w-full max-w-[720px] animate-rise-in">
      <div className="grid items-center gap-6 md:grid-cols-[240px_1fr] md:gap-8">
        <div className="mx-auto w-[min(60vw,240px)] shrink-0 [perspective:900px]">
          <AlbumCover
            rank={listen.album.rank}
            src={listen.album.coverUrl}
            title={listen.album.title}
            sizes="240px"
            loading="eager"
            fetchPriority="high"
            className="cover-lift animate-[flipIn_.7s_cubic-bezier(.2,.7,.2,1)_both]"
          />
        </div>
        <div className="min-w-0 text-center md:text-left">
          <div className="tag text-[var(--accent)]">you drew / #{listen.album.rank}</div>
          <h2 className="title-wrap mt-2 text-4xl md:text-5xl">{listen.album.title}</h2>
          <div className="mt-2 font-quote text-xl text-[var(--ink-soft)]">
            {listen.album.artist} / {listen.album.year}
          </div>
        </div>
      </div>

      <hr className="hairline my-7" />

      {phase === "presented" && (
        <div className="text-center">
          <h3 className="mb-5 text-2xl">Have you already heard this one?</h3>
          <div className="flex flex-wrap justify-center gap-3">
            <form action={keepAction}>
              <input type="hidden" name="listenId" value={listen.id} />
              <Button type="submit" variant="accent" size="lg" disabled={isKeepPending}>
                {isKeepPending ? "KEEPING..." : "No, keep it as my pick"}
              </Button>
            </form>
            <Button type="button" variant="ghost" size="lg" onClick={onHeard}>
              Yes, rate it and redraw
            </Button>
            <form action={replaceAction}>
              <input type="hidden" name="listenId" value={listen.id} />
              <Button type="submit" variant="ghost" size="lg" disabled={isReplacePending}>
                {isReplacePending ? "REPLACING..." : "Can't find it - replace"}
              </Button>
            </form>
          </div>
          <p className="tag mt-4">honor system / skips are public</p>
        </div>
      )}

      {phase === "rate-skip" && (
        <RatingForm
          action={skipAction}
          listenId={listen.id}
          pending={isSkipPending}
          buttonLabel="Log skip and draw again"
          hint="You have heard it. Log a quick score, then the crate unlocks."
        />
      )}

      {phase === "kept" && (
        <div className="animate-rise-in text-center">
          <h3 className="text-2xl">It is yours.</h3>
          <p className="mx-auto mt-3 max-w-sm font-quote text-lg text-[var(--ink-soft)]">
            Go listen. Rating it when you are done unlocks your next draw.
          </p>
          <Button type="button" variant="solid" className="mt-6" onClick={onReset}>
            Back to my pick
          </Button>
        </div>
      )}
    </div>
  );
}

function GroupDrawPanel({
  groupDrawState,
  action,
  pending,
}: {
  groupDrawState: UserGroupDrawState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  return (
    <section id="group-draws" className="surface-panel mt-7 scroll-mt-6 overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-strong)] px-5 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-[var(--accent)]" aria-hidden="true" />
          <span className="tag">group draw</span>
        </div>
        <span className="mono text-[11px] text-[var(--ink-faint)]">
          {groupDrawState.groups.length} active {groupDrawState.groups.length === 1 ? "group" : "groups"}
        </span>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-2">
        {groupDrawState.groups.map((group) => (
          <GroupDrawCard key={group.id} group={group} action={action} pending={pending} />
        ))}
      </div>
    </section>
  );
}

function GroupDrawCard({
  group,
  action,
  pending,
}: {
  group: UserGroupDraw;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const blocked = group.blockedMembers.length > 0;
  const emptyPool = group.poolLeft === 0;
  const disabled = pending || blocked || emptyPool;

  return (
    <article className="pressed-panel rounded-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="title-wrap text-2xl">{group.name}</h2>
          <p className="tag mt-1">
            {group.members.length} {group.members.length === 1 ? "member" : "members"} /{" "}
            {group.poolLeft} shared left
          </p>
        </div>
        <div className="flex -space-x-2">
          {group.members.map((member) => (
            <ClubAvatar
              key={member.id}
              imageUrl={member.avatarUrl}
              initials={member.initials}
              label={member.displayName}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 min-h-14 rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-3 py-2">
        {group.currentDraw ? (
          <div>
            <p className="tag text-[var(--accent)]">active group pick</p>
            <p className="title-wrap mt-1 font-display text-lg font-extrabold">
              {group.currentDraw.album.title}
            </p>
            <p className="font-quote text-base text-[var(--ink-soft)]">
              {group.currentDraw.album.artist} / #{group.currentDraw.album.rank}
            </p>
          </div>
        ) : blocked ? (
          <div>
            <p className="tag text-[var(--accent)]">reviews due from</p>
            <p className="mt-1 font-display text-lg font-extrabold">
              {group.blockedMembers.map((member) => member.displayName).join(", ")}
            </p>
          </div>
        ) : emptyPool ? (
          <p className="tag">no shared albums left</p>
        ) : (
          <p className="tag">ready to spin together</p>
        )}
      </div>

      <form action={action} className="mt-4">
        <input type="hidden" name="groupId" value={group.id} />
        <Button type="submit" variant="accent" className="w-full" disabled={disabled}>
          <Users className="size-4" aria-hidden="true" />
          {pending ? "SPINNING..." : `Spin for ${group.name}`}
        </Button>
      </form>
    </article>
  );
}

function RatingForm({
  action,
  listenId,
  pending,
  buttonLabel,
  hint,
  errorMessage,
}: {
  action: (payload: FormData) => void;
  listenId: string;
  pending: boolean;
  buttonLabel: string;
  hint?: string;
  errorMessage?: string | null;
}) {
  const [rating, setRating] = useState("");
  const [take, setTake] = useState("");
  const inputId = useMemo(() => `take-${listenId}`, [listenId]);
  const isRatingMissing = !rating.trim();
  const isTakeOverLimit = countTakeCharacters(take) > TAKE_MAX_LENGTH;
  const disabledReason = isRatingMissing
    ? "Add a rating to save."
    : isTakeOverLimit
      ? `Shorten the review to ${TAKE_MAX_LENGTH.toLocaleString()} characters or less.`
      : null;

  return (
    <form action={action} className="grid place-items-center gap-4 text-center">
      <input type="hidden" name="listenId" value={listenId} />
      {hint && <p className="tag">{hint}</p>}
      <RatingInput value={rating} onChange={setRating} />
      <label className="sr-only" htmlFor={inputId}>
        Review
      </label>
      <ReviewTextarea
        id={inputId}
        name="take"
        value={take}
        onChange={setTake}
        maxLength={TAKE_MAX_LENGTH}
        placeholder="review (optional)"
        rows={5}
        containerClassName="max-w-xl"
        className="text-left"
      />
      {errorMessage && <p className="text-sm text-[var(--accent)]">{errorMessage}</p>}
      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={isRatingMissing || pending || isTakeOverLimit}
      >
        {pending ? "SAVING..." : buttonLabel}
      </Button>
      {disabledReason && !pending && (
        <p className="text-sm text-[var(--ink-soft)]">{disabledReason}</p>
      )}
    </form>
  );
}

function RecordIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      <div className="record-ring absolute inset-0 rounded-full border-2 border-[var(--ink)]" />
      <div className="mono absolute inset-[40%] grid place-items-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[var(--accent-ink)]">
        500
      </div>
    </div>
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
    <div className="min-w-20 text-right">
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
