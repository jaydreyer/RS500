export const RATING_SCALE = {
  min: 1,
  max: 10,
  step: 0.1,
  precision: 1,
  label: "10-point decimal",
} as const;

export function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(RATING_SCALE.precision);
}

export const STATS_SAMPLE_THRESHOLD = 3;

export const CURRENT_WEEK_LABEL = "2026 W23";
