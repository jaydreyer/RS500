import { ArrowLeft, ArrowUpDown, Search, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, ScoreBadge } from "@/components/primitives";
import { ReviewMarkdown } from "@/components/review-markdown";
import { ReviewSocialPanel } from "@/components/review-social-panel";
import { RouteShell } from "@/components/route-shell";
import { buttonVariants } from "@/components/ui/button";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { RATING_SCALE } from "@/lib/config";
import {
  formatAverage,
  getHistoryState,
  getMemberLabel,
  type HistoryListen,
  type HistoryMember,
  type HistoryState,
  type MemberSummary,
} from "@/lib/history";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HistorySortKey = "date" | "score" | "discussion" | "reactions";
type HistorySortDirection = "asc" | "desc";
type HistorySortState = {
  sort: HistorySortKey;
  dir: HistorySortDirection;
};
type HistoryScoreFilter = "all" | "high" | "low";
type HistoryActivityFilter = "all" | "replies" | "reactions";
type HistoryFilterState = {
  q: string;
  reviewer: string;
  score: HistoryScoreFilter;
  activity: HistoryActivityFilter;
};
type HistorySearchParams = {
  activity?: string;
  dir?: string;
  member?: string;
  q?: string;
  reviewer?: string;
  score?: string;
  sort?: string;
};

const HISTORY_SORT_OPTIONS: Array<HistorySortState & { label: string }> = [
  { sort: "date", dir: "desc", label: "Date desc" },
  { sort: "date", dir: "asc", label: "Date asc" },
  { sort: "score", dir: "desc", label: "Score high to low" },
  { sort: "score", dir: "asc", label: "Score low to high" },
  { sort: "discussion", dir: "desc", label: "Most discussed" },
  { sort: "reactions", dir: "desc", label: "Most reacted" },
];
const DEFAULT_HISTORY_FILTER_STATE: HistoryFilterState = {
  q: "",
  reviewer: "",
  score: "all",
  activity: "all",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<HistorySearchParams>;
}) {
  const {
    activity,
    member: selectedMemberId,
    q,
    reviewer,
    score,
    sort,
    dir,
  } = await searchParams;
  const sortState = getHistorySortState(sort, dir);
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

  const filterState = getHistoryFilterState({ activity, q, reviewer, score });
  const selectedSummary = selectedMemberId
    ? historyState.memberSummaries.find((summary) => summary.member.id === selectedMemberId)
    : null;

  if (selectedSummary) {
    return (
      <MemberHistoryDetail
        historyState={historyState}
        summary={selectedSummary}
        sortState={sortState}
      />
    );
  }

  const filteredFreshListens = filterHistoryListens(
    historyState.freshGridListens,
    historyState.members,
    filterState,
  );
  const sortedFreshListens = sortHistoryListens(filteredFreshListens, sortState);

  return (
    <RouteShell eyebrow="THE REVIEWS" title="Reviews">
      <p className="-mt-2 mb-6 max-w-xl font-quote text-xl leading-snug text-[var(--ink-soft)]">
        Every reviewed fresh pick in reverse chronology. React to the takes, reply when the take
        deserves a little discussion, and open member logs including skips.
      </p>

      <HistoryReviewControls
        currentUserId={historyState.currentUser.id}
        filterState={filterState}
        members={historyState.members}
        resultCount={sortedFreshListens.length}
        sortState={sortState}
        totalCount={historyState.freshGridListens.length}
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {historyState.memberSummaries.map((summary) => (
          <Link
            key={summary.member.id}
            href={`/history?member=${summary.member.id}`}
            className="pressed-panel flex items-center gap-3 rounded-lg p-4 transition-colors hover:border-[var(--accent)]"
          >
            <ClubAvatar
              imageUrl={summary.member.avatarUrl}
              initials={summary.member.initials}
              label={summary.member.displayName}
              ring={summary.member.id === historyState.currentUser.id}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg">
                {getMemberLabel(summary.member, historyState.currentUser.id)}
              </h2>
              <p className="tag mt-1">
                {summary.completedFreshListens.length} fresh / {summary.skipListens.length} skips
                / avg {formatAverage(summary.averageFreshRating)}
              </p>
            </div>
          </Link>
        ))}
      </section>

      <div className="hard-panel overflow-visible rounded-lg">
        {sortedFreshListens.map((listen) => {
          const member = historyState.members.find((entry) => entry.id === listen.userId);

          return member ? (
            <RecentListenRow
              key={listen.id}
              listen={listen}
              member={member}
              currentUserId={historyState.currentUser.id}
            />
          ) : null;
        })}
      </div>

      {sortedFreshListens.length === 0 && (
        <div className="pressed-panel mt-5 rounded-lg p-6 text-center">
          <p className="tag">
            {hasActiveFilters(filterState) ? "No reviews match those filters" : "No reviewed fresh picks yet"}
          </p>
        </div>
      )}
    </RouteShell>
  );
}

function RecentListenRow({
  listen,
  member,
  currentUserId,
}: {
  listen: HistoryListen;
  member: HistoryMember;
  currentUserId: string;
}) {
  return (
    <article className="grid gap-3 border-b border-[var(--line)] p-4 transition-colors last:border-b-0 hover:bg-[var(--paper-2)] sm:grid-cols-[48px_64px_minmax(0,1fr)] sm:items-start">
      <ClubAvatar
        imageUrl={member.avatarUrl}
        initials={member.initials}
        label={member.displayName}
        ring={member.id === currentUserId}
      />
      <Link href={`/albums/${listen.album.id}`} className="w-16">
        <AlbumCover
          rank={listen.album.rank}
          src={listen.album.coverUrl}
          title={listen.album.title}
          sizes="64px"
          className="cover-lift rounded-sm"
        />
      </Link>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-extrabold">
                {getMemberLabel(member, currentUserId)}
              </span>
              {listen.groupDrawId && (
                <span className="tag inline-flex items-center gap-1 rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
                  <Users className="size-3" aria-hidden="true" />
                  group draw
                </span>
              )}
              <span className="tag">{formatReviewDate(listen)}</span>
            </div>
            <Link href={`/albums/${listen.album.id}`} className="block">
              <h2 className="mt-1 truncate text-xl transition-colors hover:text-[var(--accent)]">
                {listen.album.title}
              </h2>
            </Link>
            <p className="mt-1 truncate font-quote text-lg leading-tight text-[var(--ink-soft)]">
              {listen.album.artist} / #{listen.album.rank}
            </p>
          </div>
          <div className="shrink-0">
            <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} emptyLabel="no score" />
          </div>
        </div>
        {listen.take && (
          <ReviewMarkdown className="mt-2 break-words font-quote text-base leading-relaxed text-[var(--ink-soft)]">
            {listen.take}
          </ReviewMarkdown>
        )}
      </div>
      <div className="min-w-0 sm:col-start-3">
        <ReviewSocialPanel
          currentUserId={currentUserId}
          listenId={listen.id}
          reactions={listen.reactions}
          replies={listen.replies}
        />
      </div>
    </article>
  );
}

function MemberHistoryDetail({
  historyState,
  summary,
  sortState,
}: {
  historyState: HistoryState;
  summary: MemberSummary;
  sortState: HistorySortState;
}) {
  const memberLabel = getMemberLabel(summary.member, historyState.currentUser.id);
  const reviewedListens = sortHistoryListens(summary.loggedListens, sortState);

  return (
    <section className="mx-auto w-full max-w-[820px]">
      <Link
        href="/history"
        className="mono mb-5 inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to reviews
      </Link>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-4">
          <ClubAvatar
            imageUrl={summary.member.avatarUrl}
            initials={summary.member.initials}
            label={summary.member.displayName}
            ring={summary.member.id === historyState.currentUser.id}
            size="lg"
          />
          <div>
            <p className="tag">Member reviews</p>
            <h1 className="title-wrap mt-2 text-5xl md:text-7xl">{memberLabel}</h1>
          </div>
        </div>
        <div className="pressed-panel flex gap-6 rounded-lg px-4 py-3">
          <MemberStat label="fresh" value={summary.completedFreshListens.length} />
          <MemberStat label="skips" value={summary.skipListens.length} />
          <MemberStat
            label="fresh avg"
            value={formatAverage(summary.averageFreshRating)}
            accent
          />
        </div>
      </div>

      <HistorySortControls
        className="mb-4"
        filterState={DEFAULT_HISTORY_FILTER_STATE}
        memberId={summary.member.id}
        sortState={sortState}
      />

      <div className="hard-panel overflow-visible rounded-lg">
        {reviewedListens.length === 0 ? (
          <div className="p-6 text-center">
            <p className="tag">No reviewed albums yet</p>
          </div>
        ) : (
          reviewedListens.map((listen) => (
            <MemberListenRow
              key={listen.id}
              listen={listen}
              member={summary.member}
              currentUserId={historyState.currentUser.id}
            />
          ))
        )}
      </div>
    </section>
  );
}

function MemberStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "font-display text-4xl font-extrabold leading-none",
          accent && "text-[var(--good)]",
        )}
      >
        {value}
      </div>
      <div className="tag mt-1">{label}</div>
    </div>
  );
}

function MemberListenRow({
  listen,
  member,
  currentUserId,
}: {
  listen: HistoryListen;
  member: HistoryMember;
  currentUserId: string;
}) {
  return (
    <article className="grid gap-3 border-b border-[var(--line)] p-4 transition-colors last:border-b-0 hover:bg-[var(--paper-2)] sm:grid-cols-[56px_minmax(0,1fr)]">
      <Link href={`/albums/${listen.album.id}`} className="w-14 shrink-0">
        <AlbumCover
          rank={listen.album.rank}
          src={listen.album.coverUrl}
          title={listen.album.title}
          sizes="56px"
          className="cover-lift rounded-sm"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/albums/${listen.album.id}`} className="min-w-0">
                <h2 className="truncate text-xl transition-colors hover:text-[var(--accent)]">
                  {listen.album.title}
                </h2>
              </Link>
              <span className="tag rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
                {listen.kind}
              </span>
              {listen.groupDrawId && (
                <span className="tag inline-flex items-center gap-1 rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
                  <Users className="size-3" aria-hidden="true" />
                  group draw
                </span>
              )}
            </div>
            <p className="mt-1 font-quote text-lg leading-tight text-[var(--ink-soft)]">
              {listen.album.artist} / #{listen.album.rank} / {formatReviewDate(listen)}
            </p>
          </div>
          <div className="shrink-0">
            <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} emptyLabel="no score" />
            <span className="sr-only">{member.displayName}</span>
          </div>
        </div>
        {listen.take && (
          <ReviewMarkdown className="mt-2 break-words font-quote text-base leading-relaxed text-[var(--ink-soft)]">
            {listen.take}
          </ReviewMarkdown>
        )}
      </div>
      <div className="min-w-0 sm:col-start-2">
        <ReviewSocialPanel
          currentUserId={currentUserId}
          listenId={listen.id}
          reactions={listen.reactions}
          replies={listen.replies}
        />
      </div>
    </article>
  );
}

function HistoryReviewControls({
  currentUserId,
  filterState,
  members,
  resultCount,
  sortState,
  totalCount,
}: {
  currentUserId: string;
  filterState: HistoryFilterState;
  members: HistoryMember[];
  resultCount: number;
  sortState: HistorySortState;
  totalCount: number;
}) {
  return (
    <section className="pressed-panel mb-5 grid gap-4 rounded-lg p-4">
      <form
        action="/history"
        className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_minmax(210px,240px)_minmax(170px,220px)_minmax(200px,240px)_auto] xl:items-end"
      >
        <input type="hidden" name="sort" value={sortState.sort} />
        <input type="hidden" name="dir" value={sortState.dir} />
        <label className="grid min-w-0 gap-1.5">
          <span className="tag inline-flex items-center gap-1.5">
            <Search className="size-3.5" aria-hidden="true" />
            search
          </span>
          <input
            name="q"
            defaultValue={filterState.q}
            placeholder="album, artist, take, reply"
            className="input-control history-filter-control min-w-0 px-4"
          />
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="tag">member</span>
          <select
            name="reviewer"
            defaultValue={filterState.reviewer}
            className="input-control history-filter-control min-w-0 px-4 pr-11"
          >
            <option value="">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {getMemberLabel(member, currentUserId)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="tag">score</span>
          <select
            name="score"
            defaultValue={filterState.score}
            className="input-control history-filter-control min-w-0 px-4 pr-11"
          >
            <option value="all">All scores</option>
            <option value="high">9+</option>
            <option value="low">Under 5</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="tag">activity</span>
          <select
            name="activity"
            defaultValue={filterState.activity}
            className="input-control history-filter-control min-w-0 px-4 pr-11"
          >
            <option value="all">All activity</option>
            <option value="replies">Has replies</option>
            <option value="reactions">Has reactions</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2 xl:flex-nowrap">
          <button
            type="submit"
            className={cn(buttonVariants({ variant: "solid", size: "sm" }), "h-[52px] px-4 text-base")}
          >
            Apply
          </button>
          <Link
            href="/history"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-[52px] px-4 text-base")}
          >
            Reset
          </Link>
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HistorySortControls filterState={filterState} sortState={sortState} />
        <span className="tag">
          {resultCount} of {totalCount} reviews
        </span>
      </div>
    </section>
  );
}

function HistorySortControls({
  className,
  filterState,
  sortState,
  memberId,
}: {
  className?: string;
  filterState: HistoryFilterState;
  sortState: HistorySortState;
  memberId?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="tag inline-flex items-center gap-1.5">
        <ArrowUpDown className="size-3.5" aria-hidden="true" />
        sort
      </span>
      {HISTORY_SORT_OPTIONS.map((option) => {
        const active = option.sort === sortState.sort && option.dir === sortState.dir;

        return (
          <Link
            key={`${option.sort}-${option.dir}`}
            href={buildHistoryHref({ filterState, memberId, sortState: option })}
            aria-current={active ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: active ? "solid" : "ghost", size: "sm" }),
              "h-8 px-2.5",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function getHistorySortState(sort?: string, dir?: string): HistorySortState {
  const sortKey =
    sort === "score" || sort === "discussion" || sort === "reactions" ? sort : "date";

  return {
    sort: sortKey,
    dir: dir === "asc" ? "asc" : "desc",
  };
}

function getHistoryFilterState({
  activity,
  q,
  reviewer,
  score,
}: Pick<HistorySearchParams, "activity" | "q" | "reviewer" | "score">): HistoryFilterState {
  return {
    q: typeof q === "string" ? q.trim().slice(0, 120) : "",
    reviewer: typeof reviewer === "string" ? reviewer.trim() : "",
    score: score === "high" || score === "low" ? score : "all",
    activity: activity === "replies" || activity === "reactions" ? activity : "all",
  };
}

function filterHistoryListens(
  listens: HistoryListen[],
  members: HistoryMember[],
  filterState: HistoryFilterState,
) {
  const normalizedQuery = normalizeHistorySearch(filterState.q);
  const membersById = new Map(members.map((member) => [member.id, member]));

  return listens.filter((listen) => {
    if (filterState.reviewer && listen.userId !== filterState.reviewer) {
      return false;
    }

    if (filterState.score === "high" && (listen.rating ?? 0) < 9) {
      return false;
    }

    if (filterState.score === "low" && (listen.rating ?? Number.POSITIVE_INFINITY) >= 5) {
      return false;
    }

    if (filterState.activity === "replies" && getDiscussionCount(listen) === 0) {
      return false;
    }

    if (filterState.activity === "reactions" && getReactionCount(listen) === 0) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const member = membersById.get(listen.userId);

    return getReviewSearchText(listen, member).includes(normalizedQuery);
  });
}

function sortHistoryListens<TListen extends HistoryListen>(
  listens: TListen[],
  sortState: HistorySortState,
) {
  return listens.toSorted((left, right) => {
    const direction = sortState.dir === "asc" ? 1 : -1;
    const primary = getSortValue(left, right, sortState.sort);

    if (primary !== 0) {
      return primary * direction;
    }

    const dateTie = compareStrings(getReviewSubmittedAt(right), getReviewSubmittedAt(left));
    const scoreTie = compareNumbers(right.rating ?? 0, left.rating ?? 0);

    const secondaryTie =
      sortState.sort === "score" ? dateTie : sortState.sort === "date" ? scoreTie : dateTie || scoreTie;

    return (
      secondaryTie ||
      left.album.title.localeCompare(right.album.title) ||
      left.id.localeCompare(right.id)
    );
  });
}

function getSortValue(left: HistoryListen, right: HistoryListen, sort: HistorySortKey) {
  switch (sort) {
    case "score":
      return compareNumbers(left.rating ?? 0, right.rating ?? 0);
    case "discussion":
      return compareNumbers(getDiscussionCount(left), getDiscussionCount(right));
    case "reactions":
      return compareNumbers(getReactionCount(left), getReactionCount(right));
    case "date":
    default:
      return compareStrings(getReviewSubmittedAt(left), getReviewSubmittedAt(right));
  }
}

function buildHistoryHref({
  filterState,
  memberId,
  sortState,
}: {
  filterState: HistoryFilterState;
  memberId?: string;
  sortState: HistorySortState;
}) {
  const params = new URLSearchParams({
    sort: sortState.sort,
    dir: sortState.dir,
  });

  if (filterState.q) {
    params.set("q", filterState.q);
  }

  if (filterState.reviewer) {
    params.set("reviewer", filterState.reviewer);
  }

  if (filterState.score !== "all") {
    params.set("score", filterState.score);
  }

  if (filterState.activity !== "all") {
    params.set("activity", filterState.activity);
  }

  if (memberId) {
    params.set("member", memberId);
  }

  return `/history?${params.toString()}`;
}

function formatReviewDate(listen: HistoryListen) {
  const submittedAt = getReviewSubmittedAt(listen);
  const date = new Date(submittedAt);

  if (!submittedAt || Number.isNaN(date.getTime())) {
    return "date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(submittedAt));
}

function getReviewSubmittedAt(listen: HistoryListen) {
  return listen.ratedAt || listen.created || "";
}

function getReviewSearchText(listen: HistoryListen, member?: HistoryMember) {
  return normalizeHistorySearch(
    [
      listen.album.title,
      listen.album.artist,
      String(listen.album.rank),
      listen.take,
      member?.displayName ?? "",
      ...listen.reactions.map((reaction) => reaction.comment),
      ...listen.replies.map((reply) => reply.body),
    ].join(" "),
  );
}

function getDiscussionCount(listen: HistoryListen) {
  return listen.replies.length + listen.reactions.filter((reaction) => reaction.comment).length;
}

function getReactionCount(listen: HistoryListen) {
  return listen.reactions.filter((reaction) => reaction.emoji).length;
}

function hasActiveFilters(filterState: HistoryFilterState) {
  return (
    Boolean(filterState.q) ||
    Boolean(filterState.reviewer) ||
    filterState.score !== "all" ||
    filterState.activity !== "all"
  );
}

function normalizeHistorySearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function compareNumbers(left: number, right: number) {
  return left - right;
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}
