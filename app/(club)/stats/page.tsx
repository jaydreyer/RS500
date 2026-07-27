import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { AlbumCover } from "@/components/album-cover";
import {
  Our500AlbumDetails,
  Our500RatingChips,
} from "@/components/our-500-album-details";
import { ClubAvatar } from "@/components/primitives";
import { RouteShell } from "@/components/route-shell";
import { buttonVariants } from "@/components/ui/button";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { STATS_SAMPLE_THRESHOLD } from "@/lib/config";
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

  const now = new Date();
  const activeMemberSummaries = historyState.memberSummaries.filter(
    (summary) => !summary.member.isDeactivated,
  );
  const currentUserSummary = historyState.memberSummaries.find(
    (summary) => summary.member.id === historyState.currentUser.id,
  );
  const uniqueCrewAlbums = new Set(
    historyState.memberSummaries.flatMap((summary) =>
      summary.loggedListens.map((listen) => listen.albumId),
    ),
  ).size;
  const activeFreshCount = activeMemberSummaries.reduce(
    (total, summary) => total + summary.activeFreshListens.length,
    0,
  );
  const ratedLast30 = countRecentRatings(historyState.listens, 30, now);

  return (
    <RouteShell eyebrow="CRATE TELEMETRY" title="Stats">
      <div className="stats-readable">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            title="Officially ranked"
            value={`${historyState.stats.crewRankedAlbums.length}/${historyState.totalAlbums}`}
            helper="two or more reviewers"
            accent
          />
          <MetricCard
            title="Crew coverage"
            value={`${uniqueCrewAlbums}/${historyState.totalAlbums}`}
            helper="heard at least once"
          />
          <MetricCard
            title="Your progress"
            value={`${currentUserSummary?.loggedListens.length ?? 0}/${historyState.totalAlbums}`}
            helper="albums you logged"
          />
          <MetricCard
            title="Active picks"
            value={activeFreshCount}
            helper="waiting for reviews"
          />
        </div>

        <Our500Preview historyState={historyState} />
        <ProgressSection historyState={historyState} />

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <RecentPaceSection
            historyState={historyState}
            now={now}
            ratedLast30={ratedLast30}
          />
          <ActivePicksSection historyState={historyState} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
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
            title="Most fresh listens"
            summary={historyState.stats.mostAssignedCompleted}
            currentUserId={historyState.currentUser.id}
            value={historyState.stats.mostAssignedCompleted?.completedFreshListens.length ?? "-"}
            helper="new albums completed"
          />
        </div>

        <GroupCompletionSection historyState={historyState} />
        <AlbumInsightsSection historyState={historyState} />
      </div>
    </RouteShell>
  );
}

function Our500Preview({ historyState }: { historyState: HistoryState }) {
  const rankedAlbums = historyState.stats.crewRankedAlbums.slice(0, 5);

  return (
    <section className="surface-panel mt-4 overflow-hidden rounded-lg">
      <div className="border-b border-[var(--line)] p-5 md:flex md:items-end md:justify-between md:gap-6">
        <div>
          <p className="tag text-[var(--accent)]">the collective list</p>
          <h2 className="mt-2 text-3xl md:text-4xl">Our 500</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
            The crew&apos;s evolving order, ranked by average score once at least two
            members have weighed in.
          </p>
        </div>
        <Link
          href="/stats/our-500"
          className={cn(buttonVariants({ variant: "solid" }), "mt-4 shrink-0 md:mt-0")}
        >
          View full ranking
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {rankedAlbums.length === 0 ? (
        <div className="p-5">
          <p className="tag">No albums have two crew ratings yet</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            The first collective ranking will appear as soon as an album gets its
            second review.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--line)] px-5">
          {rankedAlbums.map((summary, index) => (
            <CrewRankingRow
              key={summary.album.id}
              crewRank={index + 1}
              summary={summary}
              members={historyState.members}
              currentUserId={historyState.currentUser.id}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--line)] bg-[var(--paper-2)] px-5 py-3">
        <span className="tag">
          {historyState.stats.crewRankedAlbums.length} ranked
        </span>
        <span className="tag">
          {historyState.stats.provisionalAlbums.length} awaiting another review
        </span>
        <span className="tag">
          positions cover eligible reviewed albums
        </span>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  helper,
  accent = false,
}: {
  title: string;
  value: React.ReactNode;
  helper: string;
  accent?: boolean;
}) {
  return (
    <article
      className={cn(
        "min-w-0 rounded-lg border bg-[var(--card)] p-4 shadow-[var(--shadow)] md:p-5",
        accent && "border-[var(--accent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent)]",
      )}
    >
      <p className={cn("tag", accent && "text-[var(--accent)]")}>{title}</p>
      <div
        className={cn(
          "mt-3 truncate font-display text-3xl font-extrabold leading-none sm:text-4xl xl:text-5xl",
          accent && "text-[var(--accent)]",
        )}
      >
        {value}
      </div>
      <p className="tag mt-2">{helper}</p>
    </article>
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
        "min-h-40 rounded-lg border bg-[var(--card)] p-5 shadow-[var(--shadow)]",
        accent && "border-[var(--accent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent)]",
      )}
    >
      <p className={cn("tag", accent && "text-[var(--accent)]")}>{title}</p>
      {summary ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <ClubAvatar
              imageUrl={summary.member.avatarUrl}
              initials={summary.member.initials}
              label={summary.member.displayName}
            />
            <Link
              href={`/history?member=${summary.member.id}`}
              className="font-display text-2xl font-extrabold"
            >
              {getMemberLabel(summary.member, currentUserId)}
            </Link>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span
              className={cn(
                "font-display text-5xl font-extrabold leading-none",
                accent && "text-[var(--accent)]",
              )}
            >
              {value}
            </span>
            <span className="tag">{helper}</span>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <div className="font-display text-5xl font-extrabold text-[var(--ink-faint)]">-</div>
          <p className="tag mt-3">
            Need {STATS_SAMPLE_THRESHOLD} rated fresh listens
          </p>
        </div>
      )}
    </article>
  );
}

function ProgressSection({ historyState }: { historyState: HistoryState }) {
  const activeMemberSummaries = historyState.memberSummaries.filter(
    (summary) => !summary.member.isDeactivated,
  );

  return (
    <section className="surface-panel mt-4 rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="tag text-[var(--accent)]">active crew</p>
          <h2 className="mt-1 text-2xl">Crew progress</h2>
        </div>
        <p className="tag">logged / fresh / heard / active</p>
      </div>
      <div className="grid gap-3">
        {activeMemberSummaries
          .toSorted((a, b) => b.loggedListens.length - a.loggedListens.length)
          .map((summary) => (
            <ProgressRow
              key={summary.member.id}
              summary={summary}
              currentUserId={historyState.currentUser.id}
              totalAlbums={historyState.totalAlbums}
            />
          ))}
      </div>
    </section>
  );
}

function ProgressRow({
  summary,
  currentUserId,
  totalAlbums,
}: {
  summary: MemberSummary;
  currentUserId: string;
  totalAlbums: number;
}) {
  const logged = summary.loggedListens.length;
  const percent = totalAlbums > 0 ? Math.round((logged / totalAlbums) * 100) : 0;
  const width = `${percent}%`;
  const fresh = summary.completedFreshListens.length;
  const heard = summary.skipListens.length;

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(150px,190px)_1fr_auto] md:items-center">
      <Link
        href={`/history?member=${summary.member.id}`}
        className="flex min-w-0 items-center gap-2 text-[var(--ink)]"
      >
        <ClubAvatar
          imageUrl={summary.member.avatarUrl}
          initials={summary.member.initials}
          label={summary.member.displayName}
          size="sm"
        />
        <span className="truncate font-display font-extrabold">
          {getMemberLabel(summary.member, currentUserId)}
        </span>
      </Link>
      <div
        className="h-6 overflow-hidden rounded-sm border border-[var(--line-strong)] bg-[var(--paper-2)]"
        role="progressbar"
        aria-label={`${summary.member.displayName} album progress`}
        aria-valuemin={0}
        aria-valuemax={totalAlbums}
        aria-valuenow={logged}
      >
        <div className="h-full bg-[var(--accent)]" style={{ width }} />
      </div>
      <div className="flex flex-wrap gap-3 md:justify-end">
        <span className="mono text-sm font-bold">{logged} logged</span>
        <span className="tag">{fresh} fresh</span>
        <span className="tag">{heard} heard</span>
        <span className="tag">{summary.activeFreshListens.length} active</span>
        <span className="tag">{percent}%</span>
      </div>
    </div>
  );
}

function RecentPaceSection({
  historyState,
  now,
  ratedLast30,
}: {
  historyState: HistoryState;
  now: Date;
  ratedLast30: number;
}) {
  const pace = historyState.memberSummaries
    .filter((summary) => !summary.member.isDeactivated)
    .map((summary) => ({
      summary,
      last7: countRecentRatings(summary.listens, 7, now),
      last30: countRecentRatings(summary.listens, 30, now),
    }))
    .filter(({ last7, last30 }) => last7 > 0 || last30 > 0)
    .toSorted((a, b) => b.last30 - a.last30 || b.last7 - a.last7)
    .slice(0, 5);

  return (
    <section className="surface-panel rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="tag text-[var(--accent)]">{ratedLast30} reviews in 30 days</p>
          <h2 className="mt-1 text-2xl">Recent pace</h2>
        </div>
        <p className="tag">top five / rolling windows</p>
      </div>
      {pace.length === 0 ? (
        <div className="rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] p-4">
          <p className="font-display text-xl font-extrabold">A quiet month so far</p>
          <p className="tag mt-2">New reviews will appear here</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pace.map(({ summary, last7, last30 }) => (
          <div
            key={summary.member.id}
            className="grid gap-3 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] p-3 sm:grid-cols-[minmax(150px,1fr)_auto] sm:items-center"
          >
            <Link
              href={`/history?member=${summary.member.id}`}
              className="flex min-w-0 items-center gap-2 text-[var(--ink)]"
            >
              <ClubAvatar
                imageUrl={summary.member.avatarUrl}
                initials={summary.member.initials}
                label={summary.member.displayName}
                size="sm"
              />
              <span className="truncate font-display font-extrabold">
                {getMemberLabel(summary.member, historyState.currentUser.id)}
              </span>
            </Link>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <PaceBadge value={last7} label="7d" accent={last7 > 0} />
              <PaceBadge value={last30} label="30d" accent={last30 > 0} />
            </div>
          </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActivePicksSection({
  historyState,
}: {
  historyState: HistoryState;
}) {
  const activeMemberEntries = historyState.memberSummaries
    .filter((summary) => !summary.member.isDeactivated)
    .flatMap((summary) =>
      summary.activeFreshListens.map((listen) => ({ summary, listen })),
    );
  const visibleEntries = activeMemberEntries.slice(0, 5);

  return (
    <section className="surface-panel rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Active picks</h2>
        <p className="tag">{activeMemberEntries.length} waiting for reviews</p>
      </div>
      {activeMemberEntries.length === 0 ? (
        <p className="tag">No active picks are waiting on reviews</p>
      ) : (
        <div className="grid gap-3">
          {visibleEntries.map(({ summary, listen }) => (
            <Link
              key={listen.id}
              href={`/albums/${listen.album.id}`}
              className="grid grid-cols-[64px_1fr] gap-3 rounded-md border border-[var(--line-strong)] p-3 transition-colors hover:bg-[var(--paper-2)] sm:grid-cols-[72px_1fr_auto] sm:items-center"
            >
              <AlbumCover
                rank={listen.album.rank}
                src={listen.album.coverUrl}
                title={listen.album.title}
                sizes="72px"
                className="cover-lift rounded-sm"
              />
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <ClubAvatar
                    imageUrl={summary.member.avatarUrl}
                    initials={summary.member.initials}
                    label={summary.member.displayName}
                    size="sm"
                  />
                  <p className="tag">
                    {getMemberLabel(summary.member, historyState.currentUser.id)}
                  </p>
                </div>
                <h3 className="truncate text-xl">{listen.album.title}</h3>
                <p className="truncate font-quote text-base text-[var(--ink-soft)]">
                  {listen.album.artist}
                </p>
              </div>
              <span className="tag text-[var(--accent)] max-sm:col-start-2">review due</span>
            </Link>
          ))}
          {activeMemberEntries.length > visibleEntries.length && (
            <Link
              href="/board"
              className={cn(buttonVariants({ variant: "ghost" }), "justify-center")}
            >
              View all active picks
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function PaceBadge({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-20 items-baseline justify-center gap-1 rounded-sm border border-[var(--line-strong)] bg-[var(--card)] px-2.5 py-1.5",
        accent && "border-[color-mix(in_srgb,var(--good)_45%,var(--line-strong))]",
      )}
    >
      <span
        className={cn(
          "font-display text-2xl font-extrabold leading-none",
          accent && "text-[var(--good)]",
        )}
      >
        {value}
      </span>
      <span className="tag">{label}</span>
    </span>
  );
}

function GroupCompletionSection({ historyState }: { historyState: HistoryState }) {
  const completions = historyState.stats.fastestGroupCompletions;

  if (completions.length === 0) {
    return null;
  }

  return (
    <section className="surface-panel mt-4 rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Fastest group completions</h2>
        <p className="tag">draw to final review</p>
      </div>
      <div className="grid gap-3">
        {completions.map((summary) => (
          <Link
            key={summary.groupDrawId}
            href={`/albums/${summary.album.id}`}
            className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-md border border-[var(--line-strong)] p-3 transition-colors hover:bg-[var(--paper-2)]"
          >
            <AlbumCover
              rank={summary.album.rank}
              src={summary.album.coverUrl}
              title={summary.album.title}
              sizes="64px"
              className="cover-lift rounded-sm"
            />
            <div className="min-w-0">
              <p className="tag">{summary.listens.length} reviews</p>
              <h3 className="truncate text-xl">{summary.album.title}</h3>
              <p className="truncate font-quote text-base text-[var(--ink-soft)]">
                {summary.album.artist}
              </p>
            </div>
            <span className="mono text-sm font-bold">{formatDuration(summary.completionMs)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AlbumInsightsSection({ historyState }: { historyState: HistoryState }) {
  const favorites = historyState.stats.crewRankedAlbums.slice(0, 3);
  const misses = historyState.stats.crewRankedAlbums
    .toSorted(
      (a, b) =>
        a.averageRating - b.averageRating ||
        b.ratingCount - a.ratingCount ||
        a.album.rank - b.album.rank,
    )
    .slice(0, 3);
  const divisive = historyState.stats.sharedAlbums.slice(0, 3);

  return (
    <section className="mt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 px-1">
        <div>
          <p className="tag text-[var(--accent)]">collective taste</p>
          <h2 className="mt-1 text-3xl">Album insights</h2>
        </div>
        <Link href="/stats/our-500" className="tag text-[var(--accent)] hover:underline">
          Explore all rankings →
        </Link>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <AlbumInsightColumn
          title="Crew favorites"
          helper="highest crew averages"
          summaries={favorites}
          historyState={historyState}
        />
        <AlbumInsightColumn
          title="Crew misses"
          helper="lowest crew averages"
          summaries={misses}
          historyState={historyState}
        />
        <AlbumInsightColumn
          title="Most divisive"
          helper="widest score spreads"
          summaries={divisive}
          historyState={historyState}
          showSpread
        />
      </div>
    </section>
  );
}

function AlbumInsightColumn({
  title,
  helper,
  summaries,
  historyState,
  showSpread = false,
}: {
  title: string;
  helper: string;
  summaries: AlbumRatingSummary[];
  historyState: HistoryState;
  showSpread?: boolean;
}) {
  return (
    <section className="surface-panel rounded-lg p-5">
      <h3 className="text-2xl">{title}</h3>
      <p className="tag mt-1">{helper}</p>
      <div className="mt-4 grid gap-3">
        {summaries.length === 0 && (
          <p className="tag">Albums appear after two members review them</p>
        )}
        {summaries.map((summary) => (
          <article
            key={summary.album.id}
            className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-md border border-[var(--line-strong)] p-3"
          >
            <Link href={`/albums/${summary.album.id}`}>
              <AlbumCover
                rank={summary.album.rank}
                src={summary.album.coverUrl}
                title={summary.album.title}
                sizes="56px"
                className="cover-lift rounded-sm"
              />
            </Link>
            <div className="min-w-0">
              <Our500AlbumDetails
                album={summary.album}
                averageRating={summary.averageRating}
                ratingCount={summary.ratingCount}
                titleLevel="h4"
              />
              {showSpread && (
                <p className="tag mt-1 text-[var(--accent)]">
                  {summary.spread.toFixed(1)} point spread
                </p>
              )}
            </div>
            <div className="col-span-2 flex flex-wrap gap-2">
              <Our500RatingChips
                albumId={summary.album.id}
                ratings={summary.listens.flatMap((listen) =>
                  listen.rating == null
                    ? []
                    : [{
                        id: listen.id,
                        userId: listen.userId,
                        rating: listen.rating,
                      }],
                )}
                members={historyState.members}
                currentUserId={historyState.currentUser.id}
                maxVisible={3}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CrewRankingRow({
  crewRank,
  summary,
  members,
  currentUserId,
}: {
  crewRank: number;
  summary: AlbumRatingSummary;
  members: HistoryMember[];
  currentUserId: string;
}) {
  return (
    <div className="grid grid-cols-[38px_64px_minmax(0,1fr)] items-center gap-3 py-4 md:grid-cols-[46px_72px_minmax(240px,1fr)_minmax(0,1.2fr)]">
      <span className="font-display text-3xl font-extrabold text-[var(--accent)]">
        {crewRank}
      </span>
      <Link href={`/albums/${summary.album.id}`} className="w-16 md:w-[72px]">
        <AlbumCover
          rank={summary.album.rank}
          src={summary.album.coverUrl}
          title={summary.album.title}
          sizes="72px"
          className="cover-lift rounded-sm"
        />
      </Link>
      <div className="min-w-0">
        <Our500AlbumDetails
          album={summary.album}
          averageRating={summary.averageRating}
          ratingCount={summary.ratingCount}
          titleLevel="h3"
          prominentScore
        />
      </div>
      <div className="col-start-3 flex flex-wrap gap-2 md:col-start-auto md:justify-end">
        <Our500RatingChips
          albumId={summary.album.id}
          ratings={summary.listens.flatMap((listen) =>
            listen.rating == null
              ? []
              : [{
                  id: listen.id,
                  userId: listen.userId,
                  rating: listen.rating,
                }],
          )}
          members={members}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}

function countRecentRatings(listens: HistoryListen[], days: number, now: Date) {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;

  return listens.filter((listen) => {
    if (listen.status !== "rated" || !listen.ratedAt) {
      return false;
    }

    const ratedMs = Date.parse(listen.ratedAt);
    return Number.isFinite(ratedMs) && ratedMs >= cutoff;
  }).length;
}

function formatDuration(milliseconds: number) {
  const hours = Math.max(1, Math.round(milliseconds / (60 * 60 * 1000)));

  if (hours < 48) {
    return `${hours}h`;
  }

  const days = Math.round(hours / 24);
  return `${days}d`;
}
