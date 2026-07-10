import type { ListenSummary } from "@/lib/draw";

export type PickActionState = {
  status: "idle" | "success" | "error" | "unauthorized";
  message: string | null;
  listen: ListenSummary | null;
};

export const initialPickActionState: PickActionState = {
  status: "idle",
  message: null,
  listen: null,
};

export type GroupDrawActionState = {
  status: "idle" | "success" | "error" | "unauthorized";
  message: string | null;
};

export const initialGroupDrawActionState: GroupDrawActionState = {
  status: "idle",
  message: null,
};
