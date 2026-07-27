import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Our500Ranking,
  type Our500Entry,
} from "@/components/our-500-ranking";
import { RouteShell } from "@/components/route-shell";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getCatalogAlbums } from "@/lib/catalog";
import { CREW_RANK_MIN_REVIEWS } from "@/lib/config";
import { getHistoryState, type HistoryState } from "@/lib/history";
import { getReviewerCount } from "@/lib/history-rules";

export const dynamic = "force-dynamic";

export default async function Our500Page() {
  let historyState: HistoryState;
  let albums: Awaited<ReturnType<typeof getCatalogAlbums>>;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    [historyState, albums] = await Promise.all([
      getHistoryState(pb, user),
      getCatalogAlbums(pb),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  const rankedByAlbumId = new Map(
    historyState.stats.crewRankedAlbums.map((summary, index) => [
      summary.album.id,
      { summary, crewRank: index + 1 },
    ]),
  );
  const provisionalByAlbumId = new Map(
    historyState.stats.provisionalAlbums.map((summary) => [
      summary.album.id,
      summary,
    ]),
  );
  const entries: Our500Entry[] = albums.map((album) => {
    const ranked = rankedByAlbumId.get(album.id);
    const summary = ranked?.summary ?? provisionalByAlbumId.get(album.id);

    return {
      album: {
        id: album.id,
        rank: album.rank,
        title: album.title,
        artist: album.artist,
        year: album.year,
        coverUrl: album.coverUrl,
      },
      crewRank: ranked?.crewRank ?? null,
      averageRating: summary?.averageRating ?? null,
      reviewerCount: summary ? getReviewerCount(summary) : 0,
      spread: summary?.spread ?? 0,
      ratings:
        summary?.listens.flatMap((listen) =>
          listen.rating == null
            ? []
            : [{
                id: listen.id,
                userId: listen.userId,
                rating: listen.rating,
              }],
        ) ?? [],
    };
  });

  return (
    <RouteShell eyebrow="THE COLLECTIVE LIST" title="Our 500">
      <div className="stats-readable">
        <div className="mb-5 max-w-3xl">
          <p className="text-lg text-[var(--ink-soft)]">
            Our evolving order of Rolling Stone&apos;s 500, built from every crew
            score. An album becomes officially ranked after{" "}
            {CREW_RANK_MIN_REVIEWS} members review it.
          </p>
          <p className="tag mt-3 max-w-3xl leading-relaxed">
            Crew positions cover eligible reviewed albums—not yet all 500. Rankings
            use the average of every crew rating; ties favor more ratings, then the
            higher original RS placement.
          </p>
          <Link
            href="/stats"
            className="tag mt-4 inline-block text-[var(--accent)] hover:underline"
          >
            ← Back to Stats
          </Link>
        </div>

        <Our500Ranking
          entries={entries}
          members={historyState.members}
          currentUserId={historyState.currentUser.id}
        />
      </div>
    </RouteShell>
  );
}
