import { redirect } from "next/navigation";

import { FeedbackHub, type FeedbackView } from "@/components/feedback-hub";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import {
  getFeedbackHubState,
  markFeedbackRead,
} from "@/lib/feedback";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let state;
  let user;
  let view: FeedbackView;

  try {
    const auth = await getAuthenticatedPocketBase();
    user = auth.user;
    const params = await searchParams;
    view = parseView(params.view);
    state = await getFeedbackHubState(auth.pb, user);

    if (view === "mine" && state.unreadCount > 0) {
      await markFeedbackRead(
        user,
        state.submissions
          .filter((submission) => submission.userUnread)
          .map((submission) => submission.id),
      );
    }

  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return <FeedbackHub isAdmin={user.isAdmin} state={state} view={view} />;
}

function parseView(value: string | string[] | undefined): FeedbackView {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "mine" || normalized === "new" ? normalized : "ideas";
}
