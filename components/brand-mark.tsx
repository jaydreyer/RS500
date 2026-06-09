import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/week",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5", className)}
      aria-label="Spin 500 home"
    >
      <span className="grid size-6 place-items-center rounded-full bg-[var(--accent)] shadow-[inset_0_0_0_4px_var(--paper)]">
        <span className="size-1.5 rounded-full bg-[var(--paper)]" />
      </span>
      <span className="font-display text-xl font-extrabold">
        RSD <span className="text-[var(--accent)]">500</span>
      </span>
    </Link>
  );
}
