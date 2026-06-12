import { redirect } from "next/navigation";

import { FeedClient } from "@/components/feed-client";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getFeedState, markFeedRead } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  let feedState;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    feedState = await getFeedState(pb, user);
    await markFeedRead(pb, user.id, feedState.posts[0]?.created);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return <FeedClient state={feedState} />;
}
