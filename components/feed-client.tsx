"use client";

import {
  type KeyboardEvent,
  type RefObject,
  useActionState,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Disc3,
  ImagePlus,
  Link2,
  MessageCircle,
  Music2,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  createFeedPostAction,
  createFeedReplyAction,
  deleteFeedPostAction,
  deleteFeedReplyAction,
  toggleFeedReactionAction,
  type FeedPostActionState,
} from "@/app/(club)/feed/actions";
import { AlbumCover } from "@/components/album-cover";
import { ClubAvatar, Eyebrow } from "@/components/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  FeedAlbum,
  FeedCurrentListen,
  FeedMentionMember,
  FeedPost,
  FeedState,
} from "@/lib/feed";

const INITIAL_POST_STATE: FeedPostActionState = {
  status: "idle",
  message: null,
};

const QUICK_REACTIONS = [
  { key: "heart", emoji: "❤️", label: "Love" },
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "100", emoji: "💯", label: "One hundred" },
  { key: "wow", emoji: "🤯", label: "Mind blown" },
  { key: "needle", emoji: "📍", label: "Pinned" },
] as const;

export function FeedClient({ state }: { state: FeedState }) {
  const attachedCount = state.posts.filter((post) => post.album).length;
  const photoCount = state.posts.filter((post) => post.imageUrl).length;

  return (
    <section className="mx-auto w-full max-w-[1120px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow>LIVE / THE CLUB</Eyebrow>
          <h1 className="title-wrap mt-3 text-5xl md:text-7xl">The Feed</h1>
        </div>
        <div className="pressed-panel flex flex-wrap gap-4 rounded-lg px-4 py-3">
          <Stat label="posts" value={state.posts.length} />
          <Stat label="albums" value={attachedCount} accent />
          <Stat label="photos" value={photoCount} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid min-w-0 gap-4">
          <FeedComposer
            albums={state.albums}
            currentListens={state.currentListens}
            members={state.members}
          />

          {state.posts.length === 0 ? (
            <div className="pressed-panel rounded-lg p-6 text-center">
              <p className="tag">No posts yet</p>
            </div>
          ) : (
            state.posts.map((post) => (
              <FeedPostCard
                key={`${post.id}-${post.updated}-${post.replies.length}-${post.reactions.length}`}
                currentUserId={state.currentUser.id}
                members={state.members}
                post={post}
              />
            ))
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="surface-panel sticky top-24 rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2">
              <Music2 className="size-4 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="text-2xl">Recent Spins</h2>
            </div>
            <div className="grid gap-2">
              {state.posts
                .filter((post) => post.album)
                .slice(0, 5)
                .map((post) => (
                  <Link
                    key={post.id}
                    href={`/albums/${post.album?.id}`}
                    className="group grid grid-cols-[42px_1fr] gap-3 rounded-md border border-[var(--line)] bg-[var(--paper-2)] p-2 transition-colors hover:border-[var(--accent)]"
                  >
                    {post.album && (
                      <>
                        <AlbumCover
                          rank={post.album.rank}
                          src={post.album.coverUrl}
                          title={post.album.title}
                          className="rounded-sm"
                        />
                        <span className="min-w-0">
                          <span className="mono block text-[10px] text-[var(--ink-faint)]">
                            #{post.album.rank}
                          </span>
                          <span className="title-wrap block font-display text-sm font-extrabold leading-tight group-hover:text-[var(--accent)]">
                            {post.album.title}
                          </span>
                          <span className="block truncate text-xs text-[var(--ink-soft)]">
                            {post.album.artist}
                          </span>
                        </span>
                      </>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function FeedComposer({
  albums,
  currentListens,
  members,
}: {
  albums: FeedAlbum[];
  currentListens: FeedCurrentListen[];
  members: FeedMentionMember[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);
  const [body, setBody] = useState("");
  const [selectedAlbumId, setSelectedAlbumId] = useState("");

  async function postAction(previousState: FeedPostActionState, formData: FormData) {
    const result = await createFeedPostAction(previousState, formData);

    if (result.status === "success") {
      formRef.current?.reset();
      setBody("");
      setSelectedAlbumId("");
      setResetKey((key) => key + 1);
    }

    return result;
  }

  const [state, formAction, isPending] = useActionState(
    postAction,
    INITIAL_POST_STATE,
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="hard-panel rounded-lg"
    >
      {currentListens.length > 0 && (
        <CurrentListeningShare
          currentListens={currentListens}
          onUse={(listen) => {
            setSelectedAlbumId(listen.album.id);
            setBody(`Listening to ${getAlbumPickerLabel(listen.album)}.`);
            setResetKey((key) => key + 1);
          }}
        />
      )}
      <div className="flex gap-3 p-4">
        <ClubAvatar initials="TF" label="The Feed" size="md" />
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Post</span>
          <MentionTextarea
            className="input-control min-h-28 resize-y border-0 bg-transparent p-0 text-xl leading-snug shadow-none focus:shadow-none"
            maxLength={560}
            members={members}
            name="body"
            onValueChange={setBody}
            placeholder="Post to The Feed"
            value={body}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
        <label
          htmlFor="feed-image"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "cursor-pointer")}
          title="Add picture"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Picture
        </label>
        <input
          id="feed-image"
          className="sr-only"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
        />

        <AlbumAttachPicker
          key={resetKey}
          albums={albums}
          selectedAlbumId={selectedAlbumId}
          onSelectedAlbumIdChange={setSelectedAlbumId}
        />

        <Button type="submit" variant="accent" disabled={isPending}>
          <Send className="size-4" aria-hidden="true" />
          {isPending ? "Posting" : "Post"}
        </Button>
        {state.message && (
          <p
            className={cn(
              "basis-full text-sm",
              state.status === "error" ? "text-[var(--accent)]" : "text-[var(--good)]",
            )}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function CurrentListeningShare({
  currentListens,
  onUse,
}: {
  currentListens: FeedCurrentListen[];
  onUse: (listen: FeedCurrentListen) => void;
}) {
  return (
    <div className="border-b border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Disc3 className="size-4 text-[var(--accent)]" aria-hidden="true" />
        <span className="tag text-[var(--ink-soft)]">now listening</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {currentListens.slice(0, 4).map((listen) => (
          <button
            key={listen.id}
            type="button"
            className="grid min-w-[240px] grid-cols-[44px_1fr] items-center gap-3 rounded-md border border-[var(--line-strong)] bg-[var(--card)] p-2 text-left transition-colors hover:border-[var(--accent)]"
            onClick={() => onUse(listen)}
          >
            <AlbumCover
              rank={listen.album.rank}
              src={listen.album.coverUrl}
              title={listen.album.title}
              className="rounded-sm"
            />
            <span className="min-w-0">
              <span className="mono block text-[10px] text-[var(--ink-faint)]">
                use in post / #{listen.album.rank}
              </span>
              <span className="title-wrap block font-display text-sm font-extrabold leading-tight text-[var(--ink)]">
                {listen.album.title}
              </span>
              <span className="block truncate text-xs text-[var(--ink-soft)]">
                {listen.album.artist}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AlbumAttachPicker({
  albums,
  selectedAlbumId,
  onSelectedAlbumIdChange,
}: {
  albums: FeedAlbum[];
  selectedAlbumId: string;
  onSelectedAlbumIdChange: (albumId: string) => void;
}) {
  const initialAlbum = albums.find((album) => album.id === selectedAlbumId) ?? null;
  const [query, setQuery] = useState(initialAlbum ? getAlbumPickerLabel(initialAlbum) : "");
  const [open, setOpen] = useState(false);
  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId) ?? null;
  const normalizedQuery = normalizeAlbumSearch(query);
  const matches = useMemo(() => {
    if (!normalizedQuery) {
      return albums.slice(0, 8);
    }

    return albums
      .filter((album) => normalizeAlbumSearch(getAlbumSearchText(album)).includes(normalizedQuery))
      .slice(0, 8);
  }, [albums, normalizedQuery]);

  function selectAlbum(album: FeedAlbum) {
    onSelectedAlbumIdChange(album.id);
    setQuery(getAlbumPickerLabel(album));
    setOpen(false);
  }

  function clearAlbum() {
    onSelectedAlbumIdChange("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative min-w-full flex-1 sm:min-w-[280px]">
      <input type="hidden" name="albumId" value={selectedAlbumId} />
      <label className="flex items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-3 py-1.5 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_18%,transparent)]">
        <Link2 className="size-4 shrink-0 text-[var(--ink-faint)]" aria-hidden="true" />
        <span className="sr-only">Attach album</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
          onChange={(event) => {
            setQuery(event.target.value);
            onSelectedAlbumIdChange("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search albums"
          value={query}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear attached album"
            title="Clear attached album"
            className="grid size-6 shrink-0 place-items-center rounded-full text-[var(--ink-faint)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            onClick={clearAlbum}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <Search className="size-4 shrink-0 text-[var(--ink-faint)]" aria-hidden="true" />
        )}
      </label>

      {selectedAlbum && !open && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-[color-mix(in_srgb,var(--accent)_45%,var(--line-strong))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-2">
          <span className="min-w-0">
            <span className="tag block text-[var(--accent)]">attached</span>
            <span className="block truncate text-sm font-bold text-[var(--ink)]">
              #{selectedAlbum.rank} {selectedAlbum.title} / {selectedAlbum.artist}
            </span>
          </span>
          <button
            type="button"
            aria-label="Clear attached album"
            title="Clear attached album"
            className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            onClick={clearAlbum}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {open && (
        <div className="mt-2 overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--card)] shadow-[0_18px_44px_-24px_#000]">
          {matches.length === 0 ? (
            <p className="tag px-3 py-3">No albums found</p>
          ) : (
            <div className="max-h-72 overflow-auto py-1">
              {matches.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className={cn(
                    "grid w-full grid-cols-[48px_1fr] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--paper-2)]",
                    album.id === selectedAlbum?.id && "bg-[var(--paper-2)]",
                  )}
                  onClick={() => {
                    selectAlbum(album);
                  }}
                >
                  <AlbumCover
                    rank={album.rank}
                    src={album.coverUrl}
                    title={album.title}
                    className="rounded-sm"
                  />
                  <span className="min-w-0">
                    <span className="mono block text-[10px] text-[var(--ink-faint)]">
                      #{album.rank} / {album.year}
                    </span>
                    <span className="title-wrap block font-display text-sm font-extrabold leading-tight text-[var(--ink)]">
                      {album.title}
                    </span>
                    <span className="block truncate text-xs text-[var(--ink-soft)]">
                      {album.artist}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedPostCard({
  currentUserId,
  members,
  post,
}: {
  currentUserId: string;
  members: FeedMentionMember[];
  post: FeedPost;
}) {
  const isMine = post.userId === currentUserId;

  return (
    <article className="surface-panel overflow-hidden rounded-lg">
      <div className="flex items-start gap-3 p-4">
        <ClubAvatar
          imageUrl={post.user.avatarUrl}
          initials={post.user.initials}
          label={post.user.displayName}
          ring={isMine}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="font-display text-lg leading-none text-[var(--ink)]">
              {isMine ? "You" : post.user.displayName}
            </strong>
            <span className="mono text-xs text-[var(--ink-faint)]">
              {formatTime(post.created)}
            </span>
            {post.album && <AlbumChip album={post.album} />}
          </div>
          {post.body && (
            <p className="mt-3 whitespace-pre-wrap font-quote text-xl leading-snug text-[var(--ink)]">
              <MentionText value={post.body} />
            </p>
          )}
        </div>
        {isMine && (
          <form action={deleteFeedPostAction}>
            <input type="hidden" name="postId" value={post.id} />
            <Button
              type="submit"
              variant="quiet"
              size="icon"
              className="size-8 px-0"
              aria-label="Delete post"
              title="Delete post"
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
        )}
      </div>

      {post.imageUrl && (
        <div className="px-4 pb-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] sm:aspect-[16/10]">
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 760px, 100vw"
              src={post.imageUrl}
              unoptimized
            />
          </div>
        </div>
      )}

      <div className="border-t border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <ReactionForms
            currentUserId={currentUserId}
            postId={post.id}
            reactions={post.reactions}
          />
          <span className="tag inline-flex items-center gap-1.5">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            {post.replies.length}
          </span>
        </div>

        {post.replies.length > 0 && (
          <div className="mb-3 grid gap-2">
            {post.replies.map((reply) => (
              <div
                key={reply.id}
                className="flex items-start gap-2 rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--card)] p-2"
              >
                <ClubAvatar
                  imageUrl={reply.user.avatarUrl}
                  initials={reply.user.initials}
                  label={reply.user.displayName}
                  size="sm"
                />
                <p className="min-w-0 flex-1 text-sm leading-snug text-[var(--ink-soft)]">
                  <strong className="text-[var(--ink)]">
                    {reply.userId === currentUserId ? "You" : reply.user.displayName}
                  </strong>{" "}
                  <MentionText value={reply.body} />
                </p>
                {reply.userId === currentUserId && (
                  <form action={deleteFeedReplyAction}>
                    <input type="hidden" name="replyId" value={reply.id} />
                    <Button
                      type="submit"
                      variant="quiet"
                      size="icon"
                      className="size-7 px-0"
                      aria-label="Delete reply"
                      title="Delete reply"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        <ReplyForm members={members} postId={post.id} />
      </div>
    </article>
  );
}

function ReplyForm({
  members,
  postId,
}: {
  members: FeedMentionMember[];
  postId: string;
}) {
  const [body, setBody] = useState("");

  async function replyAction(formData: FormData) {
    await createFeedReplyAction(formData);
    setBody("");
  }

  return (
    <form action={replyAction} className="flex items-center gap-2">
      <input type="hidden" name="postId" value={postId} />
      <label className="sr-only" htmlFor={`reply-${postId}`}>
        Reply
      </label>
      <div className="relative flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--card)] px-3 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_18%,transparent)]">
        <MessageCircle className="size-4 shrink-0 text-[var(--ink-faint)]" aria-hidden="true" />
        <MentionInput
          id={`reply-${postId}`}
          name="body"
          maxLength={280}
          members={members}
          menuPlacement="top"
          onValueChange={setBody}
          placeholder="Reply"
          value={body}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
        />
      </div>
      <Button
        type="submit"
        aria-label="Post reply"
        title="Post reply"
        size="icon"
        variant="quiet"
        className="size-10 px-0"
      >
        <Send className="size-4" />
      </Button>
    </form>
  );
}

type MentionEditorElement = HTMLInputElement | HTMLTextAreaElement;
type MentionMenuPlacement = "top" | "bottom";

function MentionTextarea({
  className,
  maxLength,
  members,
  name,
  onValueChange,
  placeholder,
  value,
}: {
  className?: string;
  maxLength: number;
  members: FeedMentionMember[];
  name: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionEditor({
    inputRef: ref,
    maxLength,
    members,
    onValueChange,
    value,
  });

  return (
    <>
      <textarea
        ref={ref}
        className={className}
        maxLength={maxLength}
        name={name}
        onChange={(event) => mention.handleChange(event.currentTarget)}
        onKeyDown={mention.handleKeyDown}
        onSelect={(event) => mention.updateCaret(event.currentTarget)}
        placeholder={placeholder}
        value={value}
      />
      <MentionSuggestions
        activeIndex={mention.activeIndex}
        members={mention.matches}
        onActiveIndexChange={mention.setActiveIndex}
        onPick={mention.pickMember}
        open={mention.open}
        placement="bottom"
      />
    </>
  );
}

function MentionInput({
  className,
  id,
  maxLength,
  members,
  menuPlacement,
  name,
  onValueChange,
  placeholder,
  value,
}: {
  className?: string;
  id: string;
  maxLength: number;
  members: FeedMentionMember[];
  menuPlacement: MentionMenuPlacement;
  name: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const mention = useMentionEditor({
    inputRef: ref,
    maxLength,
    members,
    onValueChange,
    value,
  });

  return (
    <>
      <input
        ref={ref}
        id={id}
        name={name}
        maxLength={maxLength}
        placeholder={placeholder}
        className={className}
        onChange={(event) => mention.handleChange(event.currentTarget)}
        onKeyDown={mention.handleKeyDown}
        onSelect={(event) => mention.updateCaret(event.currentTarget)}
        value={value}
      />
      <MentionSuggestions
        activeIndex={mention.activeIndex}
        members={mention.matches}
        onActiveIndexChange={mention.setActiveIndex}
        onPick={mention.pickMember}
        open={mention.open}
        placement={menuPlacement}
      />
    </>
  );
}

function useMentionEditor<TElement extends MentionEditorElement>({
  inputRef,
  maxLength,
  members,
  onValueChange,
  value,
}: {
  inputRef: RefObject<TElement | null>;
  maxLength: number;
  members: FeedMentionMember[];
  onValueChange: (value: string) => void;
  value: string;
}) {
  const [caret, setCaret] = useState(value.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMention = getActiveMention(value, caret);
  const matches = useMemo(
    () => getMentionMatches(members, activeMention?.query ?? ""),
    [activeMention?.query, members],
  );
  const open = Boolean(activeMention && matches.length > 0);
  const boundedActiveIndex = open ? Math.min(activeIndex, matches.length - 1) : 0;

  function updateCaret(element: MentionEditorElement) {
    setCaret(element.selectionStart ?? element.value.length);
  }

  function handleChange(element: MentionEditorElement) {
    onValueChange(element.value);
    setCaret(element.selectionStart ?? element.value.length);
    setActiveIndex(0);
  }

  function pickMember(member: FeedMentionMember) {
    if (!activeMention) {
      return;
    }

    const insertedMention = `@${member.mentionHandle} `;
    const nextValue = [
      value.slice(0, activeMention.start),
      insertedMention,
      value.slice(activeMention.end),
    ]
      .join("")
      .slice(0, maxLength);
    const nextCaret = Math.min(activeMention.start + insertedMention.length, nextValue.length);

    onValueChange(nextValue);
    setCaret(nextCaret);
    setActiveIndex(0);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handleKeyDown(event: KeyboardEvent<TElement>) {
    if (!open) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % matches.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      pickMember(matches[boundedActiveIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setCaret(0);
    }
  }

  return {
    activeIndex: boundedActiveIndex,
    handleChange,
    handleKeyDown,
    matches,
    open,
    pickMember,
    setActiveIndex,
    updateCaret,
  };
}

function MentionSuggestions({
  activeIndex,
  members,
  onActiveIndexChange,
  onPick,
  open,
  placement,
}: {
  activeIndex: number;
  members: FeedMentionMember[];
  onActiveIndexChange: (index: number) => void;
  onPick: (member: FeedMentionMember) => void;
  open: boolean;
  placement: MentionMenuPlacement;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute left-0 right-0 z-30 overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--card)] shadow-[0_18px_44px_-24px_#000]",
        placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
      )}
      role="listbox"
    >
      <div className="max-h-64 overflow-auto py-1">
        {members.map((member, index) => (
          <button
            key={member.id}
            type="button"
            className={cn(
              "grid w-full grid-cols-[32px_1fr_auto] items-center gap-2 px-3 py-2 text-left transition-colors",
              index === activeIndex
                ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                : "hover:bg-[var(--paper-2)]",
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(member);
            }}
            onMouseEnter={() => onActiveIndexChange(index)}
            role="option"
            aria-selected={index === activeIndex}
          >
            <ClubAvatar
              imageUrl={member.avatarUrl}
              initials={member.initials}
              label={member.displayName}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[var(--ink)]">
                {member.displayName}
              </span>
              <span className="mono block text-[10px] text-[var(--ink-faint)]">
                @{member.mentionHandle}
              </span>
            </span>
            <span className="mono text-[10px] text-[var(--accent)]">mention</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getActiveMention(value: string, caret: number) {
  const beforeCaret = value.slice(0, caret);
  const start = beforeCaret.lastIndexOf("@");

  if (start < 0) {
    return null;
  }

  const prefix = start > 0 ? beforeCaret[start - 1] : "";
  const query = beforeCaret.slice(start + 1);

  if (prefix && /[\p{L}\p{N}_]/u.test(prefix)) {
    return null;
  }

  if (/[^\p{L}\p{N}._-]/u.test(query)) {
    return null;
  }

  return {
    start,
    end: caret,
    query,
  };
}

function getMentionMatches(members: FeedMentionMember[], query: string) {
  const normalizedQuery = normalizeMentionSearch(query);

  return members
    .filter((member) => {
      if (!normalizedQuery) {
        return true;
      }

      return normalizeMentionSearch(
        `${member.displayName} ${member.mentionHandle}`,
      ).includes(normalizedQuery);
    })
    .slice(0, 6);
}

function ReactionForms({
  currentUserId,
  postId,
  reactions,
}: {
  currentUserId: string;
  postId: string;
  reactions: FeedPost["reactions"];
}) {
  const grouped = useMemo(
    () =>
      QUICK_REACTIONS.map((reaction) => ({
        ...reaction,
        count: reactions.filter((entry) => entry.emoji === reaction.key).length,
        active: reactions.some(
          (entry) => entry.emoji === reaction.key && entry.userId === currentUserId,
        ),
      })),
    [currentUserId, reactions],
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {grouped.map((reaction) => (
        <form key={reaction.key} action={toggleFeedReactionAction}>
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="emoji" value={reaction.key} />
          <button
            type="submit"
            title={reaction.label}
            aria-label={`React ${reaction.emoji} ${reaction.label}`}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm leading-none transition-colors",
              reaction.active
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                : "border-[var(--line-strong)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
          >
            <span>{reaction.emoji}</span>
            {reaction.count > 0 && <span className="mono text-[10px]">{reaction.count}</span>}
          </button>
        </form>
      ))}
    </div>
  );
}

function AlbumChip({ album }: { album: FeedAlbum }) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="mono inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--paper-2)] px-2 py-1 text-[10px] text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      <Music2 className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">
        #{album.rank} {album.title}
      </span>
    </Link>
  );
}

function MentionText({ value }: { value: string }) {
  const pieces = value.split(/(@[\w.-]+)/g);

  return (
    <>
      {pieces.map((piece, index) =>
        piece.startsWith("@") ? (
          <span key={`${piece}-${index}`} className="text-[var(--accent)]">
            {piece}
          </span>
        ) : (
          piece
        ),
      )}
    </>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="min-w-16 text-right">
      <div
        className={cn(
          "font-display text-3xl font-extrabold leading-none",
          accent && "text-[var(--accent)]",
        )}
      >
        {value}
      </div>
      <div className="tag mt-1">{label}</div>
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getAlbumPickerLabel(album: FeedAlbum) {
  return `#${album.rank} - ${album.title} / ${album.artist}`;
}

function getAlbumSearchText(album: FeedAlbum) {
  return `${album.rank} ${album.title} ${album.artist} ${album.year}`;
}

function normalizeAlbumSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeMentionSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase()
    .trim();
}
