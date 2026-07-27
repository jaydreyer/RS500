"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AlbumCover } from "@/components/album-cover";
import {
  Our500AlbumDetails,
  Our500RatingChips,
} from "@/components/our-500-album-details";
import type { StatsMember } from "@/lib/history-rules";
import { cn } from "@/lib/utils";

export type Our500Entry = {
  album: {
    id: string;
    rank: number;
    title: string;
    artist: string;
    year: number;
    coverUrl: string;
  };
  crewRank: number | null;
  averageRating: number | null;
  reviewerCount: number;
  spread: number;
  ratings: {
    id: string;
    userId: string;
    rating: number;
  }[];
};

type RankingView = "ranked" | "provisional" | "unheard";
type RankingSort = "crew" | "original" | "reviews" | "spread" | "score";

const PAGE_SIZE = 25;

export function Our500Ranking({
  entries,
  members,
  currentUserId,
}: {
  entries: Our500Entry[];
  members: StatsMember[];
  currentUserId: string;
}) {
  const [view, setView] = useState<RankingView>("ranked");
  const [sort, setSort] = useState<RankingSort>("crew");
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const rankedCount = entries.filter((entry) => entry.crewRank != null).length;
  const provisionalCount = entries.filter(
    (entry) => entry.crewRank == null && entry.reviewerCount === 1,
  ).length;
  const unreviewedCount = entries.length - rankedCount - provisionalCount;

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return entries
      .filter((entry) => {
        if (view === "ranked") {
          return entry.crewRank != null;
        }

        if (view === "provisional") {
          return entry.crewRank == null && entry.reviewerCount === 1;
        }

        return entry.reviewerCount === 0;
      })
      .filter((entry) => {
        if (!normalizedQuery) {
          return true;
        }

        return `${entry.album.title} ${entry.album.artist}`
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .toSorted(getEntryComparator(sort));
  }, [entries, query, sort, view]);
  const displayedEntries = visibleEntries.slice(0, visibleLimit);
  const remainingCount = Math.max(0, visibleEntries.length - displayedEntries.length);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <CountCard value={rankedCount} label="officially ranked" accent />
        <CountCard value={provisionalCount} label="one review so far" />
        <CountCard value={unreviewedCount} label="still unheard" />
      </div>

      <section className="surface-panel mt-4 rounded-lg">
        <div className="sticky top-[60px] z-20 rounded-t-lg border-b border-[var(--line)] bg-[var(--card)] p-4 md:flex md:items-center md:justify-between md:gap-4">
          <div className="flex flex-wrap gap-2">
            <ViewButton
              active={view === "ranked"}
              count={rankedCount}
              label="Ranked"
              onClick={() => {
                setView("ranked");
                setSort("crew");
                setVisibleLimit(PAGE_SIZE);
              }}
            />
            <ViewButton
              active={view === "provisional"}
              count={provisionalCount}
              label="One review"
              onClick={() => {
                setView("provisional");
                setSort("score");
                setVisibleLimit(PAGE_SIZE);
              }}
            />
            <ViewButton
              active={view === "unheard"}
              count={unreviewedCount}
              label="Unheard"
              onClick={() => {
                setView("unheard");
                setSort("original");
                setVisibleLimit(PAGE_SIZE);
              }}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row md:mt-0">
            <label className="relative">
              <span className="sr-only">Search albums or artists</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-faint)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleLimit(PAGE_SIZE);
                }}
                placeholder="Search albums or artists"
                className="h-10 w-full rounded-md border border-[var(--line-strong)] bg-[var(--paper)] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[var(--ink-soft)] focus:border-[var(--accent)] sm:w-64"
              />
            </label>
            <label>
              <span className="sr-only">Sort albums</span>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as RankingSort);
                  setVisibleLimit(PAGE_SIZE);
                }}
                className="h-10 w-full rounded-md border border-[var(--line-strong)] bg-[var(--paper)] px-3 text-sm font-bold outline-none focus:border-[var(--accent)] sm:w-auto"
              >
                {view === "ranked" && <option value="crew">Crew rank</option>}
                <option value="original">Original RS rank</option>
                {view === "ranked" && <option value="reviews">Most reviewed</option>}
                {view === "ranked" && <option value="spread">Most divisive</option>}
                {view === "provisional" && <option value="score">Highest score</option>}
              </select>
            </label>
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-display text-2xl font-extrabold">Nothing here yet</p>
            <p className="tag mt-2">
              {query
                ? "Try a different album or artist"
                  : view === "ranked"
                  ? "Albums appear after two members review them"
                  : view === "provisional"
                    ? "No albums are waiting for a second review"
                    : "Every album has been heard at least once"}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--line)]">
              {displayedEntries.map((entry) => (
                <RankingRow
                  key={entry.album.id}
                  entry={entry}
                  members={members}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-3 border-t border-[var(--line)] bg-[var(--paper-2)] p-4">
              <p className="tag">
                Showing {displayedEntries.length} of {visibleEntries.length}
              </p>
              {remainingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setVisibleLimit((current) => current + PAGE_SIZE)}
                  className="rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-4 py-2 font-display text-sm font-extrabold transition-colors hover:border-[var(--ink)]"
                >
                  Load {Math.min(PAGE_SIZE, remainingCount)} more
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function CountCard({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <article
      className={cn(
        "min-w-0 rounded-lg border bg-[var(--card)] p-3 shadow-[var(--shadow)] sm:p-4",
        accent && "border-[var(--accent)]",
      )}
    >
      <span
        className={cn(
          "block font-display text-3xl font-extrabold sm:text-4xl",
          accent && "text-[var(--accent)]",
        )}
      >
        {value}
      </span>
      <span className="tag mt-1 block leading-tight">{label}</span>
    </article>
  );
}

function ViewButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-3 py-2 font-display text-sm font-extrabold transition-colors",
        active
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
          : "border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
      )}
    >
      {label} <span className="mono ml-1 text-xs opacity-70">{count}</span>
    </button>
  );
}

function RankingRow({
  entry,
  members,
  currentUserId,
}: {
  entry: Our500Entry;
  members: StatsMember[];
  currentUserId: string;
}) {
  return (
    <article className="grid grid-cols-[40px_64px_minmax(0,1fr)] items-center gap-3 p-4 md:grid-cols-[52px_72px_minmax(240px,1fr)_minmax(0,1.35fr)] md:px-5">
      <div className="text-center">
        <span
          className={cn(
            "font-display text-3xl font-extrabold",
            entry.crewRank == null
              ? "text-[var(--ink-faint)]"
              : "text-[var(--accent)]",
          )}
        >
          {entry.crewRank ?? "—"}
        </span>
        <p className="mono mt-0.5 text-[9px] uppercase text-[var(--ink-faint)]">
          crew
        </p>
      </div>

      <Link href={`/albums/${entry.album.id}`}>
        <AlbumCover
          rank={entry.album.rank}
          src={entry.album.coverUrl}
          title={entry.album.title}
          sizes="(min-width: 768px) 72px, 64px"
          className="cover-lift rounded-sm"
        />
      </Link>

      <div className="min-w-0">
        <Our500AlbumDetails
          album={entry.album}
          averageRating={entry.averageRating}
          ratingCount={entry.reviewerCount}
          prominentScore
        />
      </div>

      <div className="col-start-3 flex flex-wrap gap-2 md:col-start-auto md:justify-end">
        <Our500RatingChips
          albumId={entry.album.id}
          ratings={entry.ratings}
          members={members}
          currentUserId={currentUserId}
        />
      </div>
    </article>
  );
}

function getEntryComparator(sort: RankingSort) {
  return (a: Our500Entry, b: Our500Entry) => {
    if (sort === "original") {
      return a.album.rank - b.album.rank;
    }

    if (sort === "reviews") {
      return (
        b.reviewerCount - a.reviewerCount ||
        (b.averageRating ?? -1) - (a.averageRating ?? -1) ||
        a.album.rank - b.album.rank
      );
    }

    if (sort === "spread") {
      return (
        b.spread - a.spread ||
        b.reviewerCount - a.reviewerCount ||
        a.album.rank - b.album.rank
      );
    }

    if (sort === "score") {
      return (
        (b.averageRating ?? -1) - (a.averageRating ?? -1) ||
        a.album.rank - b.album.rank
      );
    }

    return (
      (a.crewRank ?? Number.POSITIVE_INFINITY) -
        (b.crewRank ?? Number.POSITIVE_INFINITY) ||
      a.album.rank - b.album.rank
    );
  };
}
