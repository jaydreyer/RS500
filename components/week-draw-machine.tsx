"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Disc3 } from "lucide-react";
import { useRouter } from "next/navigation";

import { initialWeekActionState } from "@/app/(club)/week/action-state";
import {
  drawAction,
  freshRatingAction,
  keepFreshPickAction,
  skipRatingAction,
} from "@/app/(club)/week/actions";
import { AlbumCover } from "@/components/album-cover";
import { Eyebrow, RatingInput } from "@/components/primitives";
import { ReviewTextarea } from "@/components/review-textarea";
import { Button } from "@/components/ui/button";
import { RATING_SCALE } from "@/lib/config";
import { TAKE_MAX_LENGTH } from "@/lib/draw-rules";
import type { ListenSummary, WeekState } from "@/lib/draw";
import { cn } from "@/lib/utils";
import { formatIsoWeekLabel } from "@/lib/week";

type Phase = "idle" | "spinning" | "presented" | "rate-skip" | "kept";

const DRAW_LOCK_DELAY_MS = 1450;
const DRAW_REVEAL_DELAY_MS = 1950;

export function WeekDrawMachine({ weekState }: { weekState: WeekState }) {
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
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeFresh = weekState.activeFresh;
  const poolText = `${weekState.poolLeft} of ${weekState.totalAlbums} unlogged`;

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
          <Eyebrow>THIS IS YOUR DRAW / {formatIsoWeekLabel(weekState.weekKey)}</Eyebrow>
          <h1 className="mt-3 text-5xl md:text-7xl">My Week</h1>
        </div>
        <div className="pressed-panel flex flex-wrap gap-4 rounded-lg px-4 py-3">
          <Stat label="picks kept" value={weekState.freshCount} />
          <Stat label="skips logged" value={weekState.skipCount} />
          <Stat label="pool left" value={weekState.poolLeft} accent />
        </div>
      </div>

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
          {(phase === "presented" || phase === "rate-skip" || phase === "kept") && drawnListen && (
            <PresentedFace
              phase={phase}
              listen={drawnListen}
              keepAction={keepFormAction}
              skipAction={skipFormAction}
              isKeepPending={isKeepPending}
              isSkipPending={isSkipPending}
              onHeard={() => setPhase("rate-skip")}
              onReset={resetMachine}
            />
          )}
        </div>
      </div>

      {activeFresh && phase === "idle" && <NowListening listen={activeFresh} />}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow)]">
          {toast}
        </div>
      )}
    </section>
  );
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
          {isPending ? "DRAWING..." : "DRAW THIS WEEK"}
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
  isKeepPending,
  isSkipPending,
  onHeard,
  onReset,
}: {
  phase: Phase;
  listen: ListenSummary;
  keepAction: (payload: FormData) => void;
  skipAction: (payload: FormData) => void;
  isKeepPending: boolean;
  isSkipPending: boolean;
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
          <h3 className="text-2xl">It is yours for the week.</h3>
          <p className="mx-auto mt-3 max-w-sm font-quote text-lg text-[var(--ink-soft)]">
            Go listen. Rating it when you are done unlocks your next draw.
          </p>
          <Button type="button" variant="solid" className="mt-6" onClick={onReset}>
            Back to my week
          </Button>
        </div>
      )}
    </div>
  );
}

function NowListening({ listen }: { listen: ListenSummary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rateState, rateFormAction, isRatePending] = useActionState(
    freshRatingAction,
    initialWeekActionState,
  );
  const router = useRouter();

  useEffect(() => {
    if (rateState.status === "success") {
      const timer = window.setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [rateState.status, router]);

  return (
    <div className="surface-panel mt-7 overflow-hidden rounded-lg">
      <div className="flex items-center gap-2 border-b border-[var(--line-strong)] px-5 py-3">
        <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse-dot" />
        <span className="tag">currently listening</span>
      </div>
      <div className="flex flex-wrap items-center gap-4 p-5">
        <AlbumCover
          rank={listen.album.rank}
          src={listen.album.coverUrl}
          title={listen.album.title}
          className="cover-lift w-24"
        />
        <div className="min-w-[180px] flex-1">
          <h3 className="title-wrap text-2xl">{listen.album.title}</h3>
          <div className="mt-1 font-quote text-lg text-[var(--ink-soft)]">
            {listen.album.artist} / {listen.album.year}
          </div>
        </div>
        {!isOpen && (
          <Button type="button" variant="accent" onClick={() => setIsOpen(true)}>
            I have finished - rate it
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="px-5 pb-5">
          <hr className="hairline mb-5" />
          <RatingForm
            action={rateFormAction}
            listenId={listen.id}
            pending={isRatePending}
            buttonLabel="Lock in my rating"
            errorMessage={rateState.status === "error" ? rateState.message : null}
          />
        </div>
      )}
    </div>
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
      <Button type="submit" variant="accent" size="lg" disabled={!rating.trim() || pending}>
        {pending ? "SAVING..." : buttonLabel}
      </Button>
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
