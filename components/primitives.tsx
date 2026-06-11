"use client";

import { Plus } from "lucide-react";
import Image from "next/image";

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
  imageUrl,
  initials,
  label,
  ring = false,
  size = "md",
}: {
  imageUrl?: string | null;
  initials: string;
  label?: string;
  ring?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "mono relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent-2)_70%,var(--accent)))] font-bold text-[var(--accent-ink)] shadow-[0_10px_18px_-14px_#000]",
        ring && "ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--paper)]",
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-8 text-[11px]",
        size === "lg" && "size-12 text-sm",
      )}
      aria-label={label ?? initials}
    >
      {imageUrl ? (
        <Image
          alt=""
          className="absolute inset-0 size-full object-cover"
          fill
          sizes={size === "lg" ? "48px" : size === "md" ? "32px" : "28px"}
          src={imageUrl}
          unoptimized
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function ScoreBadge({
  score,
  label = `/${RATING_SCALE.max}`,
  emptyLabel = "listening",
}: {
  score?: number | null;
  label?: string;
  emptyLabel?: string;
}) {
  if (score == null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-2.5 py-1 text-xs text-[var(--ink-soft)]">
        <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse-dot" />
        {emptyLabel}
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
  const precision = String(step).split(".")[1]?.length ?? 0;
  const ratingPattern =
    precision > 0
      ? `(?:\\d+(?:\\.\\d{1,${precision}})?|\\.\\d{1,${precision}})`
      : "\\d+";

  return (
    <div className="grid w-full max-w-md gap-3">
      <label className="grid gap-1.5 text-left">
        <span className="tag">rating</span>
        <input
          className="mono input-control text-center text-3xl font-bold"
          autoComplete="off"
          inputMode="decimal"
          name="rating"
          onChange={(event) => {
            onChange?.(event.target.value);
          }}
          pattern={ratingPattern}
          placeholder={`${max.toFixed(1)}`}
          title={`Choose a rating from ${min} to ${max}.`}
          type="text"
          value={value ?? ""}
        />
      </label>
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
