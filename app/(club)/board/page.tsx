import { redirect } from "next/navigation";

import { BoardClient } from "@/components/board-client";
import { getAuthenticatedPocketBase, getPocketBaseUrl } from "@/lib/auth";
import { getBoardState } from "@/lib/board";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  let boardState;
  let authToken;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    boardState = await getBoardState(pb, user);
    authToken = pb.authStore.token;
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return (
    <BoardClient initialState={boardState} pbUrl={getPocketBaseUrl()} authToken={authToken} />
  );
}
