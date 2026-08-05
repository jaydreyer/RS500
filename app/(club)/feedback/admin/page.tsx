import { redirect } from "next/navigation";

import { FeedbackAdmin } from "@/components/feedback-admin";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getFeedbackAdminState } from "@/lib/feedback";
import { isGitHubFeedbackConfigured } from "@/lib/github-feedback";

export const dynamic = "force-dynamic";

export default async function FeedbackAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let selectedId;
  let state;

  try {
    const { user } = await getAuthenticatedPocketBase();
    if (!user.isAdmin) {
      redirect("/feedback");
    }

    const params = await searchParams;
    selectedId = getSingleParam(params.item);
    state = await getFeedbackAdminState(user);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return (
    <FeedbackAdmin
      githubConfigured={isGitHubFeedbackConfigured()}
      selectedId={selectedId}
      state={state}
    />
  );
}

function getSingleParam(value: string | string[] | undefined) {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected?.trim() || null;
}
