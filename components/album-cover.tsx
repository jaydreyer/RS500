import Image from "next/image";

import { cn } from "@/lib/utils";

export function AlbumCover({
  rank = 500,
  src,
  title,
  className,
}: {
  rank?: number;
  src?: string;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-md border border-black/20 bg-[var(--card)] shadow-[var(--shadow)]",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={title ? `${title} album cover` : `Album cover for rank ${rank}`}
          fill
          sizes="(max-width: 768px) 52vw, 200px"
          unoptimized
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#f4f2ec_0_10%,transparent_10.5%),linear-gradient(135deg,#e2452b_0_34%,#1f222a_34%_68%,#3aa99b_68%)]" />
      )}
    </div>
  );
}
