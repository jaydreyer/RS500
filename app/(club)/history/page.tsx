import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, ScoreBadge } from "@/components/primitives";
import { ReviewMarkdown } from "@/components/review-markdown";
import { RouteShell } from "@/components/route-shell";
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

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member: selectedMemberId } = await searchParams;
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

  const selectedSummary = selectedMemberId
    ? historyState.memberSummaries.find((summary) => summary.member.id === selectedMemberId)
    : null;

  if (selectedSummary) {
    return <MemberHistoryDetail historyState={historyState} summary={selectedSummary} />;
  }

  return (
    <RouteShell eyebrow="THE LOG" title="History">
      <p className="-mt-2 mb-6 max-w-xl font-quote text-xl leading-snug text-[var(--ink-soft)]">
        Every reviewed fresh pick in reverse chronology. Member names open reviewed logs, including
        skips.
      </p>

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

      <div className="hard-panel overflow-hidden rounded-lg">
        {historyState.freshGridListens.map((listen) => {
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

      {historyState.freshGridListens.length === 0 && (
        <div className="pressed-panel mt-5 rounded-lg p-6 text-center">
          <p className="tag">No reviewed fresh picks yet</p>
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
    <Link
      href={`/albums/${listen.album.id}`}
      className="grid gap-3 border-b border-[var(--line)] p-4 transition-colors last:border-b-0 hover:bg-[var(--paper-2)] sm:grid-cols-[48px_64px_1fr_auto] sm:items-center"
    >
      <ClubAvatar
        imageUrl={member.avatarUrl}
        initials={member.initials}
        label={member.displayName}
        ring={member.id === currentUserId}
      />
      <div className="w-16">
        <AlbumCover
          rank={listen.album.rank}
          src={listen.album.coverUrl}
          title={listen.album.title}
          sizes="64px"
          className="cover-lift rounded-sm"
        />
      </div>
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
          <span className="tag">{listen.weekLabel}</span>
        </div>
        <h2 className="mt-1 truncate text-xl">{listen.album.title}</h2>
        <p className="mt-1 truncate font-quote text-lg leading-tight text-[var(--ink-soft)]">
          {listen.album.artist} / #{listen.album.rank}
        </p>
        {listen.take && (
          <ReviewMarkdown className="mt-2 line-clamp-2 font-quote text-base leading-relaxed text-[var(--ink-soft)]">
            {listen.take}
          </ReviewMarkdown>
        )}
      </div>
      <div className="shrink-0 self-center">
        <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} emptyLabel="no score" />
      </div>
    </Link>
  );
}

function MemberHistoryDetail({
  historyState,
  summary,
}: {
  historyState: HistoryState;
  summary: MemberSummary;
}) {
  const memberLabel = getMemberLabel(summary.member, historyState.currentUser.id);
  const reviewedListens = summary.loggedListens;

  return (
    <section className="mx-auto w-full max-w-[820px]">
      <Link
        href="/history"
        className="mono mb-5 inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to scorecard
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
            <p className="tag">Member history</p>
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

      <div className="hard-panel overflow-hidden rounded-lg">
        {reviewedListens.length === 0 ? (
          <div className="p-6 text-center">
            <p className="tag">No reviewed albums yet</p>
          </div>
        ) : (
          reviewedListens.map((listen) => (
            <MemberListenRow key={listen.id} listen={listen} member={summary.member} />
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
}: {
  listen: HistoryListen;
  member: HistoryMember;
}) {
  return (
    <Link
      href={`/albums/${listen.album.id}`}
      className="flex gap-3 border-b border-[var(--line)] p-4 transition-colors last:border-b-0 hover:bg-[var(--paper-2)]"
    >
      <div className="w-14 shrink-0">
        <AlbumCover
          rank={listen.album.rank}
          src={listen.album.coverUrl}
          title={listen.album.title}
          sizes="56px"
          className="cover-lift rounded-sm"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate text-xl">{listen.album.title}</h2>
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
          {listen.album.artist} / #{listen.album.rank} / {listen.weekLabel}
        </p>
        {listen.take && (
          <ReviewMarkdown className="mt-2 line-clamp-3 font-quote text-base leading-relaxed text-[var(--ink-soft)]">
            {listen.take}
          </ReviewMarkdown>
        )}
      </div>
      <div className="shrink-0 self-center">
        <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} emptyLabel="no score" />
        <span className="sr-only">{member.displayName}</span>
      </div>
    </Link>
  );
}
