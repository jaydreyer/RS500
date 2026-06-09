import Link from "next/link";
import { redirect } from "next/navigation";

import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, ScoreBadge } from "@/components/primitives";
import { RouteShell } from "@/components/route-shell";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { formatRating, RATING_SCALE, STATS_SAMPLE_THRESHOLD } from "@/lib/config";
import {
  formatAverage,
  getHistoryState,
  getMemberLabel,
  type AlbumRatingSummary,
  type HistoryListen,
  type HistoryMember,
  type HistoryState,
  type MemberSummary,
} from "@/lib/history";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  let historyState: HistoryState;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    historyState = await getHistoryState(pb, user);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  const maxSkips = Math.max(
    1,
    ...historyState.stats.memberSummaries.map((summary) => summary.skipListens.length),
  );

  return (
    <RouteShell eyebrow="EMERGENT CREW LORE" title="Stats">
      <div className="grid gap-4 lg:grid-cols-3">
        <MemberSuperlative
          title="Harshest rater"
          summary={historyState.stats.harshestRater}
          currentUserId={historyState.currentUser.id}
          value={formatAverage(historyState.stats.harshestRater?.averageFreshRating ?? null)}
          helper="lowest fresh average"
        />
        <MemberSuperlative
          title="Most generous"
          summary={historyState.stats.mostGenerousRater}
          currentUserId={historyState.currentUser.id}
          value={formatAverage(historyState.stats.mostGenerousRater?.averageFreshRating ?? null)}
          helper="highest fresh average"
          accent
        />
        <MemberSuperlative
          title="Deepest crate"
          summary={historyState.stats.mostAlbumsLogged}
          currentUserId={historyState.currentUser.id}
          value={historyState.stats.mostAlbumsLogged?.listens.length ?? "-"}
          helper="albums logged"
        />
      </div>

      <section className="surface-panel mt-4 rounded-lg p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl">Skip counts</h2>
          <p className="tag">public / already-heard logs</p>
        </div>
        <div className="grid gap-3">
          {historyState.stats.memberSummaries
            .toSorted((a, b) => b.skipListens.length - a.skipListens.length)
            .map((summary) => (
              <SkipMeter
                key={summary.member.id}
                summary={summary}
                currentUserId={historyState.currentUser.id}
                maxSkips={maxSkips}
              />
            ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AlbumLeaderboard
          title="Highest-rated albums"
          albums={historyState.stats.highestRatedAlbums}
          tone="high"
        />
        <AlbumLeaderboard
          title="Lowest-rated albums"
          albums={historyState.stats.lowestRatedAlbums}
          tone="low"
        />
      </div>

      <section className="surface-panel mt-4 rounded-lg p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl">Shared albums</h2>
          <p className="tag">two or more members / score comparison</p>
        </div>
        {historyState.stats.sharedAlbums.length === 0 ? (
          <p className="tag">No albums have been rated by multiple members yet</p>
        ) : (
          <div className="grid gap-4">
            {historyState.stats.sharedAlbums.map((summary) => (
              <SharedAlbumRow
                key={summary.album.id}
                summary={summary}
                members={historyState.members}
                currentUserId={historyState.currentUser.id}
              />
            ))}
          </div>
        )}
      </section>
    </RouteShell>
  );
}

function MemberSuperlative({
  title,
  summary,
  currentUserId,
  value,
  helper,
  accent = false,
}: {
  title: string;
  summary: MemberSummary | null;
  currentUserId: string;
  value: React.ReactNode;
  helper: string;
  accent?: boolean;
}) {
  return (
    <article
      className={cn(
        "min-h-40 rounded-lg border p-5 shadow-[var(--shadow)]",
        accent ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--card)]",
      )}
    >
      <p className={cn("tag", accent && "text-[var(--accent-ink)]")}>{title}</p>
      {summary ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <ClubAvatar initials={summary.member.initials} />
            <Link
              href={`/history?member=${summary.member.id}`}
              className="font-display text-2xl font-extrabold"
            >
              {getMemberLabel(summary.member, currentUserId)}
            </Link>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold leading-none">{value}</span>
            <span className={cn("tag", accent && "text-[var(--accent-ink)]")}>{helper}</span>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <div className="font-display text-5xl font-extrabold text-[var(--ink-faint)]">-</div>
          <p className={cn("tag mt-3", accent && "text-[var(--accent-ink)]")}>
            Need {STATS_SAMPLE_THRESHOLD} rated fresh listens
          </p>
        </div>
      )}
    </article>
  );
}

function SkipMeter({
  summary,
  currentUserId,
  maxSkips,
}: {
  summary: MemberSummary;
  currentUserId: string;
  maxSkips: number;
}) {
  const skips = summary.skipListens.length;
  const width = `${Math.round((skips / maxSkips) * 100)}%`;

  return (
    <div className="grid grid-cols-[minmax(110px,150px)_1fr_32px] items-center gap-3">
      <Link
        href={`/history?member=${summary.member.id}`}
        className="flex min-w-0 items-center gap-2 text-[var(--ink)]"
      >
        <ClubAvatar initials={summary.member.initials} size="sm" />
        <span className="truncate font-display font-extrabold">
          {getMemberLabel(summary.member, currentUserId)}
        </span>
      </Link>
      <div className="h-5 overflow-hidden rounded-sm border border-[var(--line-strong)] bg-[var(--paper-2)]">
        <div className="h-full bg-[var(--accent)]" style={{ width }} />
      </div>
      <span className="mono text-right text-sm font-bold">{skips}</span>
    </div>
  );
}

function AlbumLeaderboard({
  title,
  albums,
  tone,
}: {
  title: string;
  albums: AlbumRatingSummary[];
  tone: "high" | "low";
}) {
  return (
    <section className="surface-panel rounded-lg p-5">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-4 grid gap-3">
        {albums.length === 0 && <p className="tag">No rated albums yet</p>}
        {albums.map((summary) => (
          <Link
            key={summary.album.id}
            href={`/albums/${summary.album.id}`}
            className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-md border border-[var(--line-strong)] p-3 transition-colors hover:bg-[var(--paper-2)]"
          >
            <AlbumCover
              rank={summary.album.rank}
              src={summary.album.coverUrl}
              title={summary.album.title}
              className="cover-lift rounded-sm"
            />
            <div className="min-w-0">
              <p className={cn("tag", tone === "high" && "text-[var(--good)]")}>
                {summary.ratingCount} rating{summary.ratingCount === 1 ? "" : "s"}
              </p>
              <h3 className="mt-1 truncate text-xl">{summary.album.title}</h3>
              <p className="truncate font-quote text-base text-[var(--ink-soft)]">
                {summary.album.artist}
              </p>
            </div>
            <ScoreBadge score={Number(summary.averageRating.toFixed(1))} label="" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SharedAlbumRow({
  summary,
  members,
  currentUserId,
}: {
  summary: AlbumRatingSummary;
  members: HistoryMember[];
  currentUserId: string;
}) {
  return (
    <div className="grid gap-3 border-b border-[var(--line)] pb-4 last:border-b-0 last:pb-0 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center">
      <Link href={`/albums/${summary.album.id}`} className="w-[72px]">
        <AlbumCover
          rank={summary.album.rank}
          src={summary.album.coverUrl}
          title={summary.album.title}
          className="cover-lift rounded-sm"
        />
      </Link>
      <div className="min-w-0">
        <Link href={`/albums/${summary.album.id}`}>
          <h3 className="truncate text-xl">{summary.album.title}</h3>
        </Link>
        <p className="truncate font-quote text-base text-[var(--ink-soft)]">
          {summary.album.artist}
        </p>
        <p className="tag mt-1">
          avg {summary.averageRating.toFixed(1)} / spread{" "}
          {formatRating(Number(summary.spread.toFixed(RATING_SCALE.precision)))}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {summary.listens.map((listen) => (
          <ScoreChip
            key={listen.id}
            listen={listen}
            member={members.find((entry) => entry.id === listen.userId)}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreChip({
  listen,
  member,
  currentUserId,
}: {
  listen: HistoryListen;
  member?: HistoryMember;
  currentUserId: string;
}) {
  const label = member ? getMemberLabel(member, currentUserId) : "Crew";

  return (
    <Link
      href={member ? `/history?member=${member.id}` : `/albums/${listen.album.id}`}
      className="flex items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-2 py-1"
    >
      <ClubAvatar initials={member?.initials ?? "??"} size="sm" />
      <span className="max-w-[96px] truncate text-sm font-bold">{label}</span>
      <span className="font-display text-xl font-extrabold">
        {listen.rating == null ? "-" : formatRating(listen.rating)}
      </span>
      <span className="mono text-[10px] text-[var(--ink-faint)]">/{RATING_SCALE.max}</span>
    </Link>
  );
}
