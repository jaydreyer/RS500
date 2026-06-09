import { ArrowLeft, ExternalLink, Music2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, Eyebrow, ScoreBadge } from "@/components/primitives";
import { buttonVariants } from "@/components/ui/button";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getAlbumDetailState, type AlbumDetailListen } from "@/lib/catalog";
import { RATING_SCALE } from "@/lib/config";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  let detail;

  try {
    const { pb } = await getAuthenticatedPocketBase();
    detail = await getAlbumDetailState(pb, albumId);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  }

  return (
    <section className="mx-auto w-full max-w-[960px]">
      <Link
        href="/catalog"
        className="mono mb-5 inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to The 500
      </Link>

      <div className="hard-panel grid gap-7 overflow-hidden rounded-lg p-4 lg:grid-cols-[minmax(240px,340px)_1fr] lg:gap-10 lg:p-6">
        <div className="relative">
          <div className="record-ring absolute -left-16 top-10 hidden size-48 rounded-full opacity-25 lg:block" />
          <AlbumCover
            rank={detail.album.rank}
            src={detail.album.coverUrl}
            title={detail.album.title}
            className="cover-lift relative w-full rounded-md"
          />
          <ServiceLinks
            spotifyUrl={detail.album.spotifyUrl}
            appleMusicUrl={detail.album.appleMusicUrl}
            className="mt-4"
          />
          <p className="mono mt-3 text-center text-[11px] text-[var(--ink-faint)]">
            RS rank #{detail.album.rank} / {detail.album.year}
          </p>
        </div>

        <div className="min-w-0 py-1">
          <Eyebrow>rolling stone 500 / #{detail.album.rank}</Eyebrow>
          <h1 className="title-wrap mt-3 text-5xl md:text-7xl">{detail.album.title}</h1>
          <p className="mt-3 font-quote text-2xl text-[var(--ink-soft)]">
            {detail.album.artist}
          </p>

          <div className="my-7 grid gap-3 sm:grid-cols-3">
            <div className="pressed-panel rounded-md p-4">
              <div
                className={cn(
                  "font-display text-6xl font-extrabold leading-none",
                  detail.crewAverage != null && detail.crewAverage >= 8 && "text-[var(--good)]",
                )}
              >
                {detail.crewAverage == null ? "-" : detail.crewAverage.toFixed(1)}
              </div>
              <div className="tag mt-1">crew average</div>
            </div>
            <div className="pressed-panel rounded-md p-4">
              <div className="font-display text-4xl font-extrabold leading-none">
                {detail.ratedCount}
              </div>
              <div className="tag mt-1">rated count</div>
            </div>
            <div className="pressed-panel rounded-md p-4">
              <div className="font-display text-4xl font-extrabold leading-none">
                {detail.listens.length}
              </div>
              <div className="tag mt-1">crew logged it</div>
            </div>
          </div>

          <hr className="hairline" />
          <div className="mt-5">
            <Eyebrow>who drew it</Eyebrow>
            <div className="mt-3 grid gap-2">
              {detail.listens.length === 0 && <p className="tag py-4">Nobody in the crew has logged this yet</p>}
              {detail.listens.map((listen) => (
                <ListenRow key={listen.id} listen={listen} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="surface-panel mt-8 rounded-lg p-5">
        <h2 className="text-2xl">Crew thread</h2>
        <div className="mt-4 grid gap-3">
          {detail.reactions.filter((reaction) => reaction.comment || reaction.emoji).length === 0 && (
            <p className="tag">No comments or reactions yet</p>
          )}
          {detail.reactions
            .filter((reaction) => reaction.comment || reaction.emoji)
            .map((reaction) => (
              <div
                key={reaction.id}
                className="flex gap-3 rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] p-3"
              >
                <ClubAvatar initials={reaction.user.initials} size="sm" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-display text-[var(--ink)]">
                      {reaction.user.displayName}
                    </strong>
                    {reaction.emoji && (
                      <span className="mono rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[10px] text-[var(--ink-soft)]">
                        {reaction.emoji}
                      </span>
                    )}
                  </div>
                  {reaction.comment && (
                    <p className="mt-1 font-quote text-lg text-[var(--ink-soft)]">
                      {reaction.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>
    </section>
  );
}

function ListenRow({ listen }: { listen: AlbumDetailListen }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--line)] py-3 last:border-b-0">
      <ClubAvatar initials={listen.user.initials} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display font-extrabold">{listen.user.displayName}</span>
          <span className="tag rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
            {listen.kind === "skip" ? "heard" : "fresh"}
          </span>
          <span className="tag">{listen.week}</span>
        </div>
        {listen.take && (
          <p className="mt-1 line-clamp-2 font-quote text-sm italic text-[var(--ink-soft)]">
            &quot;{listen.take}&quot;
          </p>
        )}
      </div>
      <div className="shrink-0">
        {listen.status === "listening" ? (
          <span className="tag inline-flex items-center gap-1.5 text-[var(--accent)]">
            <span className="size-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot" />
            listening
          </span>
        ) : (
          <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} />
        )}
      </div>
    </div>
  );
}

function ServiceLinks({
  spotifyUrl,
  appleMusicUrl,
  className,
}: {
  spotifyUrl: string;
  appleMusicUrl: string;
  className?: string;
}) {
  const links = [
    spotifyUrl ? { href: spotifyUrl, label: getSpotifyLinkLabel(spotifyUrl) } : null,
    appleMusicUrl ? { href: appleMusicUrl, label: "Play on Apple Music" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  if (links.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {links.map((link, index) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: index === 0 ? "accent" : "ghost" }),
            "w-full",
          )}
        >
          <Music2 className="size-4" aria-hidden="true" />
          {link.label}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function getSpotifyLinkLabel(spotifyUrl: string) {
  return spotifyUrl.includes("open.spotify.com/search/") ? "Find on Spotify" : "Play on Spotify";
}

function isNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 404
  );
}
