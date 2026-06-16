import { CalendarDays, CheckCircle2, Megaphone, Sparkles, Wrench } from "lucide-react";

import { RouteShell } from "@/components/route-shell";
import { releaseNotes, type ReleaseNote } from "@/lib/release-notes";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function UpdatesPage() {
  return (
    <RouteShell eyebrow="APP NOTES" title="What's New" className="max-w-4xl">
      <p className="-mt-2 mb-6 max-w-2xl font-quote text-xl leading-snug text-[var(--ink-soft)]">
        Product updates, fixes, and small quality-of-life changes for the listening club.
      </p>

      <div className="grid gap-4">
        {releaseNotes.map((note, index) => (
          <ReleaseNoteCard key={`${note.date}-${note.title}`} latest={index === 0} note={note} />
        ))}
      </div>
    </RouteShell>
  );
}

function ReleaseNoteCard({ note, latest }: { note: ReleaseNote; latest: boolean }) {
  return (
    <article className="hard-panel overflow-hidden rounded-lg">
      <div className="grid gap-4 border-b border-[var(--line-strong)] bg-[var(--paper-2)] p-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Megaphone className="size-4 text-[var(--accent)]" aria-hidden="true" />
            <p className="tag">{latest ? "latest update" : "update"}</p>
          </div>
          <h2 className="title-wrap mt-2 text-3xl">{note.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            {note.summary}
          </p>
        </div>
        <time
          dateTime={note.date}
          className="mono inline-flex w-fit items-center gap-2 rounded-md border border-[var(--line-strong)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)]"
        >
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatReleaseDate(note.date)}
        </time>
      </div>

      <div className="grid gap-5 p-5">
        <ReleaseNoteSection icon={Sparkles} items={note.added} label="Added" />
        <ReleaseNoteSection icon={CheckCircle2} items={note.improved} label="Improved" />
        <ReleaseNoteSection icon={Wrench} items={note.fixed} label="Fixed" />
      </div>
    </article>
  );
}

function ReleaseNoteSection({
  icon: Icon,
  items,
  label,
}: {
  icon: typeof Sparkles;
  items?: readonly string[];
  label: string;
}) {
  if (!items?.length) {
    return null;
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-[var(--accent)]" aria-hidden="true" />
        <h3 className="tag">{label}</h3>
      </div>
      <ul className="grid gap-2 text-sm leading-6 text-[var(--ink-soft)]">
        {items.map((item) => (
          <li key={item} className="rounded-md border border-[var(--line)] bg-[var(--card)] px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatReleaseDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}
