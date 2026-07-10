"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getReviewDraftKey,
  parseReviewDraft,
  serializeReviewDraft,
} from "@/lib/review-draft";

export function useReviewDraft({
  id,
  initialRating,
  initialTake,
}: {
  id: string;
  initialRating: string;
  initialTake: string;
}) {
  const storageKey = getReviewDraftKey(id);
  const [rating, setRating] = useState(initialRating);
  const [take, setTake] = useState(initialTake);
  const [restored, setRestored] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = parseReviewDraft(window.localStorage.getItem(storageKey));
      if (draft) {
        setRating(draft.rating);
        setTake(draft.take);
        setRestored(draft.rating !== initialRating || draft.take !== initialTake);
      } else {
        window.localStorage.removeItem(storageKey);
      }
      hydratedRef.current = true;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialRating, initialTake, storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    if (rating === initialRating && take === initialTake) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, serializeReviewDraft(rating, take));
  }, [initialRating, initialTake, rating, storageKey, take]);

  const clearDraft = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setRestored(false);
  }, [storageKey]);

  return {
    rating,
    setRating,
    take,
    setTake,
    restored,
    clearDraft,
  };
}
