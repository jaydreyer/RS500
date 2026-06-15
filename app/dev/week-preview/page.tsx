import { notFound } from "next/navigation";

import { WeekDrawMachine } from "@/components/week-draw-machine";
import type { WeekState } from "@/lib/draw";
import type { UserGroupDrawState } from "@/lib/group-draw-types";

export const dynamic = "force-dynamic";

export default async function DevWeekPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { state } = await searchParams;
  const weekState = state === "empty" ? emptyWeekState : activePickWeekState;

  return <WeekDrawMachine weekState={weekState} groupDrawState={emptyGroupDrawState} />;
}

const activePickWeekState: WeekState = {
  activeFresh: {
    id: "preview-listen-1",
    albumId: "preview-album-163",
    kind: "fresh",
    status: "listening",
    rating: null,
    take: "",
    week: "2026 W23",
    ratedAt: null,
    created: "2026-06-15T00:00:00.000Z",
    album: {
      id: "preview-album-163",
      rank: 163,
      title: "Saturday Night Fever: The Original Movie Sound Track",
      artist: "Various Artists",
      year: 1977,
      coverUrl:
        "https://coverartarchive.org/release-group/6e9a06a8-c8bb-3ea9-877a-417e74bb1c2e/front-500",
      spotifyUrl: "https://open.spotify.com/album/6kFmH2VMMFaUrK4QhY4hLi",
      appleMusicUrl: "https://music.apple.com/us/album/saturday-night-fever/1490428890",
    },
  },
  freshCount: 4,
  skipCount: 1,
  poolLeft: 495,
  totalAlbums: 500,
  weekKey: "2026 W23",
};

const emptyWeekState: WeekState = {
  ...activePickWeekState,
  activeFresh: null,
};

const emptyGroupDrawState: UserGroupDrawState = {
  weekKey: "2026 W23",
  groups: [],
};
