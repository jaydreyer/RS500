"use client";

import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { useRef, type TextareaHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { countTakeCharacters } from "@/lib/draw-rules";
import {
  applyReviewMarkdownFormat,
  type ReviewMarkdownFormat,
} from "@/lib/review-markdown-formatting";
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

export function ReviewMarkdownToolbar({
  className,
  onFormat,
}: {
  className?: string;
  onFormat: (format: ReviewMarkdownFormat) => void;
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
        onClick={() => onFormat("**")}
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
        onClick={() => onFormat("*")}
      >
        <Italic className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="quiet"
        size="icon"
        className="size-8"
        aria-label="Bulleted list"
        title="Bulleted list"
        onClick={() => onFormat("bullet-list")}
      >
        <List className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="quiet"
        size="icon"
        className="size-8"
        aria-label="Numbered list"
        title="Numbered list"
        onClick={() => onFormat("numbered-list")}
      >
        <ListOrdered className="size-4" aria-hidden="true" />
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

  function applyFormat(format: ReviewMarkdownFormat) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const result = applyReviewMarkdownFormat(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      format,
    );

    onChange(result.value);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div
      className={cn(
        "input-control overflow-hidden p-0 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
        containerClassName,
      )}
    >
      <ReviewMarkdownToolbar onFormat={applyFormat} />
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
