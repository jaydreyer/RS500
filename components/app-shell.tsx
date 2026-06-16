"use client";

import { LogOut, Megaphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { logoutAction } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";
import { ClubAvatar } from "@/components/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { CURRENT_WEEK_LABEL } from "@/lib/config";
import { clubNavItems } from "@/lib/navigation";
import { hasReleaseNotes, latestReleaseNoteId, releaseNoteCount } from "@/lib/release-notes";
import { cn } from "@/lib/utils";
import type { ClubUser } from "@/lib/auth";
import type { ClubNavItem } from "@/lib/navigation";

const RELEASE_NOTES_SEEN_STORAGE_KEY = "spin500:release-notes-seen";
const RELEASE_NOTES_SEEN_EVENT = "spin500:release-notes-seen-change";

export function AppShell({
  children,
  user,
  feedUnreadCount,
}: {
  children: React.ReactNode;
  user: ClubUser;
  feedUnreadCount: number;
}) {
  const pathname = usePathname();
  const [remoteFeedUnreadCount, setRemoteFeedUnreadCount] = useState(feedUnreadCount);
  const seenReleaseNoteId = useSyncExternalStore(
    subscribeToReleaseNoteSeenChanges,
    getSeenReleaseNoteIdSnapshot,
    getSeenReleaseNoteIdServerSnapshot,
  );
  const hasUnreadReleaseNotes =
    hasReleaseNotes && Boolean(latestReleaseNoteId) && seenReleaseNoteId !== latestReleaseNoteId;
  const visibleFeedUnreadCount = isFeedPath(pathname) ? 0 : remoteFeedUnreadCount;
  const visibleNavItems = user.isAdmin
    ? clubNavItems
    : clubNavItems.filter((item) => item.href !== "/groups");

  useEffect(() => {
    if (isFeedPath(pathname)) {
      return;
    }

    let cancelled = false;

    async function refreshUnreadCount() {
      try {
        const response = await fetch("/api/feed/unread", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { unreadCount?: unknown };
        if (!cancelled && typeof data.unreadCount === "number") {
          setRemoteFeedUnreadCount(data.unreadCount);
        }
      } catch {
        return;
      }
    }

    refreshUnreadCount();
    const interval = window.setInterval(refreshUnreadCount, 60_000);
    window.addEventListener("focus", refreshUnreadCount);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshUnreadCount);
    };
  }, [pathname]);

  useEffect(() => {
    if (hasReleaseNotes && latestReleaseNoteId && isUpdatesPath(pathname)) {
      markLatestReleaseNotesSeen();
    }
  }, [pathname]);

  return (
    <div className="page-surface min-h-screen bg-[var(--paper)] pb-24 md:pb-0">
      <TopNav
        user={user}
        feedUnreadCount={visibleFeedUnreadCount}
        hasUnreadReleaseNotes={hasUnreadReleaseNotes}
        navItems={visibleNavItems}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 md:px-10 md:py-10">
        {children}
      </main>
      <BottomNav feedUnreadCount={visibleFeedUnreadCount} navItems={visibleNavItems} />
    </div>
  );
}

function TopNav({
  user,
  feedUnreadCount,
  hasUnreadReleaseNotes,
  navItems,
}: {
  user: ClubUser;
  feedUnreadCount: number;
  hasUnreadReleaseNotes: boolean;
  navItems: readonly ClubNavItem[];
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper)_86%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-[61px] max-w-7xl items-center gap-4 px-4 sm:px-6 md:px-10">
        <BrandMark />
        <nav className="ml-5 hidden items-center gap-1 md:flex">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const showUnread = href === "/feed" && !active && feedUnreadCount > 0;

            return (
              <Link
                key={href}
                href={href}
                aria-label={showUnread ? `${label}, ${feedUnreadCount} unread` : label}
                className={cn(
                  "relative rounded-md px-4 py-2.5 font-display text-[15px] font-extrabold transition-colors",
                  active
                    ? "bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] text-[var(--ink)]"
                    : "text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] hover:text-[var(--ink)]",
                )}
              >
                {label}
                {showUnread && <UnreadBadge count={feedUnreadCount} className="-right-1 top-1" />}
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
          <Link
            aria-label={
              hasReleaseNotes
                ? `What's New, ${releaseNoteCount} ${releaseNoteCount === 1 ? "update" : "updates"}`
                : "What's New"
            }
            className={cn(
              buttonVariants({ variant: "quiet", size: "icon" }),
              "relative size-9 px-0",
              pathname === "/updates" && "bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] text-[var(--ink)]",
            )}
            href="/updates"
            title="What's New"
          >
            <Megaphone className="size-4" aria-hidden="true" />
            {hasUnreadReleaseNotes && pathname !== "/updates" && <UpdateIndicator />}
          </Link>
          <Link
            aria-label="Profile settings"
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-md px-1.5 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]",
              pathname === "/settings" && "bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]",
            )}
            href="/settings"
            title="Profile settings"
          >
            <span className="hidden max-w-36 truncate font-display text-sm font-extrabold text-[var(--ink-soft)] lg:block">
              {user.displayName}
            </span>
            <ClubAvatar
              imageUrl={user.avatarUrl}
              initials={user.initials}
              label={user.displayName}
              ring
            />
          </Link>
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

function UpdateIndicator() {
  return (
    <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-[var(--paper)] bg-[var(--accent)]" />
  );
}

function BottomNav({
  feedUnreadCount,
  navItems,
}: {
  feedUnreadCount: number;
  navItems: readonly ClubNavItem[];
}) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div
        className="grid overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(72px, 1fr))` }}
      >
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const showUnread = href === "/feed" && !active && feedUnreadCount > 0;

          return (
            <Link
              key={href}
              href={href}
              aria-label={showUnread ? `${label}, ${feedUnreadCount} unread` : label}
              className={cn(
                "relative flex min-h-16 flex-col items-center justify-center gap-1 px-0.5 text-center transition-colors",
                active ? "text-[var(--ink)]" : "text-[var(--ink-soft)]",
              )}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 bg-[var(--accent)]" />}
              {showUnread && <UnreadBadge count={feedUnreadCount} className="right-4 top-2" />}
              <Icon className="size-4" strokeWidth={2.2} />
              <span className="mono text-[9px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function UnreadBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "absolute grid min-w-5 place-items-center rounded-full border-2 border-[var(--paper)] bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-black leading-none text-[var(--paper)] shadow-sm",
        className,
      )}
      title={`${count} unread feed ${count === 1 ? "notification" : "notifications"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function isFeedPath(pathname: string) {
  return pathname === "/feed" || pathname.startsWith("/feed/");
}

function isUpdatesPath(pathname: string) {
  return pathname === "/updates" || pathname.startsWith("/updates/");
}

function subscribeToReleaseNoteSeenChanges(onChange: () => void) {
  window.addEventListener(RELEASE_NOTES_SEEN_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(RELEASE_NOTES_SEEN_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSeenReleaseNoteIdSnapshot() {
  try {
    return window.localStorage.getItem(RELEASE_NOTES_SEEN_STORAGE_KEY) ?? "";
  } catch {
    return latestReleaseNoteId;
  }
}

function getSeenReleaseNoteIdServerSnapshot() {
  return latestReleaseNoteId;
}

function markLatestReleaseNotesSeen() {
  try {
    window.localStorage.setItem(RELEASE_NOTES_SEEN_STORAGE_KEY, latestReleaseNoteId);
    window.dispatchEvent(new Event(RELEASE_NOTES_SEEN_EVENT));
  } catch {
    return;
  }
}
