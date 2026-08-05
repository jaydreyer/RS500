import { getAuthenticatedPocketBase } from "@/lib/auth";
import {
  formatReviewsCsv,
  getReviewsCsvFilename,
  type ReviewCsvRow,
} from "@/lib/review-csv-export";

export const dynamic = "force-dynamic";

type RecordLike = {
  id: string;
  created?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function GET() {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const listens = await pb.collection("listens").getFullList({
      filter: pb.filter('user = {:user} && status = "rated"', { user: user.id }),
      expand: "album",
      sort: "rated_at,created",
      requestKey: null,
    });
    const rows = listens.map((listen) => mapReviewCsvRow(listen));

    return new Response(formatReviewsCsv(rows), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${getReviewsCsvFilename()}"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    throw error;
  }
}

function mapReviewCsvRow(record: RecordLike): ReviewCsvRow {
  const album = getExpandedRecord(record, "album");

  return {
    reviewedAt: asString(record.rated_at) || asString(record.created),
    rollingStoneRank: asNumber(album.rank),
    albumTitle: asString(album.title),
    artist: asString(album.artist),
    releaseYear: asNumber(album.year),
    rating: asNumber(record.rating),
    review: asString(record.take),
    listenType: record.kind === "skip" ? "skip" : "fresh",
    groupDraw: Boolean(asString(record.group_draw)),
  };
}

function getExpandedRecord(record: RecordLike, key: string): RecordLike {
  const expanded = record.expand?.[key];
  return expanded && typeof expanded === "object" ? (expanded as RecordLike) : { id: "" };
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
