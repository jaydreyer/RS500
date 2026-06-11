import Link from "next/link";
import { redirect } from "next/navigation";

import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, ScoreBadge } from "@/components/primitives";
import { RouteShell } from "@/components/route-shell";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { formatRating, RATING_SCALE, STATS_SAMPLE_THRESHOLD } from "@/lib/config";
import { getUserGroupDrawState } from "@/lib/group-draw";
import type { UserGroupDrawState } from "@/lib/group-draw-types";
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
  let groupDrawState: UserGroupDrawState;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    [historyState, groupDrawState] = await Promise.all([
      getHistoryState(pb, user),
      getUserGroupDrawState(user.id),
    ]);
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

      <ProgressSection historyState={historyState} />
      <RecentPaceSection historyState={historyState} now={now} />
      <ActivePicksSection historyState={historyState} groupDrawState={groupDrawState} />

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
  groupDrawState,
}: {
  historyState: HistoryState;
  groupDrawState: UserGroupDrawState;
}) {
  const activeMemberEntries = historyState.memberSummaries.flatMap((summary) =>
    summary.activeFreshListens.map((listen) => ({ summary, listen })),
  );

  return (
    <section className="mt-4 grid gap-4 xl:grid-cols-2">
      <div className="surface-panel rounded-lg p-5">
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
      </div>

      <div className="surface-panel rounded-lg p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl">Group readiness</h2>
          <p className="tag">spin when reviews clear</p>
        </div>
        {groupDrawState.groups.length === 0 ? (
          <p className="tag">No active groups yet</p>
        ) : (
          <div className="grid gap-3">
            {groupDrawState.groups.map((group) => (
              <div
                key={group.id}
                className="rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="truncate text-xl">{group.name}</h3>
                  <span
                    className={cn(
                      "tag rounded-sm border px-2 py-1",
                      group.blockedMembers.length > 0
                        ? "border-[var(--line-strong)] text-[var(--accent)]"
                        : "border-[color-mix(in_srgb,var(--good)_45%,var(--line-strong))] text-[var(--good)]",
                    )}
                  >
                    {group.blockedMembers.length > 0 ? "waiting" : "ready"}
                  </span>
                </div>
                <p className="mt-2 font-quote text-base text-[var(--ink-soft)]">
                  {group.currentDraw
                    ? `${group.currentDraw.album.title} / ${group.currentDraw.album.artist}`
                    : `${group.poolLeft} shared albums left`}
                </p>
                {group.blockedMembers.length > 0 && (
                  <p className="tag mt-2">
                    due from {group.blockedMembers.map((member) => member.displayName).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
      <ClubAvatar
        imageUrl={member?.avatarUrl}
        initials={member?.initials ?? "??"}
        label={member?.displayName}
        size="sm"
      />
      <span className="max-w-[96px] truncate text-sm font-bold">{label}</span>
      <span className="font-display text-xl font-extrabold">
        {listen.rating == null ? "-" : formatRating(listen.rating)}
      </span>
      <span className="mono text-[10px] text-[var(--ink-faint)]">/{RATING_SCALE.max}</span>
    </Link>
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
