/* Stats — the sleeper feature (PRD §7.1). All derived from listens. */

function Stats({ listens, goAlbum }) {
  const RSD = window.RSD;
  const rated = listens.filter(l => l.rating != null);

  const perMember = RSD.MEMBERS.map(m => {
    const mine = listens.filter(l => l.user === m.id);
    const r = mine.filter(l => l.rating != null);
    return {
      m, logged: mine.length, skips: mine.filter(l => l.kind === 'skip').length,
      avg: r.length ? r.reduce((s, l) => s + l.rating, 0) / r.length : 0,
      rated: r.length,
    };
  });
  const harshest = [...perMember].filter(p => p.rated).sort((a, b) => a.avg - b.avg)[0];
  const generous = [...perMember].filter(p => p.rated).sort((a, b) => b.avg - a.avg)[0];
  const mostLogged = [...perMember].sort((a, b) => b.logged - a.logged)[0];
  const maxSkips = Math.max(...perMember.map(p => p.skips), 1);

  const sortedAlbums = [...rated].sort((a, b) => b.rating - a.rating);
  const highest = sortedAlbums[0];
  const lowest = sortedAlbums[sortedAlbums.length - 1];

  // same album, 2+ members
  const byAlbum = {};
  rated.forEach(l => { (byAlbum[l.album] = byAlbum[l.album] || []).push(l); });
  const contested = Object.entries(byAlbum).filter(([, ls]) => ls.length >= 2)
    .map(([aid, ls]) => ({ album: RSD.album(aid), ls, spread: Math.max(...ls.map(x => x.rating)) - Math.min(...ls.map(x => x.rating)) }))
    .sort((a, b) => b.spread - a.spread).slice(0, 3);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <Eyebrow>emergent crew lore</Eyebrow>
      <h1 style={{ fontSize: 'clamp(36px,7vw,62px)', margin: '8px 0 26px' }}>Stats</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Superlative title="Harshest rater" person={harshest} valueFmt={p => p.avg.toFixed(1)} sub="lowest average score" />
        <Superlative title="Most generous" person={generous} valueFmt={p => p.avg.toFixed(1)} sub="highest average score" accent />
        <Superlative title="Deepest crate" person={mostLogged} valueFmt={p => p.logged} sub="albums logged" />
      </div>

      {/* skip meter */}
      <div style={{ marginTop: 16, border: '1.5px solid var(--ink)', borderRadius: 8, background: 'var(--card)', padding: 20, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h3 style={{ fontSize: 22 }}>Skip counts</h3>
          <span className="tag">public · the honest collection meter</span>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {[...perMember].sort((a, b) => b.skips - a.skips).map(p => (
            <div key={p.m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 90, display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                <Avatar id={p.m.id} size={26} ring={p.m.id === RSD.ME} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{p.m.id === RSD.ME ? 'You' : p.m.name}</span>
              </div>
              <div style={{ flex: 1, height: 22, background: 'var(--paper-2)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--line-strong)' }}>
                <div style={{ width: (p.skips / maxSkips * 100) + '%', height: '100%', background: 'var(--accent)', transition: 'width .8s ease' }} />
              </div>
              <span className="mono" style={{ width: 24, textAlign: 'right', fontWeight: 700 }}>{p.skips}</span>
            </div>
          ))}
        </div>
      </div>

      {/* high / low */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        <AlbumStat label="Crew high" listen={highest} goAlbum={goAlbum} accent />
        <AlbumStat label="Crew low" listen={lowest} goAlbum={goAlbum} />
      </div>

      {/* contested */}
      {contested.length > 0 && (
        <div style={{ marginTop: 16, border: '1.5px solid var(--ink)', borderRadius: 8, background: 'var(--card)', padding: 20, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: 22, marginBottom: 4 }}>Most divisive</h3>
          <p className="tag" style={{ marginBottom: 16 }}>same album, biggest score spread</p>
          <div style={{ display: 'grid', gap: 14 }}>
            {contested.map(c => (
              <div key={c.album.id} style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 54, flex: '0 0 auto', cursor: 'pointer' }} onClick={() => goAlbum(c.album.id)}><Sleeve album={c.album} rounded /></div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{c.album.title}</div>
                  <div style={{ fontFamily: 'var(--font-quote)', color: 'var(--ink-soft)', fontSize: 15 }}>{c.album.artist}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {c.ls.map(l => (
                    <div key={l.id} style={{ textAlign: 'center' }}>
                      <Avatar id={l.user} size={26} />
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginTop: 3 }}>{l.rating}</div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', paddingLeft: 6, borderLeft: '1px solid var(--line-strong)' }}>
                    <div className="accent" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>±{c.spread}</div>
                    <div className="tag">spread</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Superlative({ title, person, valueFmt, sub, accent }) {
  if (!person) return null;
  const RSD = window.RSD;
  return (
    <div style={{ border: '1.5px solid var(--ink)', borderRadius: 8, padding: 20, background: accent ? 'var(--accent)' : 'var(--card)',
      color: accent ? 'var(--accent-ink)' : 'var(--ink)', boxShadow: 'var(--shadow)' }}>
      <div className="tag" style={{ color: accent ? 'var(--accent-ink)' : 'var(--ink-faint)' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
        <Avatar id={person.m.id} size={38} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>{person.m.id === RSD.ME ? 'You' : person.m.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, lineHeight: 1 }}>{valueFmt(person)}</span>
        <span className="tag" style={{ color: accent ? 'var(--accent-ink)' : 'var(--ink-faint)' }}>{sub}</span>
      </div>
    </div>
  );
}

function AlbumStat({ label, listen, goAlbum, accent }) {
  if (!listen) return null;
  const RSD = window.RSD; const a = RSD.album(listen.album); const m = RSD.member(listen.user);
  return (
    <div style={{ border: '1.5px solid var(--ink)', borderRadius: 8, background: 'var(--card)', boxShadow: 'var(--shadow)', display: 'flex', gap: 14, padding: 16, alignItems: 'center', cursor: 'pointer' }} onClick={() => goAlbum(a.id)}>
      <div style={{ width: 78, flex: '0 0 auto' }}><Sleeve album={a} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tag" style={{ color: accent ? 'var(--good)' : 'var(--ink-faint)' }}>{label}</div>
        <h3 style={{ fontSize: 19, margin: '4px 0 2px' }}>{a.title}</h3>
        <div style={{ fontFamily: 'var(--font-quote)', color: 'var(--ink-soft)', fontSize: 15 }}>{a.artist}</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar id={listen.user} size={20} /><span className="tag">{m.id === RSD.ME ? 'you' : m.name} gave it</span>
        </div>
      </div>
      <ScoreBadge value={listen.rating} mode="number" max={10} size="lg" />
    </div>
  );
}

Object.assign(window, { Stats });
