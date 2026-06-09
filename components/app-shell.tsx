"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";
import { ClubAvatar } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { CURRENT_WEEK_LABEL } from "@/lib/config";
import { clubNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { ClubUser } from "@/lib/auth";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ClubUser;
}) {
  return (
    <div className="page-surface min-h-screen bg-[var(--paper)] pb-24 md:pb-0">
      <TopNav user={user} />
      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 md:px-10 md:py-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

function TopNav({ user }: { user: ClubUser }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper)_86%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-[61px] max-w-7xl items-center gap-4 px-4 sm:px-6 md:px-10">
        <BrandMark />
        <nav className="ml-5 hidden items-center gap-1 md:flex">
          {clubNavItems.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative rounded-md px-4 py-2.5 font-display text-[15px] font-extrabold transition-colors",
                  active
                    ? "bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] text-[var(--ink)]"
                    : "text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] hover:text-[var(--ink)]",
                )}
              >
                {label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[11px] h-0.5 bg-[var(--accent)]" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="mono hidden rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-[11px] text-[var(--ink-soft)] sm:block">
            {CURRENT_WEEK_LABEL}
          </span>
          <span className="hidden max-w-36 truncate font-display text-sm font-extrabold text-[var(--ink-soft)] lg:block">
            {user.displayName}
          </span>
          <ClubAvatar initials={user.initials} ring />
          <form action={logoutAction}>
            <Button
              aria-label="Log out"
              className="size-9 px-0"
              size="icon"
              title="Log out"
              type="submit"
              variant="quiet"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
        {clubNavItems.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center transition-colors",
                active ? "text-[var(--ink)]" : "text-[var(--ink-soft)]",
              )}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 bg-[var(--accent)]" />}
              <Icon className="size-5" strokeWidth={2.2} />
              <span className="mono text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
