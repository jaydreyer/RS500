import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { AchievementBadge } from "@/components/achievement-badge";
import { AlbumCover } from "@/components/album-cover";
import {
  Our500AlbumDetails,
  Our500RatingChips,
} from "@/components/our-500-album-details";
import { ClubAvatar, ScoreBadge } from "@/components/primitives";
import { RouteShell } from "@/components/route-shell";
import { buttonVariants } from "@/components/ui/button";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import {
  buildBadgeProgress,
  countTrackProgress,
  WRITTEN_REVIEW_MIN_LENGTH,
  type BadgeTrack,
} from "@/lib/badges";
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
  const currentUserSummary = historyState.memberSummaries.find(
    (summary) => summary.member.id === historyState.currentUser.id,
  );
  const uniqueCrewAlbums = new Set(
    historyState.memberSummaries.flatMap((summary) =>
      summary.loggedListens.map((listen) => listen.albumId),
    ),
  ).size;
  const activeFreshCount = historyState.memberSummaries.reduce(
    (total, summary) => total + summary.activeFreshListens.length,
    0,
  );
  const ratedLast30 = countRecentRatings(historyState.listens, 30, now);

  return (
    <RouteShell eyebrow="CRATE TELEMETRY" title="Stats">
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          title="Crew progress"
          value={`${uniqueCrewAlbums}/${historyState.totalAlbums}`}
          helper="unique albums logged"
        />
        <MetricCard
          title="Your progress"
          value={`${currentUserSummary?.loggedListens.length ?? 0}/${historyState.totalAlbums}`}
          helper="albums you logged"
          accent
        />
        <MetricCard
          title="Active picks"
          value={activeFreshCount}
          helper="waiting for reviews"
        />
        <MetricCard
          title="Last 30 days"
          value={ratedLast30}
          helper="reviews logged"
        />
      </div>

      <AchievementSection summary={currentUserSummary} />
      <Our500Preview historyState={historyState} />
      <ProgressSection historyState={historyState} />
      <RecentPaceSection historyState={historyState} now={now} />
      <ActivePicksSection historyState={historyState} />

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
          title="Most assigned"
          summary={historyState.stats.mostAssignedCompleted}
          currentUserId={historyState.currentUser.id}
          value={historyState.stats.mostAssignedCompleted?.completedFreshListens.length ?? "-"}
          helper="fresh listens completed"
        />
      </div>

      <FreshVsHeardSection historyState={historyState} />
      <GroupCompletionSection historyState={historyState} />

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AlbumLeaderboard
          title="Highest-rated albums"
          listens={historyState.stats.highestRatedAlbums}
          members={historyState.members}
          currentUserId={historyState.currentUser.id}
          tone="high"
        />
        <AlbumLeaderboard
          title="Lowest-rated albums"
          listens={historyState.stats.lowestRatedAlbums}
          members={historyState.members}
          currentUserId={historyState.currentUser.id}
          tone="low"
        />
      </div>

    </RouteShell>
  );
}

function AchievementSection({ summary }: { summary?: MemberSummary }) {
  const listens = summary?.listens ?? [];

  return (
    <section className="surface-panel mt-4 overflow-hidden rounded-lg">
      <div className="border-b border-[var(--line)] p-5">
        <p className="tag text-[var(--accent)]">your collection</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl md:text-4xl">Achievement badges</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
              Complete fresh picks and put your takes in writing to fill the badge case.
            </p>
          </div>
          <p className="tag">earned badges stay in your collection</p>
        </div>
      </div>

      <AchievementTrack
        description="Completed fresh picks. Quick already-heard scores do not count."
        listens={listens}
        title="Albums reviewed"
        track="listening"
      />
      <AchievementTrack
        description={`Written takes with at least ${WRITTEN_REVIEW_MIN_LENGTH} characters.`}
        listens={listens}
        title="Written takes"
        track="writing"
      />
    </section>
  );
}

function AchievementTrack({
  title,
  description,
  listens,
  track,
}: {
  title: string;
  description: string;
  listens: HistoryListen[];
  track: BadgeTrack;
}) {
  const badges = buildBadgeProgress(listens, track);
  const count = countTrackProgress(listens, track);
  const nextBadge = badges.find((badge) => badge.state === "next");

  return (
    <div className="border-b border-[var(--line)] p-5 last:border-b-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-2xl">{title}</h3>
            <span className="mono text-lg font-bold text-[var(--accent)]">{count}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p>
        </div>
        <p className="tag">
          {nextBadge
            ? `${nextBadge.remaining} until ${nextBadge.name}`
            : "Every badge earned"}
        </p>
      </div>
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3",
          badges.length >= 6 ? "xl:grid-cols-6" : "lg:grid-cols-5",
        )}
      >
        {badges.map((badge, index) => (
          <AchievementBadge badge={badge} index={index} key={badge.id} />
        ))}
      </div>
    </div>
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
        "rounded-lg border bg-[var(--card)] p-5 shadow-[var(--shadow)]",
        accent && "border-[var(--accent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent)]",
      )}
    >
      <p className={cn("tag", accent && "text-[var(--accent)]")}>{title}</p>
      <div
        className={cn(
          "mt-4 font-display text-5xl font-extrabold leading-none",
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
  const maxLogged = Math.max(
    1,
    ...historyState.memberSummaries.map((summary) => summary.loggedListens.length),
  );

  return (
    <section className="surface-panel mt-4 rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Progress</h2>
        <p className="tag">albums logged / assigned completed / active</p>
      </div>
      <div className="grid gap-3">
        {historyState.memberSummaries
          .toSorted((a, b) => b.loggedListens.length - a.loggedListens.length)
          .map((summary) => (
            <ProgressRow
              key={summary.member.id}
              summary={summary}
              currentUserId={historyState.currentUser.id}
              maxLogged={maxLogged}
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
  maxLogged,
  totalAlbums,
}: {
  summary: MemberSummary;
  currentUserId: string;
  maxLogged: number;
  totalAlbums: number;
}) {
  const logged = summary.loggedListens.length;
  const width = `${Math.round((logged / maxLogged) * 100)}%`;
  const percent = totalAlbums > 0 ? Math.round((logged / totalAlbums) * 100) : 0;

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
      <div className="h-6 overflow-hidden rounded-sm border border-[var(--line-strong)] bg-[var(--paper-2)]">
        <div className="h-full bg-[var(--accent)]" style={{ width }} />
      </div>
      <div className="flex flex-wrap gap-3 md:justify-end">
        <span className="mono text-sm font-bold">{logged} logged</span>
        <span className="tag">{summary.completedFreshListens.length} assigned</span>
        <span className="tag">{summary.activeFreshListens.length} active</span>
        <span className="tag">{percent}%</span>
      </div>
    </div>
  );
}

function RecentPaceSection({
  historyState,
  now,
}: {
  historyState: HistoryState;
  now: Date;
}) {
  const pace = historyState.memberSummaries
    .map((summary) => ({
      summary,
      last7: countRecentRatings(summary.listens, 7, now),
      last30: countRecentRatings(summary.listens, 30, now),
    }))
    .toSorted((a, b) => b.last30 - a.last30 || b.last7 - a.last7);

  return (
    <section className="surface-panel mt-4 rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Recent pace</h2>
        <p className="tag">reviews logged / rolling windows</p>
      </div>
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
    </section>
  );
}

function ActivePicksSection({
  historyState,
}: {
  historyState: HistoryState;
}) {
  const activeMemberEntries = historyState.memberSummaries.flatMap((summary) =>
    summary.activeFreshListens.map((listen) => ({ summary, listen })),
  );

  return (
    <section className="surface-panel mt-4 rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Active picks</h2>
        <p className="tag">solo and assigned listens</p>
      </div>
      {activeMemberEntries.length === 0 ? (
        <p className="tag">No active picks are waiting on reviews</p>
      ) : (
        <div className="grid gap-3">
          {activeMemberEntries.map(({ summary, listen }) => (
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

function FreshVsHeardSection({ historyState }: { historyState: HistoryState }) {
  const maxTotal = Math.max(
    1,
    ...historyState.memberSummaries.map(
      (summary) => summary.completedFreshListens.length + summary.skipListens.length,
    ),
  );

  return (
    <section className="surface-panel mt-4 rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Fresh vs already heard</h2>
        <p className="tag">assigned completions / skips</p>
      </div>
      <div className="grid gap-3">
        {historyState.memberSummaries
          .toSorted(
            (a, b) =>
              b.completedFreshListens.length +
              b.skipListens.length -
              (a.completedFreshListens.length + a.skipListens.length),
          )
          .map((summary) => {
            const fresh = summary.completedFreshListens.length;
            const skips = summary.skipListens.length;
            const total = fresh + skips;

            return (
              <div
                key={summary.member.id}
                className="grid gap-2 md:grid-cols-[minmax(150px,190px)_1fr_auto] md:items-center"
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
                <div className="flex h-6 overflow-hidden rounded-sm border border-[var(--line-strong)] bg-[var(--paper-2)]">
                  <div
                    className="h-full bg-[var(--good)]"
                    style={{ width: `${Math.round((fresh / maxTotal) * 100)}%` }}
                  />
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${Math.round((skips / maxTotal) * 100)}%` }}
                  />
                </div>
                <div className="flex gap-3 md:justify-end">
                  <span className="tag">{fresh} fresh</span>
                  <span className="tag">{skips} heard</span>
                  <span className="mono text-sm font-bold">{total}</span>
                </div>
              </div>
            );
          })}
      </div>
    </section>
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

function AlbumLeaderboard({
  title,
  listens,
  members,
  currentUserId,
  tone,
}: {
  title: string;
  listens: HistoryListen[];
  members: HistoryMember[];
  currentUserId: string;
  tone: "high" | "low";
}) {
  return (
    <section className="surface-panel rounded-lg p-5">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-4 grid gap-3">
        {listens.length === 0 && <p className="tag">No rated albums yet</p>}
        {listens.map((listen) => {
          const member = members.find((entry) => entry.id === listen.userId);

          return (
            <Link
              key={listen.id}
              href={`/albums/${listen.album.id}`}
              className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-md border border-[var(--line-strong)] p-3 transition-colors hover:bg-[var(--paper-2)]"
            >
              <AlbumCover
                rank={listen.album.rank}
                src={listen.album.coverUrl}
                title={listen.album.title}
                sizes="64px"
                className="cover-lift rounded-sm"
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "tag flex min-w-0 items-center gap-1.5",
                    tone === "high" && "text-[var(--good)]",
                  )}
                >
                  <ClubAvatar
                    imageUrl={member?.avatarUrl}
                    initials={member?.initials ?? "??"}
                    label={member?.displayName}
                    size="sm"
                  />
                  <span className="truncate">
                    {member ? getMemberLabel(member, currentUserId) : "Crew"}
                  </span>
                </p>
                <h3 className="mt-1 truncate text-xl">{listen.album.title}</h3>
                <p className="truncate font-quote text-base text-[var(--ink-soft)]">
                  {listen.album.artist}
                </p>
              </div>
              <ScoreBadge score={listen.rating} label="" />
            </Link>
          );
        })}
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
