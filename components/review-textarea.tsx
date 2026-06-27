"use client";

import { Bold, Italic } from "lucide-react";
import { useRef, type TextareaHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { countTakeCharacters } from "@/lib/draw-rules";
import { cn } from "@/lib/utils";

type ReviewTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "onChange" | "value"
> & {
  className?: string;
  containerClassName?: string;
  onChange: (value: string) => void;
  value: string;
};

export type ReviewMarkdownMarker = "*" | "**";

export function ReviewMarkdownToolbar({
  className,
  onWrap,
}: {
  className?: string;
  onWrap: (marker: ReviewMarkdownMarker) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-[var(--line)] bg-[var(--paper-2)] px-2 py-1.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="quiet"
        size="icon"
        className="size-8"
        aria-label="Bold"
        title="Bold"
        onClick={() => onWrap("**")}
      >
        <Bold className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="quiet"
        size="icon"
        className="size-8"
        aria-label="Italic"
        title="Italic"
        onClick={() => onWrap("*")}
      >
        <Italic className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export function ReviewTextarea({
  className,
  containerClassName,
  maxLength,
  onChange,
  value,
  ...props
}: ReviewTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const characterCount = countTakeCharacters(value);
  const remainingCharacters =
    typeof maxLength === "number" ? Math.max(0, maxLength - characterCount) : null;
  const characterOverage =
    typeof maxLength === "number" ? Math.max(0, characterCount - maxLength) : null;
  const characterLimitLabel =
    typeof maxLength === "number" ? maxLength.toLocaleString() : null;
  const characterCountLabel = characterCount.toLocaleString();

  function wrapSelection(marker: "*" | "**") {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const nextValue = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;

    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextStart = start + marker.length;
      const nextEnd = end + marker.length;
      textarea.setSelectionRange(nextStart, selected ? nextEnd : nextStart);
    });
  }

  return (
    <div
      className={cn(
        "input-control overflow-hidden p-0 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
        containerClassName,
      )}
    >
      <ReviewMarkdownToolbar onWrap={wrapSelection} />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "block min-h-32 w-full resize-y bg-transparent px-3.5 py-3 leading-6 outline-none",
          className,
        )}
        {...props}
      />
      {remainingCharacters !== null && (
        <div className="flex justify-end border-t border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5">
          <span
            className={cn(
              "mono text-[10px] font-bold uppercase text-[var(--ink-faint)]",
              ((remainingCharacters !== null && remainingCharacters <= 100) ||
                (characterOverage !== null && characterOverage > 0)) &&
                "text-[var(--accent)]",
            )}
            aria-live="polite"
          >
            {characterOverage && characterOverage > 0
              ? `${characterOverage.toLocaleString()} over`
              : `${remainingCharacters.toLocaleString()} left`}
            {characterLimitLabel ? ` - ${characterCountLabel} / ${characterLimitLabel}` : null}
          </span>
        </div>
      )}
    </div>
  );
}
