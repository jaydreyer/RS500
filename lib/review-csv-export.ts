export type ReviewCsvRow = {
  reviewedAt: string;
  rollingStoneRank: number;
  albumTitle: string;
  artist: string;
  releaseYear: number;
  rating: number;
  review: string;
  listenType: "fresh" | "skip";
  groupDraw: boolean;
};

const REVIEW_CSV_HEADERS = [
  "reviewed_at",
  "rolling_stone_rank",
  "album",
  "artist",
  "release_year",
  "rating",
  "rating_scale",
  "review",
  "listen_type",
  "group_draw",
] as const;

export function formatReviewsCsv(rows: ReviewCsvRow[]) {
  const records = [
    REVIEW_CSV_HEADERS,
    ...rows.map((row) => [
      row.reviewedAt,
      row.rollingStoneRank,
      row.albumTitle,
      row.artist,
      row.releaseYear,
      row.rating,
      10,
      row.review,
      row.listenType,
      row.groupDraw ? "yes" : "no",
    ]),
  ];

  return `\uFEFF${records
    .map((record) => record.map((value) => escapeCsvField(value)).join(","))
    .join("\r\n")}\r\n`;
}

export function getReviewsCsvFilename(now = new Date()) {
  const date = Number.isNaN(now.getTime()) ? "export" : now.toISOString().slice(0, 10);
  return `spin-500-reviews-${date}.csv`;
}

function escapeCsvField(value: string | number) {
  const text = protectSpreadsheetFormula(String(value));
  return `"${text.replaceAll('"', '""')}"`;
}

function protectSpreadsheetFormula(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
