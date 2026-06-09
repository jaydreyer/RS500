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
    <div className="min-h-screen bg-[var(--paper)] pb-24 md:pb-0">
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
    <header className="sticky top-0 z-40 border-b border-[var(--ink)] bg-[var(--paper)]">
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
                  "rounded-md px-5 py-2.5 font-display text-[15px] font-extrabold transition-colors",
                  active
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="mono hidden text-[11px] text-[var(--ink-faint)] sm:block">
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ink)] bg-[var(--paper)] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-5">
        {clubNavItems.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center transition-colors",
                active ? "text-[var(--accent)]" : "text-[var(--ink-soft)]",
              )}
            >
              <Icon className="size-5" strokeWidth={2.2} />
              <span className="mono text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
