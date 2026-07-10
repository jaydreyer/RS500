import { BrandMark } from "@/components/brand-mark";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { getSafeReturnPath } from "@/lib/auth-return";
import { cn } from "@/lib/utils";
import { Archivo_Black } from "next/font/google";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const heroFont = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
});

type AuthPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const user = await getCurrentUser();
  const params = searchParams ? await searchParams : {};
  const nextPath = getSafeReturnPath(getParam(params.next));

  if (user) {
    redirect("/pick");
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[var(--paper)] md:grid-cols-2">
      <section className="relative flex min-h-[560px] flex-col justify-between overflow-hidden bg-[var(--paper-2)] p-7 sm:p-10 md:p-14">
        <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(0deg,var(--ink)_0_1px,transparent_1px_6px)]" />
        <BrandMark href="/auth" className="relative z-10" />
        <div className="relative z-10">
          <div
            className={cn(
              heroFont.className,
              "text-6xl font-normal leading-[0.92] sm:text-7xl lg:text-8xl",
            )}
          >
            500
            <br />
            <span className="text-[var(--accent)]">albums.</span>
            <br />
            one
            <br />
            at a time.
          </div>
          <p className="mt-6 max-w-sm font-quote text-xl text-[var(--ink-soft)]">
            A private listening club built on Rolling Stone&apos;s 500 Greatest
            Albums. Draw at random. No re-rolls. Argue about scores.
          </p>
        </div>
        <div className="relative z-10 flex gap-4 text-xs text-[var(--ink-soft)] mono">
          <span>INVITE ONLY</span>
          <span>/</span>
          <span>500 SEEDED</span>
        </div>
        <div className="absolute -bottom-24 -right-24 size-72 rounded-full border-2 border-white/15 bg-[radial-gradient(circle_at_50%_50%,var(--accent)_0_12%,transparent_12.5%),repeating-radial-gradient(circle_at_50%_50%,#ffffff22_0_1px,transparent_1px_5px)] animate-spin-record" />
      </section>

      <section className="grid place-items-center px-5 py-12 md:px-12">
        <AuthForm
          initialMode={getAuthMode(params.mode)}
          message={getAuthMessage(params)}
          nextPath={nextPath}
        />
      </section>
    </main>
  );
}

function getAuthMode(value: string | string[] | undefined) {
  const mode = Array.isArray(value) ? value[0] : value;

  return mode === "login" ? "login" : "signup";
}

function getAuthMessage(params: Record<string, string | string[] | undefined>) {
  if (getParam(params.reason) === "session-expired") {
    return "Your session expired. Your review draft is safe on this device—log in to continue.";
  }

  return getGoogleAuthMessage(params.google);
}

function getGoogleAuthMessage(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;

  switch (code) {
    case "missing-config":
      return "Google sign-in is not configured yet.";
    case "invite":
      return "Enter the invite code and display name before using Google.";
    case "denied":
      return "Google sign-in was cancelled.";
    case "unverified":
      return "Google did not confirm that email address.";
    case "invite-required":
      return "That Google account is not a member yet. Join with the invite code first.";
    case "account-mismatch":
      return "That email is already linked to a different Google account.";
    case "deactivated":
      return "That account is no longer active.";
    case "failed":
      return "Google sign-in did not work. Try again.";
    default:
      return null;
  }
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
