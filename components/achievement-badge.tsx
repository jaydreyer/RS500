import { Check, LockKeyhole } from "lucide-react";

import type { BadgeProgress } from "@/lib/badges";
import { cn } from "@/lib/utils";

export function AchievementBadge({
  badge,
  index,
}: {
  badge: BadgeProgress;
  index: number;
}) {
  const progressPercent = Math.round((badge.progress / badge.threshold) * 100);
  const statusLabel =
    badge.state === "earned"
      ? `Earned${badge.earnedAt ? ` ${formatEarnedDate(badge.earnedAt)}` : ""}`
      : badge.state === "next"
        ? `${badge.remaining} to go`
        : "Locked";

  return (
    <article
      className={cn(
        "group relative grid min-w-0 content-start justify-items-center rounded-lg border p-3 text-center transition-colors",
        badge.state === "earned" &&
          "border-[color-mix(in_srgb,var(--accent)_55%,var(--line-strong))] bg-[color-mix(in_srgb,var(--accent)_7%,var(--card))]",
        badge.state === "next" &&
          "border-[var(--line-strong)] bg-[var(--card)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_15%,transparent)]",
        badge.state === "locked" &&
          "border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-2)_72%,transparent)] opacity-55",
      )}
      title={badge.description}
    >
      <BadgeMark badge={badge} index={index} progressPercent={progressPercent} />
      <h3 className="mt-3 min-h-8 text-base leading-none">{badge.name}</h3>
      <p
        className={cn(
          "tag mt-2",
          badge.state === "earned" && "text-[var(--accent)]",
          badge.state === "next" && "text-[var(--ink-soft)]",
        )}
      >
        {statusLabel}
      </p>
      {badge.state === "next" && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line-strong)]"
          aria-label={`${badge.progress} of ${badge.threshold}`}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </article>
  );
}

function BadgeMark({
  badge,
  index,
  progressPercent,
}: {
  badge: BadgeProgress;
  index: number;
  progressPercent: number;
}) {
  const shape = index % 4;
  const shapePath =
    shape === 0
      ? "M80 5C119 5 151 37 151 76C151 116 124 149 80 171C36 149 9 116 9 76C9 37 41 5 80 5Z"
      : shape === 1
        ? "M28 8H132L153 30V136L124 169H36L7 136V30L28 8Z"
        : shape === 2
          ? "M80 5L94 13L110 10L121 22L138 24L143 40L157 50L153 67L160 81L151 96L153 113L138 122L132 139L115 141L103 153L87 150L72 159L58 150L42 153L30 141L13 139L8 122L-7 113L-4 96L-13 81L-6 67L-10 50L4 40L9 24L26 22L37 10L53 13L67 5Z"
          : "M20 8H140V27L151 38V142L140 153V171H20V153L9 142V38L20 27V8Z";
  const markLabel =
    badge.track === "writing" ? "Written review achievement" : "Listening achievement";

  return (
    <svg
      aria-label={`${badge.name}: ${badge.threshold}. ${markLabel}. ${badge.state}.`}
      className="h-auto w-full max-w-32 overflow-visible"
      role="img"
      viewBox="0 0 160 180"
    >
      <path
        d={shapePath}
        fill={
          badge.state === "earned"
            ? "var(--accent)"
            : badge.state === "next"
              ? "var(--paper-2)"
              : "transparent"
        }
        stroke={badge.state === "locked" ? "var(--ink-faint)" : "var(--ink)"}
        strokeWidth="4"
      />
      <path
        d={shapePath}
        fill="none"
        opacity="0.62"
        stroke={badge.state === "earned" ? "var(--paper)" : "var(--line-strong)"}
        strokeWidth="2"
        transform="translate(80 88) scale(.88) translate(-80 -88)"
      />
      {badge.track === "writing" ? <WritingMark /> : <RecordMark index={index} />}
      <text
        fill={badge.state === "earned" ? "var(--accent-ink)" : "var(--ink)"}
        fontFamily="var(--font-display), system-ui, sans-serif"
        fontSize={badge.threshold >= 100 ? "31" : "36"}
        fontWeight="900"
        textAnchor="middle"
        x="80"
        y="143"
      >
        {badge.threshold}
      </text>
      {badge.state === "earned" && (
        <g transform="translate(126 21)">
          <circle cx="0" cy="0" fill="var(--ink)" r="15" />
          <Check color="var(--paper)" size={18} strokeWidth={4} x="-9" y="-9" />
        </g>
      )}
      {badge.state === "locked" && (
        <LockKeyhole
          color="var(--ink-faint)"
          size={23}
          strokeWidth={2.5}
          x="115"
          y="14"
        />
      )}
      {badge.state === "next" && (
        <text
          fill="var(--accent)"
          fontFamily="var(--font-mono), monospace"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
          x="80"
          y="164"
        >
          {progressPercent}%
        </text>
      )}
    </svg>
  );
}

function RecordMark({ index }: { index: number }) {
  const recordCount = Math.min(3, Math.floor(index / 2) + 1);

  return (
    <g>
      {Array.from({ length: recordCount }, (_, recordIndex) => (
        <ellipse
          key={recordIndex}
          cx="80"
          cy={76 - recordIndex * 5}
          fill="var(--ink)"
          rx={34 + recordIndex * 2}
          ry="15"
          stroke="var(--paper)"
          strokeWidth="2"
        />
      ))}
      <ellipse cx="80" cy={76 - (recordCount - 1) * 5} fill="var(--accent-2)" rx="11" ry="5" />
      <circle cx="80" cy={76 - (recordCount - 1) * 5} fill="var(--ink)" r="2.2" />
    </g>
  );
}

function WritingMark() {
  return (
    <g fill="none" stroke="var(--ink)" strokeLinecap="round">
      <path d="M51 48H110V103H51Z" fill="var(--paper)" strokeWidth="3" />
      <path d="M63 62H99M63 73H99M63 84H89" strokeWidth="4" />
      <path d="M103 96L124 45" stroke="var(--accent-2)" strokeWidth="8" />
      <path d="M120 43L126 46L123 54" stroke="var(--ink)" strokeWidth="3" />
    </g>
  );
}

function formatEarnedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
