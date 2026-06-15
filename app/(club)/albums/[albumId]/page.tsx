import { ArrowLeft, ExternalLink, MessageSquareText, Music2, Newspaper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AlbumRatingPanel } from "@/components/album-rating-panel";
import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, Eyebrow, ScoreBadge } from "@/components/primitives";
import { ReviewMarkdown } from "@/components/review-markdown";
import { buttonVariants } from "@/components/ui/button";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getAlbumDetailState, type AlbumDetailListen, type AlbumReviewLink } from "@/lib/catalog";
import { RATING_SCALE } from "@/lib/config";
import { getAlbumFeedPosts, type FeedPost } from "@/lib/feed";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  let detail;
  let feedPosts: FeedPost[] = [];

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    [detail, feedPosts] = await Promise.all([
      getAlbumDetailState(pb, albumId, user.id),
      getAlbumFeedPosts({ pb, albumId }),
    ]);
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
            sizes="(max-width: 1024px) calc(100vw - 2rem), 340px"
            loading="eager"
            fetchPriority="high"
            className="cover-lift relative w-full rounded-md"
          />
          <div className="mt-3 grid grid-cols-2 border-y border-[var(--line-strong)] py-3">
            <div>
              <div className="tag">RS rank</div>
              <div className="mono mt-1 text-2xl font-bold text-[var(--ink)]">
                #{detail.album.rank}
              </div>
            </div>
            <div className="border-l border-[var(--line-strong)] pl-4">
              <div className="tag">Released</div>
              <div className="mono mt-1 text-2xl font-bold text-[var(--ink)]">
                {detail.album.year}
              </div>
            </div>
          </div>
          <ServiceLinks
            spotifyUrl={detail.album.spotifyUrl}
            appleMusicUrl={detail.album.appleMusicUrl}
            className="mt-4"
          />
          <ReviewLinks links={detail.album.reviewLinks} className="mt-3" />
        </div>

        <div className="min-w-0 py-1">
          <Eyebrow>rolling stone 500 / #{detail.album.rank}</Eyebrow>
          <h1 className="title-wrap mt-3 text-5xl md:text-7xl">{detail.album.title}</h1>
          <p className="mt-3 font-quote text-2xl text-[var(--ink-soft)]">
            {detail.album.artist}
          </p>

          <AlbumRatingPanel
            key={`${detail.myListen?.id ?? detail.album.id}-${detail.myListen?.ratedAt ?? "new"}`}
            albumId={detail.album.id}
            initialListen={detail.myListen}
          />

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
                <ClubAvatar
                  imageUrl={reaction.user.avatarUrl}
                  initials={reaction.user.initials}
                  label={reaction.user.displayName}
                  size="sm"
                />
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

      <section className="surface-panel mt-8 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl">
              <MessageSquareText className="size-5 text-[var(--accent)]" aria-hidden="true" />
              From The Feed
            </h2>
            <p className="tag mt-1">recent posts attached to this album</p>
          </div>
          <Link
            href="/feed"
            className="mono text-xs text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
          >
            Open The Feed
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {feedPosts.length === 0 && <p className="tag">No feed posts for this album yet</p>}
          {feedPosts.map((post) => (
            <AlbumFeedPost key={post.id} post={post} />
          ))}
        </div>
      </section>
    </section>
  );
}

function AlbumFeedPost({ post }: { post: FeedPost }) {
  return (
    <article className="rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] p-3">
      <div className="flex items-start gap-3">
        <ClubAvatar
          imageUrl={post.user.avatarUrl}
          initials={post.user.initials}
          label={post.user.displayName}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="font-display text-[var(--ink)]">{post.user.displayName}</strong>
            <span className="mono text-[11px] text-[var(--ink-faint)]">
              {formatFeedDate(post.created)}
            </span>
          </div>
          {post.body && (
            <p className="mt-1 whitespace-pre-wrap font-quote text-lg leading-snug text-[var(--ink-soft)]">
              {post.body}
            </p>
          )}
          <div className="tag mt-2 flex flex-wrap items-center gap-3">
            <span>{post.reactions.length} reactions</span>
            <span>{post.replies.length} replies</span>
          </div>
        </div>
        {post.imageUrl && (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--card)]">
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="80px"
              src={post.imageUrl}
              unoptimized
            />
          </div>
        )}
      </div>
    </article>
  );
}

function ListenRow({ listen }: { listen: AlbumDetailListen }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--line)] py-3 last:border-b-0">
      <ClubAvatar
        imageUrl={listen.user.avatarUrl}
        initials={listen.user.initials}
        label={listen.user.displayName}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display font-extrabold">{listen.user.displayName}</span>
          <span className="tag rounded-sm border border-[var(--line-strong)] px-1.5 py-0.5">
            {listen.kind === "skip" ? "already heard" : "fresh"}
          </span>
          <span className="tag">{listen.week}</span>
        </div>
        {listen.take && (
          <ReviewMarkdown className="mt-1 line-clamp-4 font-quote text-sm leading-relaxed text-[var(--ink-soft)]">
            {listen.take}
          </ReviewMarkdown>
        )}
      </div>
      <div className="shrink-0">
        {listen.status === "listening" ? (
          <span className="tag inline-flex items-center gap-1.5 text-[var(--accent)]">
            <span className="size-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot" />
            listening
          </span>
        ) : (
          <ScoreBadge score={listen.rating} label={`/${RATING_SCALE.max}`} emptyLabel="no score" />
        )}
      </div>
    </div>
  );
}

function ReviewLinks({ links, className }: { links: AlbumReviewLink[]; className?: string }) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className={cn("pressed-panel rounded-md p-3", className)}>
      <div className="tag mb-2 flex items-center gap-2 text-[var(--ink-soft)]">
        <Newspaper className="size-3.5" aria-hidden="true" />
        reviews and references
      </div>
      <div className="grid gap-1.5">
        {links.map((link) => (
          <a
            key={`${link.source}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-9 items-center justify-between gap-3 rounded-sm border border-[var(--line)] bg-[var(--card)] px-2.5 py-2 text-sm text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <span className="min-w-0 truncate font-display font-extrabold">{link.source}</span>
            <span className="inline-flex shrink-0 items-center gap-1">
              <span className="tag hidden text-[var(--ink-faint)] group-hover:text-[var(--accent)] sm:inline">
                {link.kind}
              </span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </span>
          </a>
        ))}
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
          rel="noopener noreferrer"
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

function formatFeedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function isNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 404
  );
}
