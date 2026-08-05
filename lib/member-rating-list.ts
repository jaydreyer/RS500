export type CopyableMemberRating = {
  album: {
    artist: string;
    title: string;
  };
  rating: number | null;
};

export function formatMemberRatingList(
  memberName: string,
  ratings: CopyableMemberRating[],
) {
  const ratedEntries = ratings.filter(
    (entry): entry is CopyableMemberRating & { rating: number } => entry.rating != null,
  );
  const heading = `Spin 500 ratings — ${memberName} (${ratedEntries.length})`;

  if (ratedEntries.length === 0) {
    return heading;
  }

  const lines = ratedEntries.map(
    ({ album, rating }) =>
      `${album.title} — ${album.artist} — ${formatCopiedRating(rating)}/10`,
  );

  return `${heading}\n\n${lines.join("\n")}`;
}

function formatCopiedRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
