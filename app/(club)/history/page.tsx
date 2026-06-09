import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, ScoreBadge } from "@/components/primitives";
import { RouteShell } from "@/components/route-shell";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { formatRating, RATING_SCALE } from "@/lib/config";
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
    <RouteShell eyebrow="THE SCORECARD" title="History">
      <p className="-mt-2 mb-6 max-w-xl font-quote text-xl leading-snug text-[var(--ink-soft)]">
        Every fresh pick, crew by week. Member names open the full log, including skips.
      </p>

      <div className="hard-panel overflow-x-auto rounded-lg">
        <table className="w-full min-w-[840px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--line-strong)]">
              <th className="tag sticky left-0 z-10 bg-[var(--card)] p-4 text-left font-normal">
                Crew
              </th>
              {historyState.weeks.map((week) => (
                <th key={week} className="tag p-4 text-center font-normal">
                  {formatWeekHeader(week)}
                </th>
              ))}
              <th className="tag p-4 text-center font-normal">Avg</th>
            </tr>
          </thead>
          <tbody>
            {historyState.members.map((member) => {
              const summary = historyState.memberSummaries.find(
                (entry) => entry.member.id === member.id,
              );

              return (
                <tr
                  key={member.id}
                  className="border-b border-[var(--line)] transition-colors last:border-b-0 hover:bg-[var(--paper-2)]"
                >
                  <td className="sticky left-0 z-10 bg-[var(--card)] p-4">
                    <Link
                      href={`/history?member=${member.id}`}
                      className="flex w-max items-center gap-3 text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
                    >
                      <ClubAvatar
                        initials={member.initials}
                        ring={member.id === historyState.currentUser.id}
                      />
                      <span className="font-display text-lg font-extrabold">
                        {getMemberLabel(member, historyState.currentUser.id)}
                      </span>
                    </Link>
                  </td>
                  {historyState.weeks.map((week) => {
                    const listen = historyState.freshGridListens.find(
                      (entry) => entry.userId === member.id && entry.week === week,
                    );

                    return (
                      <td key={`${member.id}-${week}`} className="p-3 text-center align-middle">
                        {listen ? <HistoryCell listen={listen} /> : <EmptyCell />}
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "p-4 text-center font-display text-2xl font-extrabold",
                      (summary?.averageFreshRating ?? 0) >= 8 && "text-[var(--good)]",
                    )}
                  >
                    {formatAverage(summary?.averageFreshRating ?? null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {historyState.weeks.length === 0 && (
        <div className="pressed-panel mt-5 rounded-lg p-6 text-center">
          <p className="tag">No fresh picks have landed yet</p>
        </div>
      )}
    </RouteShell>
  );
}

function HistoryCell({ listen }: { listen: HistoryListen }) {
  const listening = listen.status === "listening";

  return (
    <Link
      href={`/albums/${listen.album.id}`}
      className="group mx-auto grid w-[112px] justify-items-center gap-2 text-center"
      title={`${listen.album.title} - ${listen.album.artist}`}
    >
      <span className="relative block size-16">
        <AlbumCover
          rank={listen.album.rank}
          src={listen.album.coverUrl}
          title={listen.album.title}
          className="rounded-sm"
        />
        <span className="absolute -bottom-2 -right-2">
          {listening ? (
            <span className="grid size-5 place-items-center rounded-full border border-white/70 bg-[var(--accent)]">
              <span className="size-2 rounded-full bg-white animate-pulse-dot" />
            </span>
          ) : (
            <span className="inline-flex min-w-7 justify-center rounded-sm bg-[var(--ink)] px-1.5 py-0.5 font-display text-sm font-extrabold text-[var(--paper)] shadow-[var(--shadow)]">
              {listen.rating == null ? "" : formatRating(listen.rating)}
            </span>
          )}
        </span>
      </span>
      <span className="line-clamp-2 max-w-full text-xs font-bold leading-tight text-[var(--ink-soft)] group-hover:text-[var(--ink)]">
        {listen.album.title}
      </span>
    </Link>
  );
}

function EmptyCell() {
  return (
    <div className="mx-auto grid size-16 place-items-center rounded-md border border-dashed border-[var(--line-strong)]">
      <span className="text-xl text-[var(--ink-faint)]">.</span>
    </div>
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
            initials={summary.member.initials}
            ring={summary.member.id === historyState.currentUser.id}
            size="lg"
          />
          <div>
            <p className="tag">Member history</p>
            <h1 className="title-wrap mt-2 text-5xl md:text-7xl">{memberLabel}</h1>
          </div>
        </div>
        <div className="pressed-panel flex gap-6 rounded-lg px-4 py-3">
          <MemberStat label="fresh" value={summary.freshListens.length} />
          <MemberStat label="skips" value={summary.skipListens.length} />
          <MemberStat
            label="fresh avg"
            value={formatAverage(summary.averageFreshRating)}
            accent
          />
        </div>
      </div>

      <div className="hard-panel overflow-hidden rounded-lg">
        {summary.listens.length === 0 ? (
          <div className="p-6 text-center">
            <p className="tag">No logs yet</p>
          </div>
        ) : (
          summary.listens.map((listen) => (
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
          className="cover-lift rounded-sm"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate text-xl">{listen.album.title}</h2>
          <span className="tag rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
            {listen.kind}
          </span>
        </div>
        <p className="mt-1 font-quote text-lg leading-tight text-[var(--ink-soft)]">
          {listen.album.artist} / #{listen.album.rank} / {listen.weekLabel}
        </p>
        {listen.take && (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap font-quote text-base italic leading-relaxed text-[var(--ink-soft)]">
            &quot;{listen.take}&quot;
          </p>
        )}
      </div>
      <div className="shrink-0 self-center">
        {listen.status === "listening" ? (
          <ScoreBadge score={null} />
        ) : (
          <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} />
        )}
        <span className="sr-only">{member.displayName}</span>
      </div>
    </Link>
  );
}

function formatWeekHeader(week: string) {
  return week.includes("-W") ? `W${week.split("-W")[1]}` : week;
}
