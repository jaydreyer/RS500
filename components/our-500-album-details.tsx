import Link from "next/link";

import { ClubAvatar } from "@/components/primitives";
import { formatRating, RATING_SCALE } from "@/lib/config";
import type { StatsMember } from "@/lib/history-rules";

export type Our500AlbumInfo = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
};

export type Our500Rating = {
  id: string;
  userId: string;
  rating: number;
};

export function Our500AlbumDetails({
  album,
  averageRating,
  ratingCount,
  titleLevel = "h2",
  prominentScore = false,
}: {
  album: Our500AlbumInfo;
  averageRating: number | null;
  ratingCount: number;
  titleLevel?: "h2" | "h3" | "h4";
  prominentScore?: boolean;
}) {
  const Heading = titleLevel;

  return (
    <>
      <Link href={`/albums/${album.id}`}>
        <Heading className="truncate text-xl">{album.title}</Heading>
      </Link>
      <p className="truncate font-quote text-base text-[var(--ink-soft)]">
        {album.artist}
        <span className="mono ml-2 text-xs not-italic text-[var(--ink-faint)]">
          {album.year}
        </span>
      </p>
      {prominentScore ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-baseline gap-1.5 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-2.5 py-1">
            <span className="font-display text-2xl font-extrabold leading-none text-[var(--accent)]">
              {averageRating == null
                ? "—"
                : averageRating.toFixed(RATING_SCALE.precision)}
            </span>
            <span className="mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              crew score
            </span>
          </span>
          <span className="tag">
            {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
          </span>
          <span className="tag">RS #{album.rank}</span>
        </div>
      ) : (
        <p className="tag mt-1">
          {averageRating == null
            ? "not reviewed"
            : `crew ${averageRating.toFixed(RATING_SCALE.precision)}`}{" "}
          / {ratingCount} {ratingCount === 1 ? "rating" : "ratings"} / RS #{album.rank}
        </p>
      )}
    </>
  );
}

export function Our500RatingChips({
  albumId,
  ratings,
  members,
  currentUserId,
  maxVisible = 6,
}: {
  albumId: string;
  ratings: Our500Rating[];
  members: StatsMember[];
  currentUserId: string;
  maxVisible?: number;
}) {
  const orderedRatings = ratings.toSorted(
    (a, b) => Number(b.userId === currentUserId) - Number(a.userId === currentUserId),
  );
  const visibleRatings = orderedRatings.slice(0, maxVisible);
  const remainingCount = Math.max(0, ratings.length - visibleRatings.length);

  if (ratings.length === 0) {
    return <span className="tag text-[var(--ink-faint)]">waiting for the first spin</span>;
  }

  return (
    <>
      {visibleRatings.map((rating) => {
        const member = members.find((entry) => entry.id === rating.userId);
        const label = member?.id === currentUserId ? "You" : (member?.displayName ?? "Crew");
        const formattedRating = formatRating(rating.rating);

        return (
          <Link
            key={rating.id}
            href={member ? `/history?member=${member.id}` : `/albums/${albumId}`}
            aria-label={`${label} rated ${formattedRating}`}
            title={`${label}: ${formattedRating}`}
            className="flex items-center gap-1.5 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-2 py-1"
          >
            <ClubAvatar
              imageUrl={member?.avatarUrl}
              initials={member?.initials ?? "??"}
              label={member?.displayName}
              size="sm"
            />
            <span className="font-display text-xl font-extrabold">{formattedRating}</span>
          </Link>
        );
      })}
      {remainingCount > 0 && (
        <Link
          href={`/albums/${albumId}`}
          aria-label={`View ${remainingCount} more ratings for this album`}
          className="flex items-center rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-2.5 py-1 font-display text-sm font-extrabold text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          +{remainingCount} more
        </Link>
      )}
    </>
  );
}
