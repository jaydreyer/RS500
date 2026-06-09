import { BrandMark } from "@/components/brand-mark";
import { AuthForm } from "@/components/auth-form";
import { AlbumCover } from "@/components/album-cover";
import albums from "@/data/rs500-albums.json";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/week");
  }

  const featureAlbums = [0, 2, 7, 12, 19, 30].map((index) => albums.albums[index]);

  return (
    <main className="page-surface grid min-h-screen grid-cols-1 bg-[var(--paper)] md:grid-cols-2">
      <section className="relative flex min-h-[620px] flex-col justify-between overflow-hidden bg-[var(--paper-2)] p-7 sm:p-10 md:p-14">
        <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(0deg,var(--ink)_0_1px,transparent_1px_6px)]" />
        <BrandMark href="/auth" className="relative z-10" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_220px] lg:items-end">
          <div>
            <div className="font-display text-7xl font-extrabold leading-[0.92] sm:text-8xl lg:text-9xl">
              500
              <br />
              <span className="text-[var(--accent)]">albums.</span>
              <br />
              one
              <br />
              at a time.
            </div>
            <p className="mt-6 max-w-sm font-quote text-xl text-[var(--ink-soft)]">
              A private listening club built on Rolling Stone&apos;s 500 Greatest
              Albums. Draw at random. No re-rolls. Argue about scores.
            </p>
          </div>
          <div className="hidden grid-cols-3 gap-2 lg:grid">
            {featureAlbums.map((album, index) => (
              <AlbumCover
                key={album.rank}
                rank={album.rank}
                src={album.cover_url}
                title={album.title}
                className={[
                  "cover-lift rounded-sm",
                  index % 2 === 0 ? "translate-y-3" : "-translate-y-2",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2 text-xs text-[var(--ink-soft)] mono">
          <span className="rounded-full border border-[var(--line-strong)] px-3 py-1">INVITE ONLY</span>
          <span className="rounded-full border border-[var(--line-strong)] px-3 py-1">500 SEEDED</span>
          <span className="rounded-full border border-[var(--line-strong)] px-3 py-1">NO RE-ROLLS</span>
        </div>
        <div className="record-ring absolute -bottom-24 -right-24 size-72 rounded-full border-2 border-white/15 animate-spin-record" />
      </section>

      <section className="grid place-items-center px-5 py-12 md:px-12">
        <AuthForm />
      </section>
    </main>
  );
}
