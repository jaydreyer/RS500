import { BrandMark } from "@/components/brand-mark";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Archivo_Black } from "next/font/google";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const heroFont = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
});

export default async function AuthPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/week");
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
        <AuthForm />
      </section>
    </main>
  );
}
