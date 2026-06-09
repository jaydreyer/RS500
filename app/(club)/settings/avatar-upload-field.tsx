"use client";

import { useState } from "react";
import { ImageUp } from "lucide-react";

const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
const AVATAR_MAX_SIZE_LABEL = "5 MB";
const AVATAR_ERROR = `Avatar must be ${AVATAR_MAX_SIZE_LABEL} or smaller.`;

export function AvatarUploadField() {
  const [error, setError] = useState("");

  return (
    <label className="grid gap-1.5">
      <span className="tag">avatar</span>
      <span className="text-sm leading-6 text-[var(--ink-soft)]">
        JPG, PNG, WebP, or GIF. {AVATAR_MAX_SIZE_LABEL} max.
      </span>
      <span className="flex min-h-12 items-center gap-3 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-3 text-sm text-[var(--ink-soft)]">
        <ImageUp className="size-4 shrink-0 text-[var(--ink)]" />
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-describedby={error ? "avatar-upload-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--ink)] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-[var(--paper)]"
          name="avatar"
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            const nextError = file && file.size > AVATAR_MAX_SIZE ? AVATAR_ERROR : "";

            input.setCustomValidity(nextError);
            setError(nextError);
          }}
          type="file"
        />
      </span>
      {error && (
        <span id="avatar-upload-error" className="text-sm font-bold text-[var(--accent)]">
          {error}
        </span>
      )}
    </label>
  );
}
