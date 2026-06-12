import { NextResponse } from "next/server";

import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getFeedUnreadCount } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    const unreadCount = await getFeedUnreadCount(pb, user.id);

    return NextResponse.json({ unreadCount });
  } catch {
    return NextResponse.json({ unreadCount: 0 }, { status: 401 });
  }
}
