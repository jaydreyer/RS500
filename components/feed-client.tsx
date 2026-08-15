"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useActionState,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ChevronRight,
  Disc3,
  ImagePlus,
  Link2,
  MessageCircle,
  Music2,
  Search,
  Send,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Markdown from "react-markdown";

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
import { ReviewMarkdownToolbar } from "@/components/review-textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  applyReviewMarkdownFormat,
  type ReviewMarkdownFormat,
} from "@/lib/review-markdown-formatting";
import { shouldShowFeedAlbumCard } from "@/lib/feed-album-card";
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

const FEED_IMAGE_MAX_SIZE = 8 * 1024 * 1024;
const FEED_IMAGE_SAFE_UPLOAD_SIZE = 4 * 1024 * 1024;
const FEED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const FEED_COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const QUICK_REACTIONS = [
  { key: "heart", emoji: "❤️", label: "Love" },
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "100", emoji: "💯", label: "One hundred" },
  { key: "wow", emoji: "🤯", label: "Mind blown" },
  { key: "needle", emoji: "📍", label: "Pinned" },
] as const;

const QUICK_REACTION_KEYS: ReadonlySet<string> = new Set(
  QUICK_REACTIONS.map((reaction) => reaction.key),
);
const FEED_ALLOWED_MARKDOWN = ["p", "strong", "em", "br"] as const;

type ExtraReaction = {
  emoji: string;
  label: string;
};

type ExtraReactionGroup = {
  key: string;
  icon: string;
  label: string;
  reactions: readonly ExtraReaction[];
};

const EXTRA_REACTION_GROUPS = [
  {
    key: "faces",
    icon: "😀",
    label: "Faces",
    reactions: [
      { emoji: "😀", label: "Grinning" },
      { emoji: "😄", label: "Big grin" },
      { emoji: "😁", label: "Beaming" },
      { emoji: "😆", label: "Laughing hard" },
      { emoji: "😂", label: "Laughing" },
      { emoji: "🤣", label: "Cracking up" },
      { emoji: "😊", label: "Smiling" },
      { emoji: "😅", label: "Nervous laugh" },
      { emoji: "😇", label: "Angel" },
      { emoji: "🙂", label: "Slight smile" },
      { emoji: "🙃", label: "Upside down" },
      { emoji: "😉", label: "Wink" },
      { emoji: "😍", label: "Adore" },
      { emoji: "🥰", label: "Warm fuzzies" },
      { emoji: "😘", label: "Kiss" },
      { emoji: "😜", label: "Wink tongue" },
      { emoji: "🤪", label: "Zany" },
      { emoji: "😋", label: "Tasty" },
      { emoji: "😎", label: "Cool" },
      { emoji: "🤓", label: "Nerdy" },
      { emoji: "🧐", label: "Inspecting" },
      { emoji: "🤔", label: "Thinking" },
      { emoji: "🤨", label: "Skeptical" },
      { emoji: "😐", label: "Neutral" },
      { emoji: "😑", label: "Expressionless" },
      { emoji: "😶", label: "Speechless" },
      { emoji: "😏", label: "Smirk" },
      { emoji: "😒", label: "Unamused" },
      { emoji: "🙄", label: "Eye roll" },
      { emoji: "😬", label: "Yikes" },
      { emoji: "😮", label: "Surprised" },
      { emoji: "😲", label: "Astonished" },
      { emoji: "😳", label: "Flushed" },
      { emoji: "🥺", label: "Pleading" },
      { emoji: "😢", label: "Sad" },
      { emoji: "😭", label: "Crying" },
      { emoji: "😡", label: "Angry" },
      { emoji: "😤", label: "Huffing" },
      { emoji: "🤮", label: "Nauseated" },
      { emoji: "😈", label: "Mischievous" },
      { emoji: "🤡", label: "Clown" },
      { emoji: "😵", label: "Dizzy face" },
      { emoji: "🥴", label: "Woozy" },
      { emoji: "🫠", label: "Melting" },
      { emoji: "🫡", label: "Salute" },
      { emoji: "😴", label: "Sleepy" },
      { emoji: "🥱", label: "Yawning" },
      { emoji: "🤐", label: "Zipped lips" },
    ],
  },
  {
    key: "hands",
    icon: "👏",
    label: "Hands",
    reactions: [
      { emoji: "👏", label: "Applause" },
      { emoji: "🙌", label: "Raised hands" },
      { emoji: "🙏", label: "Thanks" },
      { emoji: "👍", label: "Thumbs up" },
      { emoji: "👎", label: "Thumbs down" },
      { emoji: "👊", label: "Fist bump" },
      { emoji: "✊", label: "Raised fist" },
      { emoji: "🤛", label: "Left fist" },
      { emoji: "🤜", label: "Right fist" },
      { emoji: "🤝", label: "Handshake" },
      { emoji: "🤞", label: "Fingers crossed" },
      { emoji: "✌️", label: "Peace" },
      { emoji: "🤟", label: "Love you" },
      { emoji: "🤘", label: "Rock on" },
      { emoji: "👌", label: "OK hand" },
      { emoji: "🤌", label: "Chef kiss" },
      { emoji: "👋", label: "Wave" },
      { emoji: "🤙", label: "Call me" },
      { emoji: "👈", label: "Point left" },
      { emoji: "👉", label: "Point right" },
      { emoji: "👆", label: "Point up" },
      { emoji: "👇", label: "Point down" },
      { emoji: "🫵", label: "Point at you" },
      { emoji: "✍️", label: "Writing" },
      { emoji: "💪", label: "Strong" },
      { emoji: "🫶", label: "Heart hands" },
    ],
  },
  {
    key: "music",
    icon: "🎧",
    label: "Music",
    reactions: [
      { emoji: "🎧", label: "Headphones" },
      { emoji: "🎤", label: "Microphone" },
      { emoji: "🎙️", label: "Studio mic" },
      { emoji: "🎸", label: "Guitar" },
      { emoji: "🥁", label: "Drums" },
      { emoji: "🎹", label: "Keyboard" },
      { emoji: "🎺", label: "Trumpet" },
      { emoji: "🎷", label: "Saxophone" },
      { emoji: "🎻", label: "Violin" },
      { emoji: "🪕", label: "Banjo" },
      { emoji: "🪘", label: "Long drum" },
      { emoji: "🎶", label: "Music notes" },
      { emoji: "🎵", label: "Music note" },
      { emoji: "🎼", label: "Score" },
      { emoji: "💿", label: "Disc" },
      { emoji: "📀", label: "DVD" },
      { emoji: "📻", label: "Radio" },
      { emoji: "🎚️", label: "Level slider" },
      { emoji: "🎛️", label: "Control knobs" },
      { emoji: "🪩", label: "Disco ball" },
      { emoji: "🕺", label: "Dancing" },
      { emoji: "💃", label: "Dance" },
      { emoji: "🎬", label: "Clapper" },
      { emoji: "🎭", label: "Drama" },
    ],
  },
  {
    key: "hearts",
    icon: "💜",
    label: "Hearts",
    reactions: [
      { emoji: "💘", label: "Arrow heart" },
      { emoji: "💝", label: "Gift heart" },
      { emoji: "💖", label: "Sparkle heart" },
      { emoji: "💗", label: "Growing heart" },
      { emoji: "💓", label: "Beating heart" },
      { emoji: "💕", label: "Two hearts" },
      { emoji: "💞", label: "Revolving hearts" },
      { emoji: "💟", label: "Heart decoration" },
      { emoji: "❣️", label: "Heart exclamation" },
      { emoji: "💔", label: "Broken heart" },
      { emoji: "❤️‍🔥", label: "Heart on fire" },
      { emoji: "❤️‍🩹", label: "Mending heart" },
      { emoji: "🩷", label: "Pink heart" },
      { emoji: "🧡", label: "Orange heart" },
      { emoji: "💛", label: "Yellow heart" },
      { emoji: "💚", label: "Green heart" },
      { emoji: "💙", label: "Blue heart" },
      { emoji: "💜", label: "Purple heart" },
      { emoji: "🤎", label: "Brown heart" },
      { emoji: "🖤", label: "Black heart" },
      { emoji: "🩶", label: "Gray heart" },
      { emoji: "🤍", label: "White heart" },
    ],
  },
  {
    key: "spark",
    icon: "✨",
    label: "Spark",
    reactions: [
      { emoji: "✨", label: "Sparkles" },
      { emoji: "⭐", label: "Star" },
      { emoji: "🌟", label: "Glowing star" },
      { emoji: "💫", label: "Dizzy" },
      { emoji: "💥", label: "Boom" },
      { emoji: "💢", label: "Anger pop" },
      { emoji: "💦", label: "Sweat drops" },
      { emoji: "💨", label: "Dash" },
      { emoji: "💤", label: "Sleep" },
      { emoji: "⚡", label: "Electric" },
      { emoji: "🌈", label: "Rainbow" },
      { emoji: "☀️", label: "Sun" },
      { emoji: "🌙", label: "Moon" },
      { emoji: "☁️", label: "Cloud" },
      { emoji: "🌊", label: "Wave" },
      { emoji: "🌀", label: "Spiral" },
      { emoji: "🎯", label: "Bullseye" },
      { emoji: "🏆", label: "Trophy" },
      { emoji: "🥇", label: "Gold medal" },
      { emoji: "🎉", label: "Party popper" },
      { emoji: "🎊", label: "Confetti" },
      { emoji: "🥳", label: "Partying" },
      { emoji: "💎", label: "Gem" },
      { emoji: "🚀", label: "Rocket" },
      { emoji: "🧨", label: "Firecracker" },
      { emoji: "🪄", label: "Magic wand" },
      { emoji: "🔮", label: "Crystal ball" },
    ],
  },
  {
    key: "vibes",
    icon: "🍿",
    label: "Vibes",
    reactions: [
      { emoji: "👀", label: "Eyes" },
      { emoji: "🧠", label: "Brainy" },
      { emoji: "💡", label: "Idea" },
      { emoji: "📝", label: "Notes" },
      { emoji: "✅", label: "Check" },
      { emoji: "❌", label: "Cross" },
      { emoji: "📚", label: "Studious" },
      { emoji: "🗣️", label: "Talk" },
      { emoji: "💬", label: "Comment" },
      { emoji: "📣", label: "Announcement" },
      { emoji: "🔊", label: "Loud" },
      { emoji: "🔇", label: "Muted" },
      { emoji: "🍿", label: "Popcorn" },
      { emoji: "☕", label: "Coffee" },
      { emoji: "🍷", label: "Wine" },
      { emoji: "🍻", label: "Cheers" },
      { emoji: "🥂", label: "Toast" },
      { emoji: "🍾", label: "Celebration" },
      { emoji: "🧂", label: "Salty" },
      { emoji: "🧊", label: "Ice cold" },
      { emoji: "🛋️", label: "Couch" },
      { emoji: "🧯", label: "Extinguisher" },
      { emoji: "🧪", label: "Experiment" },
      { emoji: "🧭", label: "Compass" },
      { emoji: "🧱", label: "Brick" },
      { emoji: "💩", label: "Pile of poo" },
      { emoji: "💀", label: "Dead laughing" },
      { emoji: "☠️", label: "Skull and crossbones" },
      { emoji: "🍑", label: "Peach" },
      { emoji: "🍆", label: "Eggplant" },
      { emoji: "🪦", label: "Dead" },
      { emoji: "🏁", label: "Finish" },
    ],
  },
] as const satisfies readonly ExtraReactionGroup[];
const EXTRA_REACTIONS: ExtraReaction[] = EXTRA_REACTION_GROUPS.flatMap(
  (group): readonly ExtraReaction[] => group.reactions,
);

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
                          sizes="42px"
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
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");

  async function postAction(previousState: FeedPostActionState, formData: FormData) {
    const result = await createFeedPostAction(previousState, formData);

    if (result.status === "success") {
      formRef.current?.reset();
      setBody("");
      setImageMessage(null);
      setImageError(null);
      setSelectedAlbumId("");
      setResetKey((key) => key + 1);
    }

    return result;
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0] ?? null;

    setImageMessage(null);
    setImageError(null);

    if (!file) {
      return;
    }

    if (!FEED_IMAGE_TYPES.has(file.type)) {
      input.value = "";
      setImageError("Use a JPG, PNG, WEBP, or GIF image.");
      return;
    }

    if (file.size > FEED_IMAGE_MAX_SIZE) {
      input.value = "";
      setImageError("Images need to be 8 MB or smaller.");
      return;
    }

    if (file.size <= FEED_IMAGE_SAFE_UPLOAD_SIZE) {
      setImageMessage(`${file.name} selected.`);
      return;
    }

    if (!FEED_COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
      input.value = "";
      setImageError("GIFs need to be 4 MB or smaller.");
      return;
    }

    setIsImageProcessing(true);
    setImageMessage(`Optimizing ${file.name} for upload...`);

    try {
      const compressedFile = await compressFeedImage(file);

      if (compressedFile.size > FEED_IMAGE_SAFE_UPLOAD_SIZE) {
        input.value = "";
        setImageMessage(null);
        setImageError("That image is too large to post. Try a smaller photo or screenshot.");
        return;
      }

      const transfer = new DataTransfer();
      transfer.items.add(compressedFile);
      input.files = transfer.files;
      setImageMessage(
        `${compressedFile.name} optimized to ${formatFileSize(compressedFile.size)}.`,
      );
    } catch {
      input.value = "";
      setImageMessage(null);
      setImageError("Could not prepare that image. Try a smaller JPG, PNG, or WEBP.");
    } finally {
      setIsImageProcessing(false);
    }
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
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="feed-post-body">
            Post
          </label>
          <MentionTextarea
            id="feed-post-body"
            className="min-h-28 text-xl leading-snug"
            containerClassName="border-0 bg-transparent shadow-none focus-within:shadow-none"
            maxLength={560}
            members={members}
            name="body"
            onValueChange={setBody}
            placeholder="Post to The Feed"
            value={body}
          />
        </div>
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
          disabled={isPending || isImageProcessing}
          onChange={handleImageChange}
        />

        <AlbumAttachPicker
          key={resetKey}
          albums={albums}
          selectedAlbumId={selectedAlbumId}
          onSelectedAlbumIdChange={setSelectedAlbumId}
        />

        <Button type="submit" variant="accent" disabled={isPending || isImageProcessing}>
          <Send className="size-4" aria-hidden="true" />
          {isPending ? "Posting" : isImageProcessing ? "Preparing" : "Post"}
        </Button>
        {(imageMessage || imageError) && (
          <p
            className={cn(
              "basis-full text-sm",
              imageError ? "text-[var(--accent)]" : "text-[var(--ink-soft)]",
            )}
          >
            {imageError || imageMessage}
          </p>
        )}
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

async function compressFeedImage(file: File) {
  const image = await loadImageFile(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const longestSide = Math.max(width, height);
  const initialMaxSide = 1800;

  if (longestSide > initialMaxSide) {
    const ratio = initialMaxSide / longestSide;
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const qualities = [0.86, 0.78, 0.7, 0.62, 0.54];
  const scaleSteps = [1, 0.85, 0.72, 0.6];
  let bestBlob: Blob | null = null;

  for (const scale of scaleSteps) {
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      bestBlob = !bestBlob || blob.size < bestBlob.size ? blob : bestBlob;

      if (blob.size <= FEED_IMAGE_SAFE_UPLOAD_SIZE) {
        return new File([blob], getCompressedImageName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
  }

  if (!bestBlob) {
    throw new Error("Image compression failed.");
  }

  return new File([bestBlob], getCompressedImageName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function loadImageFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not create image blob."));
        }
      },
      type,
      quality,
    );
  });
}

function getCompressedImageName(name: string) {
  const baseName = name.replace(/\.[^.]*$/, "") || "feed-image";
  return `${baseName}.jpg`;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
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
              sizes="44px"
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
                    sizes="48px"
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
    <article className="surface-panel overflow-visible rounded-lg">
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
          </div>
          {post.body && (
            <FeedMarkdown
              value={post.body}
              className="mt-3 font-quote text-xl leading-snug text-[var(--ink)]"
            />
          )}
          {post.album &&
            shouldShowFeedAlbumCard({
              albumCoverImage: post.albumCoverImage,
              currentAlbumCoverImage: post.album.coverImage,
              hasImage: Boolean(post.imageUrl),
              imageIsAlbumCover: post.imageIsAlbumCover,
            }) && <AlbumAttachmentCard album={post.album} />}
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
                  <FeedMarkdown value={reply.body} inline />
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
  containerClassName,
  id,
  maxLength,
  members,
  name,
  onValueChange,
  placeholder,
  value,
}: {
  className?: string;
  containerClassName?: string;
  id?: string;
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

  function applyFormat(format: ReviewMarkdownFormat) {
    const textarea = ref.current;
    if (!textarea) {
      return;
    }

    const result = applyReviewMarkdownFormat(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      format,
    );

    if (result.value.length > maxLength) {
      return;
    }

    onValueChange(result.value);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div
      className={cn(
        "input-control relative p-0 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
        containerClassName,
      )}
    >
      <ReviewMarkdownToolbar onFormat={applyFormat} />
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "block w-full resize-y bg-transparent px-3.5 py-3 outline-none placeholder:text-[var(--ink-soft)]",
          className,
        )}
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
    </div>
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
  const extraGrouped = useMemo(() => {
    const byEmoji = new Map<string, { active: boolean; count: number; emoji: string }>();

    reactions.forEach((reaction) => {
      if (QUICK_REACTION_KEYS.has(reaction.emoji)) {
        return;
      }

      const entry = byEmoji.get(reaction.emoji) ?? {
        active: false,
        count: 0,
        emoji: reaction.emoji,
      };

      entry.count += 1;
      entry.active = entry.active || reaction.userId === currentUserId;
      byEmoji.set(reaction.emoji, entry);
    });

    return [...byEmoji.values()].sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }, [currentUserId, reactions]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {grouped.map((reaction) => (
        <ReactionButton
          key={reaction.key}
          active={reaction.active}
          count={reaction.count}
          emoji={reaction.emoji}
          label={reaction.label}
          postId={postId}
          value={reaction.key}
        />
      ))}
      {extraGrouped.map((reaction) => (
        <ReactionButton
          key={reaction.emoji}
          active={reaction.active}
          count={reaction.count}
          emoji={reaction.emoji}
          label={getExtraReactionLabel(reaction.emoji)}
          postId={postId}
          value={reaction.emoji}
        />
      ))}
      <EmojiReactionPicker postId={postId} />
    </div>
  );
}

function ReactionButton({
  active,
  count,
  emoji,
  label,
  postId,
  value,
}: {
  active: boolean;
  count: number;
  emoji: string;
  label: string;
  postId: string;
  value: string;
}) {
  return (
    <form action={toggleFeedReactionAction}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="emoji" value={value} />
      <button
        type="submit"
        title={label}
        aria-label={`React ${emoji} ${label}`}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm leading-none transition-colors",
          active
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
            : "border-[var(--line-strong)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
        )}
      >
        <span>{emoji}</span>
        {count > 0 && <span className="mono text-[10px]">{count}</span>}
      </button>
    </form>
  );
}

function EmojiReactionPicker({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryKey, setCategoryKey] = useState<string>(EXTRA_REACTION_GROUPS[0].key);
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedQuery = normalizeEmojiSearch(query);
  const activeGroup =
    EXTRA_REACTION_GROUPS.find((group) => group.key === categoryKey) ?? EXTRA_REACTION_GROUPS[0];
  const matches = useMemo(() => {
    if (!normalizedQuery) {
      return activeGroup.reactions;
    }

    return EXTRA_REACTIONS.filter((reaction) =>
      normalizeEmojiSearch(`${reaction.emoji} ${reaction.label}`).includes(normalizedQuery),
    ).slice(0, 60);
  }, [activeGroup.reactions, normalizedQuery]);

  function selectReaction(emoji: string) {
    const formData = new FormData();
    formData.set("postId", postId);
    formData.set("emoji", emoji);
    setReactionError(null);

    startTransition(async () => {
      try {
        await toggleFeedReactionAction(formData);
        setOpen(false);
      } catch {
        setReactionError("Could not add that reaction. Try again.");
      }
    });
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="quiet"
        size="icon"
        className="size-8 rounded-full border border-[var(--line-strong)] bg-[var(--card)] px-0"
        aria-label="More emoji"
        title="More emoji"
        aria-expanded={open}
        onClick={() => {
          setReactionError(null);
          setOpen((value) => !value);
        }}
      >
        <SmilePlus className="size-4" aria-hidden="true" />
      </Button>

      {open && (
        <div
          className="fixed inset-x-4 bottom-20 z-50 w-auto overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--card)] shadow-[0_18px_44px_-24px_#000] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:z-30 sm:mt-2 sm:w-[min(360px,calc(100vw-2rem))]"
          aria-busy={isPending}
        >
          <div className="border-b border-[var(--line)] bg-[var(--paper-2)] p-2">
            <label className="sr-only" htmlFor={`emoji-search-${postId}`}>
              Search emoji
            </label>
            <input
              id={`emoji-search-${postId}`}
              className="input-control h-9 w-full px-3 py-1 text-sm"
              placeholder="Search emoji"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div
            className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--paper-2)] px-2 py-1.5"
            role="tablist"
            aria-label="Emoji categories"
          >
            {EXTRA_REACTION_GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={group.key === categoryKey}
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-md border text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                  group.key === categoryKey
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                    : "border-transparent hover:bg-[var(--card)]",
                )}
                title={group.label}
                aria-label={group.label}
                onClick={() => {
                  setCategoryKey(group.key);
                  setQuery("");
                }}
              >
                <span aria-hidden="true">{group.icon}</span>
              </button>
            ))}
          </div>
          <div className="grid max-h-[min(18rem,calc(100dvh-14rem))] grid-cols-6 gap-1 overflow-auto p-2">
            {matches.length === 0 ? (
              <p className="tag col-span-6 px-1 py-2">No emoji found</p>
            ) : (
              matches.map((reaction) => (
                <button
                  key={`${reaction.emoji}-${reaction.label}`}
                  type="button"
                  className="grid size-10 place-items-center rounded-md text-xl transition-colors hover:bg-[var(--paper-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-50"
                  title={reaction.label}
                  aria-label={`React ${reaction.emoji} ${reaction.label}`}
                  disabled={isPending}
                  onClick={() => selectReaction(reaction.emoji)}
                >
                  {reaction.emoji}
                </button>
              ))
            )}
          </div>
          {(isPending || reactionError) && (
            <p
              className={cn(
                "border-t border-[var(--line)] px-3 py-2 text-sm",
                reactionError ? "text-[var(--accent)]" : "text-[var(--ink-soft)]",
              )}
              role="status"
            >
              {reactionError ?? "Adding reaction…"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FeedMarkdown({
  className,
  inline = false,
  value,
}: {
  className?: string;
  inline?: boolean;
  value: string;
}) {
  return (
    <Markdown
      allowedElements={[...FEED_ALLOWED_MARKDOWN]}
      skipHtml
      unwrapDisallowed
      components={{
        p({ children }) {
          const content = renderMentionNodes(children);

          return inline ? (
            <>{content}</>
          ) : (
            <p className={cn("whitespace-pre-wrap", className)}>{content}</p>
          );
        },
        strong({ children }) {
          return (
            <strong className="font-extrabold text-[var(--ink)]">
              {renderMentionNodes(children)}
            </strong>
          );
        },
        em({ children }) {
          return <em className="italic">{renderMentionNodes(children)}</em>;
        },
      }}
    >
      {value}
    </Markdown>
  );
}

function renderMentionNodes(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return renderMentionPieces(child);
    }

    if (isValidElement<{ children?: ReactNode }>(child)) {
      return cloneElement(child, {
        children: renderMentionNodes(child.props.children),
      });
    }

    return child;
  });
}

function renderMentionPieces(value: string) {
  const pieces = value.split(/(@[\w.-]+)/g);

  return pieces.map((piece, index) =>
    piece.startsWith("@") ? (
      <span key={`${piece}-${index}`} className="text-[var(--accent)]">
        {piece}
      </span>
    ) : (
      piece
    ),
  );
}

function getExtraReactionLabel(emoji: string) {
  return EXTRA_REACTIONS.find((reaction) => reaction.emoji === emoji)?.label ?? "Emoji reaction";
}

function AlbumAttachmentCard({ album }: { album: FeedAlbum }) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="group mt-4 grid w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] p-2.5 text-left transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <AlbumCover
        rank={album.rank}
        src={album.coverUrl}
        title={album.title}
        sizes="64px"
        className="rounded-sm shadow-none"
      />
      <span className="min-w-0">
        <span className="tag block text-[var(--ink-faint)]">album</span>
        <span className="title-wrap block font-display text-base font-extrabold leading-tight text-[var(--ink)] group-hover:text-[var(--accent)]">
          {album.title}
        </span>
        <span className="block truncate text-sm text-[var(--ink-soft)]">
          {album.artist} <span aria-hidden="true">·</span> {album.year}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-[var(--ink-faint)] transition-colors group-hover:text-[var(--accent)]"
        aria-hidden="true"
      />
    </Link>
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

function normalizeEmojiSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\p{Extended_Pictographic}]+/gu, "")
    .toLowerCase()
    .trim();
}
