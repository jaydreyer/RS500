"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  type AuthFormState,
  loginAction,
  signupAction,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthMode = "signup" | "login";

const initialAuthFormState: AuthFormState = {
  message: null,
};

export function AuthForm({ message }: { message?: string | null }) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [signupState, signupFormAction] = useActionState(
    signupAction,
    initialAuthFormState,
  );
  const [loginState, loginFormAction] = useActionState(
    loginAction,
    initialAuthFormState,
  );
  const activeState = mode === "signup" ? signupState : loginState;
  const activeMessage = activeState.message ?? message;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 grid grid-cols-2 gap-1 rounded-md border border-[var(--ink)] p-1">
        <ModeButton active={mode === "signup"} onClick={() => setMode("signup")}>
          Join with code
        </ModeButton>
        <ModeButton active={mode === "login"} onClick={() => setMode("login")}>
          Log in
        </ModeButton>
      </div>

      <h1 className="text-4xl">{mode === "signup" ? "Got an invite?" : "Welcome back."}</h1>
      <p className="mt-3 font-quote text-lg text-[var(--ink-soft)]">
        {mode === "signup"
          ? "The crew shares one code. Enter it to claim a spot."
          : "Pick up where you left off."}
      </p>

      <form
        action={mode === "signup" ? signupFormAction : loginFormAction}
        className="mt-7 grid gap-4"
      >
        <input name="mode" type="hidden" value={mode} />

        {mode === "signup" ? (
          <>
            <Field label="Invite code">
              <input
                className="mono input-control uppercase tracking-[0.12em]"
                name="inviteCode"
                placeholder="CREW-CODE"
                required
              />
            </Field>
            <Field label="Display name">
              <input
                className="input-control"
                maxLength={80}
                name="displayName"
                placeholder="what the board calls you"
                required
              />
            </Field>
          </>
        ) : null}

        <GoogleButton mode={mode} />
        <Divider label={mode === "signup" ? "or create a password account" : "or log in with email"} />

        <Field label="Email">
          <input
            autoComplete="email"
            className="input-control"
            name="email"
            placeholder="you@crew.fm"
            required
            type="email"
          />
        </Field>
        <Field label="Password">
          <input
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="input-control"
            minLength={8}
            name="password"
            placeholder="password"
            required
            type="password"
          />
        </Field>

        {activeMessage ? (
          <p className="mono text-sm text-[var(--accent)]" role="alert">
            x {activeMessage}
          </p>
        ) : null}

        <SubmitButton mode={mode} />
      </form>

      <p className="tag mt-5 text-center">
        private by default / server-validated code
      </p>
    </div>
  );
}

function GoogleButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]"
      disabled={pending}
      formAction="/api/auth/google/start"
      formMethod="post"
      formNoValidate
      size="lg"
      type="submit"
      variant="ghost"
    >
      <span className="grid size-6 place-items-center rounded-full border border-[var(--ink)] font-display text-sm">
        G
      </span>
      {pending
        ? "Opening Google..."
        : mode === "signup"
          ? "Create account with Google"
          : "Continue with Google"}
    </Button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-[var(--line-strong)]" />
      <span className="tag text-[var(--ink-soft)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--line-strong)]" />
    </div>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "rounded-sm px-4 py-3 font-display font-extrabold transition-colors",
        active
          ? "bg-[var(--ink)] text-[var(--paper)]"
          : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="tag">{label}</span>
        {hint ? <span className="tag text-[var(--accent)]">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function SubmitButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-disabled={pending}
      className="mt-2 w-full"
      disabled={pending}
      size="lg"
      type="submit"
      variant="accent"
    >
      {pending
        ? "Checking..."
        : mode === "signup"
          ? "Claim my spot ->"
          : "Enter the club ->"}
    </Button>
  );
}
