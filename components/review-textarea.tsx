"use client";

import { Bold, Italic } from "lucide-react";
import { useRef, type TextareaHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
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

export function ReviewTextarea({
  className,
  containerClassName,
  maxLength,
  onChange,
  value,
  ...props
}: ReviewTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(marker: "*" | "**") {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const nextValue = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;

    if (typeof maxLength === "number" && nextValue.length > maxLength) {
      return;
    }

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
      <div className="flex items-center gap-1 border-b border-[var(--line)] bg-[var(--paper-2)] px-2 py-1.5">
        <Button
          type="button"
          variant="quiet"
          size="icon"
          className="size-8"
          aria-label="Bold"
          title="Bold"
          onClick={() => wrapSelection("**")}
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
          onClick={() => wrapSelection("*")}
        >
          <Italic className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        className={cn(
          "block min-h-32 w-full resize-y bg-transparent px-3.5 py-3 leading-6 outline-none",
          className,
        )}
        {...props}
      />
    </div>
  );
}
