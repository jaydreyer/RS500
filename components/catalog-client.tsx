"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AlbumCover } from "@/components/album-cover";
import { ScoreBadge } from "@/components/primitives";
import { RATING_SCALE } from "@/lib/config";
import type { CatalogAlbum, CatalogListen, CatalogState } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "logged" | "unlogged" | "heard";
type SortKey = "rank" | "title" | "artist" | "year" | "mine";
type SortDirection = "asc" | "desc";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "logged", label: "Logged" },
  { key: "unlogged", label: "Unlogged" },
  { key: "heard", label: "Heard" },
];

export function CatalogClient({ initialState }: { initialState: CatalogState }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const myListenByAlbum = useMemo(() => {
    return new Map(initialState.myListens.map((listen) => [listen.albumId, listen]));
  }, [initialState.myListens]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = initialState.albums
      .filter((album) => {
        const listen = myListenByAlbum.get(album.id);

        if (needle && !`${album.title} ${album.artist}`.toLowerCase().includes(needle)) {
          return false;
        }

        if (filter === "logged") {
          return Boolean(listen);
        }

        if (filter === "unlogged") {
          return !listen;
        }

        if (filter === "heard") {
          return listen?.kind === "skip";
        }

        return true;
      })
      .sort((albumA, albumB) => {
        const valueA = getSortValue(albumA, myListenByAlbum.get(albumA.id), sort);
        const valueB = getSortValue(albumB, myListenByAlbum.get(albumB.id), sort);
        const comparison =
          typeof valueA === "string" && typeof valueB === "string"
            ? valueA.localeCompare(valueB)
            : Number(valueA) - Number(valueB);

        return direction === "asc" ? comparison : -comparison;
      });

    return sorted;
  }, [direction, filter, initialState.albums, myListenByAlbum, query, sort]);

  const loggedCount = myListenByAlbum.size;

  function toggleSort(nextSort: SortKey) {
    if (sort === nextSort) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSort(nextSort);
    setDirection(nextSort === "mine" ? "desc" : "asc");
  }

  return (
    <section className="mx-auto w-full max-w-[980px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="tag flex items-center gap-3">
            <span className="h-0.5 w-4 bg-[var(--accent)]" />
            <span>the whole list / rolling stone 500</span>
          </div>
          <h1 className="mt-3 text-5xl md:text-6xl">The 500</h1>
        </div>
        <div className="flex gap-5">
          <Stat label="showing" value={rows.length} />
          <Stat label="you've logged" value={loggedCount} accent />
        </div>
      </div>

      <p className="mb-6 max-w-xl font-quote text-lg text-[var(--ink-soft)]">
        Browse the full catalog. You cannot draw from here - that is the whole point - but
        you can see what is still out there.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search by title or artist</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-faint)]"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-control pl-10"
            placeholder="Search title or artist"
          />
        </label>

        <div className="grid grid-cols-4 rounded-md border border-[var(--line-strong)] p-1">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={cn(
                "mono rounded-sm px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors",
                filter === option.key
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--ink)] bg-[var(--card)] shadow-[var(--shadow)]">
        <div className="catalog-row border-b border-[var(--line-strong)] px-4 py-3 tag">
          <SortHeader label="#" sortKey="rank" activeSort={sort} direction={direction} onSort={toggleSort} />
          <span />
          <SortHeader
            label="Album"
            sortKey="title"
            activeSort={sort}
            direction={direction}
            onSort={toggleSort}
          />
          <SortHeader
            label="Artist"
            sortKey="artist"
            activeSort={sort}
            direction={direction}
            onSort={toggleSort}
            className="catalog-artist"
          />
          <SortHeader
            label="Year"
            sortKey="year"
            activeSort={sort}
            direction={direction}
            onSort={toggleSort}
            className="catalog-year"
          />
          <SortHeader
            label="You"
            sortKey="mine"
            activeSort={sort}
            direction={direction}
            onSort={toggleSort}
            className="justify-end"
          />
        </div>

        {rows.map((album) => (
          <CatalogRow
            key={album.id}
            album={album}
            listen={myListenByAlbum.get(album.id)}
          />
        ))}

        {rows.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="tag">No albums match this view</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CatalogRow({
  album,
  listen,
}: {
  album: CatalogAlbum;
  listen?: CatalogListen;
}) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="catalog-row group border-b border-[var(--line)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--paper-2)]"
    >
      <span className="mono text-sm font-bold text-[var(--ink-faint)]">#{album.rank}</span>
      <AlbumCover
        rank={album.rank}
        src={album.coverUrl}
        title={album.title}
        className="size-10 rounded-sm"
      />
      <span className="min-w-0 text-left">
        <span className="block truncate font-display text-lg font-extrabold text-[var(--ink)]">
          {album.title}
        </span>
        <span className="catalog-artist-inline hidden truncate font-quote text-sm text-[var(--ink-soft)]">
          {album.artist}
        </span>
      </span>
      <span className="catalog-artist truncate text-left font-quote text-base text-[var(--ink-soft)]">
        {album.artist}
      </span>
      <span className="catalog-year mono text-sm text-[var(--ink-faint)]">{album.year}</span>
      <span className="justify-self-end text-right">
        <ListenStatus listen={listen} />
      </span>
    </Link>
  );
}

function ListenStatus({ listen }: { listen?: CatalogListen }) {
  if (!listen) {
    return <span className="tag">-</span>;
  }

  if (listen.status === "listening") {
    return (
      <span className="tag inline-flex items-center gap-1.5 text-[var(--accent)]">
        <span className="size-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot" />
        listening
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {listen.kind === "skip" && <span className="tag">heard</span>}
      <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} />
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  activeSort,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeSort === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1.5 bg-transparent p-0 text-left text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]",
        isActive && "text-[var(--accent)]",
        className,
      )}
    >
      {label}
      <Icon className="size-3" aria-hidden="true" />
    </button>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="text-right">
      <div
        className={cn(
          "font-display text-3xl font-extrabold leading-none",
          accent && "text-[var(--accent)]",
        )}
      >
        {value}
      </div>
      <div className="tag mt-1">{label}</div>
    </div>
  );
}

function getSortValue(album: CatalogAlbum, listen: CatalogListen | undefined, sort: SortKey) {
  if (sort === "rank") {
    return album.rank;
  }

  if (sort === "year") {
    return album.year;
  }

  if (sort === "title") {
    return normalizeSortText(album.title);
  }

  if (sort === "artist") {
    return normalizeSortText(album.artist);
  }

  return listen?.rating ?? -1;
}

function normalizeSortText(value: string) {
  return value.toLowerCase().replace(/^the\s+/, "");
}
