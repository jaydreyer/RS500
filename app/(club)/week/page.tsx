import { redirect } from "next/navigation";

import { WeekDrawMachine } from "@/components/week-draw-machine";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getWeekState } from "@/lib/draw";

export const dynamic = "force-dynamic";

export default async function WeekPage() {
  let weekState;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    weekState = await getWeekState(pb, user.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return <WeekDrawMachine weekState={weekState} />;
}
