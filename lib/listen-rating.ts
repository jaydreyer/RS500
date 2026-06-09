export type ListenStatus = "listening" | "rated";

export function mapStoredRating(status: ListenStatus, value: unknown) {
  if (status !== "rated" || typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}
