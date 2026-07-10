"use client";

import { RefreshCw, Save, SquarePen, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  knownAlbumRatingAction,
  replaceUnavailableAlbumAction,
} from "@/app/(club)/albums/[albumId]/actions";
import { ScoreBadge } from "@/components/primitives";
import { ReviewMarkdown } from "@/components/review-markdown";
import { ReviewTextarea } from "@/components/review-textarea";
import { Button } from "@/components/ui/button";
import { RATING_SCALE } from "@/lib/config";
import { countTakeCharacters, TAKE_MAX_LENGTH } from "@/lib/draw-rules";
import { getLoginUrl } from "@/lib/auth-return";
import type { AlbumDetailListen } from "@/lib/catalog";
import { useReviewDraft } from "@/lib/use-review-draft";

type RatingPanelListen = Pick<
  AlbumDetailListen,
  "id" | "kind" | "status" | "rating" | "take" | "ratedAt"
>;

type AlbumRatingActionState = {
  status: "idle" | "success" | "error" | "unauthorized";
  message: string | null;
};

type AlbumReplacementActionState = {
  status: "idle" | "success" | "error" | "unauthorized";
  message: string | null;
  replacementAlbumId: string | null;
};

const initialAlbumRatingActionState: AlbumRatingActionState = {
  status: "idle",
  message: null,
};

const initialAlbumReplacementActionState: AlbumReplacementActionState = {
  status: "idle",
  message: null,
  replacementAlbumId: null,
};

export function AlbumRatingPanel({
  albumId,
  initialListen,
  replacementBehavior = "album",
}: {
  albumId: string;
  initialListen: RatingPanelListen | null;
  replacementBehavior?: "album" | "refresh";
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    knownAlbumRatingAction,
    initialAlbumRatingActionState,
  );
  const [replacementState, replacementFormAction, isReplacementPending] = useActionState(
    replaceUnavailableAlbumAction,
    initialAlbumReplacementActionState,
  );
  const [isEditing, setIsEditing] = useState(initialListen?.rating == null);
  const initialRating = initialListen?.rating == null ? "" : String(initialListen.rating);
  const initialTake = initialListen?.take ?? "";
  const { rating, setRating, take, setTake, restored, clearDraft } = useReviewDraft({
    id: initialListen ? `listen:${initialListen.id}` : `album:${albumId}`,
    initialRating,
    initialTake,
  });
  const takeId = useMemo(() => `known-album-take-${albumId}`, [albumId]);
  const hasRating = initialListen?.rating != null;
  const canReplace =
    initialListen?.kind === "fresh" && initialListen.status === "listening";
  const actionLabel = hasRating ? "Update rating" : "Save rating";
  const isRatingMissing = !rating.trim();
  const isTakeOverLimit = countTakeCharacters(take) > TAKE_MAX_LENGTH;
  const disabledReason = isRatingMissing
    ? "Add a rating to save."
    : isTakeOverLimit
      ? `Shorten the review to ${TAKE_MAX_LENGTH.toLocaleString()} characters or less.`
      : null;

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    clearDraft();
    const timer = window.setTimeout(() => {
      setIsEditing(false);
      router.refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [clearDraft, router, state.status]);

  useEffect(() => {
    if (state.status !== "unauthorized" && replacementState.status !== "unauthorized") {
      return;
    }

    window.location.assign(getLoginUrl(`${window.location.pathname}${window.location.search}`));
  }, [replacementState.status, state.status]);

  useEffect(() => {
    if (replacementState.status !== "success" || !replacementState.replacementAlbumId) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (replacementBehavior === "album") {
        router.push(`/albums/${replacementState.replacementAlbumId}`);
      }
      router.refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    replacementBehavior,
    replacementState.replacementAlbumId,
    replacementState.status,
    router,
  ]);

  return (
    <div className="surface-panel mt-6 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="tag">your rating</div>
          {hasRating && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <>
                <ScoreBadge score={initialListen.rating} label={`/${RATING_SCALE.max}`} />
                <span className="tag">
                  {initialListen.kind === "skip" ? "already heard" : "fresh pick"}
                </span>
              </>
            </div>
          )}
        </div>

        {!isEditing && (
          <Button type="button" variant="ghost" onClick={() => setIsEditing(true)}>
            <SquarePen className="size-4" />
            Edit
          </Button>
        )}
      </div>

      {initialListen?.take && !isEditing && (
        <ReviewMarkdown className="mt-3 font-quote text-lg leading-relaxed text-[var(--ink-soft)]">
          {initialListen.take}
        </ReviewMarkdown>
      )}

      {isEditing && (
        <form action={formAction} className="mt-4 grid gap-4">
          <input type="hidden" name="albumId" value={albumId} />
          <label className="grid gap-1.5 text-left">
            <span className="tag">rating</span>
            <input
              className="mono input-control text-center text-3xl font-bold"
              inputMode="decimal"
              name="rating"
              onChange={(event) => setRating(event.target.value)}
              pattern="(?:\d+(?:\.\d)?|\.\d)"
              placeholder={`${RATING_SCALE.max.toFixed(1)}`}
              type="text"
              value={rating}
            />
          </label>
          <label className="sr-only" htmlFor={takeId}>
            Review
          </label>
          <ReviewTextarea
            id={takeId}
            name="take"
            value={take}
            onChange={setTake}
            maxLength={TAKE_MAX_LENGTH}
            placeholder="review (optional)"
            rows={5}
          />
          <p className="text-sm text-[var(--ink-soft)]">
            {restored
              ? "Recovered your unsaved draft. It stays on this device until the review is saved."
              : "Your rating and review are saved on this device as you type."}
          </p>
          {state.message && (
            <p
              className={
                state.status === "error"
                  ? "text-sm text-[var(--accent)]"
                  : "text-sm text-[var(--good)]"
              }
            >
              {state.message}
            </p>
          )}
          {replacementState.message && (
            <p
              className={
                replacementState.status === "error"
                  ? "text-sm text-[var(--accent)]"
                  : "text-sm text-[var(--good)]"
              }
            >
              {replacementState.message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              variant="accent"
              disabled={isRatingMissing || isPending || isTakeOverLimit}
            >
              <Save className="size-4" />
              {isPending ? "Saving..." : actionLabel}
            </Button>
            {canReplace && (
              <Button
                form="replace-unavailable-album"
                type="submit"
                variant="ghost"
                disabled={isReplacementPending}
              >
                <RefreshCw className="size-4" />
                {isReplacementPending ? "Replacing..." : "Can't find it - replace"}
              </Button>
            )}
            {hasRating && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setRating(initialRating);
                  setTake(initialTake);
                  clearDraft();
                  setIsEditing(false);
                }}
              >
                <X className="size-4" />
                Cancel
              </Button>
            )}
          </div>
          {disabledReason && !isPending && (
            <p className="text-sm text-[var(--ink-soft)]">{disabledReason}</p>
          )}
        </form>
      )}
      {canReplace && (
        <form id="replace-unavailable-album" action={replacementFormAction}>
          <input type="hidden" name="albumId" value={albumId} />
          <input type="hidden" name="listenId" value={initialListen.id} />
        </form>
      )}
    </div>
  );
}
