import { redirect } from "next/navigation";

import { PickDrawMachine } from "@/components/pick-draw-machine";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getPickState } from "@/lib/draw";
import { getUserGroupDrawState } from "@/lib/group-draw";

export const dynamic = "force-dynamic";

export default async function PickPage() {
  let pickState;
  let groupDrawState;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    [pickState, groupDrawState] = await Promise.all([
      getPickState(pb, user.id),
      getUserGroupDrawState(user.id),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return <PickDrawMachine pickState={pickState} groupDrawState={groupDrawState} />;
}
