import { AppShell } from "@/components/app-shell";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getFeedUnreadCount } from "@/lib/feed";
import { getFeedbackUnreadCount } from "@/lib/feedback";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let auth;

  try {
    auth = await getAuthenticatedPocketBase();
  } catch {
    redirect("/auth");
  }

  const [feedUnreadCount, feedbackUnreadCount] = await Promise.all([
    getFeedUnreadCount(auth.pb, auth.user.id),
    getFeedbackUnreadCount(auth.pb, auth.user.id),
  ]);

  return (
    <AppShell
      user={auth.user}
      feedUnreadCount={feedUnreadCount}
      feedbackUnreadCount={feedbackUnreadCount}
    >
      {children}
    </AppShell>
  );
}
