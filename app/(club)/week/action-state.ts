import type { ListenSummary } from "@/lib/draw";

export type WeekActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  listen: ListenSummary | null;
};

export const initialWeekActionState: WeekActionState = {
  status: "idle",
  message: null,
  listen: null,
};
