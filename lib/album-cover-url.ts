import { getPocketBaseUrl } from "@/lib/auth-session";

type AlbumRecord = {
  id: string;
  collectionId?: unknown;
  collectionName?: unknown;
  cover_image?: unknown;
  cover_url?: unknown;
};

export function getAlbumCoverUrl(record: AlbumRecord) {
  const filename = asString(record.cover_image);

  if (!filename) {
    return asString(record.cover_url);
  }

  const collection =
    asString(record.collectionName) || asString(record.collectionId) || "albums";
  const baseUrl = getPocketBaseUrl().replace(/\/$/, "");

  return `${baseUrl}/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(record.id)}/${encodeURIComponent(filename)}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
