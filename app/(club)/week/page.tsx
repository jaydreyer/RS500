import { redirect } from "next/navigation";

import { WeekDrawMachine } from "@/components/week-draw-machine";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getWeekState } from "@/lib/draw";
import { getUserGroupDrawState } from "@/lib/group-draw";

export const dynamic = "force-dynamic";

export default async function WeekPage() {
  let weekState;
  let groupDrawState;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    [weekState, groupDrawState] = await Promise.all([
      getWeekState(pb, user.id),
      getUserGroupDrawState(user.id),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return <WeekDrawMachine weekState={weekState} groupDrawState={groupDrawState} />;
}
