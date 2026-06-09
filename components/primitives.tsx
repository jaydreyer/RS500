"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRating, RATING_SCALE } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("tag flex items-center gap-3", className)}>
      <span className="h-0.5 w-4 bg-[var(--accent)]" />
      <span>{children}</span>
    </div>
  );
}

export function ClubAvatar({
  initials,
  ring = false,
  size = "md",
}: {
  initials: string;
  ring?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "mono grid shrink-0 place-items-center rounded-full border border-white/15 bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent-2)_70%,var(--accent)))] font-bold text-[var(--accent-ink)] shadow-[0_10px_18px_-14px_#000]",
        ring && "ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--paper)]",
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-8 text-[11px]",
        size === "lg" && "size-12 text-sm",
      )}
      aria-label={initials}
    >
      {initials}
    </span>
  );
}

export function ScoreBadge({
  score,
  label = `/${RATING_SCALE.max}`,
}: {
  score?: number | null;
  label?: string;
}) {
  if (score == null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-2.5 py-1 text-xs text-[var(--ink-soft)]">
        <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse-dot" />
        listening
      </span>
    );
  }

  return (
    <span className="inline-flex items-baseline rounded-md bg-[var(--ink)] px-2.5 py-1 font-display font-extrabold text-[var(--paper)] shadow-[0_10px_18px_-14px_#000]">
      <span className="text-lg leading-none">{formatRating(score)}</span>
      <span className="mono ml-0.5 text-[10px] opacity-70">{label}</span>
    </span>
  );
}

export function RatingInput({
  value,
  onChange,
  min = RATING_SCALE.min,
  max = RATING_SCALE.max,
  step = RATING_SCALE.step,
}: {
  value?: string;
  onChange?: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="grid w-full max-w-md gap-3">
      <label className="grid gap-1.5 text-left">
        <span className="tag">rating</span>
        <input
          className="mono input-control text-center text-3xl font-bold"
          inputMode="decimal"
          max={max}
          min={min}
          name="rating"
          onChange={(event) => {
            onChange?.(event.target.value);
          }}
          placeholder={`${max.toFixed(1)}`}
          step={step}
          type="number"
          value={value ?? ""}
        />
      </label>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: max - min + 1 }, (_, index) => index + min).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange?.(String(rating))}
            className={cn(
              "mono aspect-square rounded-md border border-[var(--line-strong)] bg-[var(--paper)] text-sm font-bold text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]",
              value === String(rating) &&
                "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]",
            )}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReactionRow() {
  const reactions = ["🔥", "💯", "❤️"];

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="size-8 px-0" aria-label="React">
        <Plus className="size-3.5" />
      </Button>
      {reactions.map((reaction) => (
        <span
          key={reaction}
          className="mono rounded-full border border-[var(--line-strong)] px-2 py-1 text-[10px] text-[var(--ink-soft)]"
        >
          {reaction}
        </span>
      ))}
    </div>
  );
}
