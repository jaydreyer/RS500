"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatMemberRatingList,
  type CopyableMemberRating,
} from "@/lib/member-rating-list";

type CopyState = "idle" | "copied" | "failed";

export function CopyMemberRatingListButton({
  memberName,
  ratings,
}: {
  memberName: string;
  ratings: CopyableMemberRating[];
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const ratedCount = ratings.filter((entry) => entry.rating != null).length;

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => setCopyState("idle"), 2_500);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  async function copyRatings() {
    try {
      await navigator.clipboard.writeText(formatMemberRatingList(memberName, ratings));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  const label =
    copyState === "copied"
      ? `Copied ${ratedCount} ratings`
      : copyState === "failed"
        ? "Copy failed"
        : "Copy list";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={ratedCount === 0}
      onClick={copyRatings}
      aria-live="polite"
      className="h-8 px-2.5"
    >
      {copyState === "copied" ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
