/* The 500 — full catalog browser: search, sort, filter (new tab). */
const { useState, useMemo } = React;

function Catalog({ listens, goAlbum }) {
  const RSD = window.RSD;
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('rank');     // rank | year | title | artist | mine
  const [dir, setDir] = useState('asc');
  const [filter, setFilter] = useState('all');  // all | logged | unlogged | heard

  // my status per album
  const myByAlbum = useMemo(() => {
    const m = {};
    listens.filter(l => l.user === RSD.ME).forEach(l => { m[l.album] = l; });
    return m;
  }, [listens]);

  function toggleSort(key) {
    if (sort === key) { setDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSort(key); setDir(key === 'rank' || key === 'title' || key === 'artist' ? 'asc' : 'asc'); }
  }

  const rows = useMemo(() => {
    let list = RSD.ALBUMS.slice();
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter(a => (a.title + ' ' + a.artist).toLowerCase().includes(needle));
    if (filter === 'logged') list = list.filter(a => myByAlbum[a.id]);
    else if (filter === 'unlogged') list = list.filter(a => !myByAlbum[a.id]);
    else if (filter === 'heard') list = list.filter(a => myByAlbum[a.id] && myByAlbum[a.id].kind === 'skip');
    const val = (a) => {
      if (sort === 'rank') return a.rank;
      if (sort === 'year') return a.year;
      if (sort === 'title') return a.title.toLowerCase().replace(/^the /, '');
      if (sort === 'artist') return a.artist.toLowerCase().replace(/^the /, '');
      if (sort === 'mine') { const l = myByAlbum[a.id]; return l && l.rating != null ? l.rating : -1; }
      return a.rank;
    };
    list.sort((a, b) => {
      const va = val(a), vb = val(b);
      const cmp = (typeof va === 'string') ? va.localeCompare(vb) : va - vb;
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [q, sort, dir, filter, myByAlbum]);

  const loggedCount = Object.keys(myByAlbum).length;
  const arrow = (key) => sort === key ? (dir === 'asc' ? '▲' : '▼') : '';

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 8 }}>
        <div>
          <Eyebrow>the whole list · rolling stone 500</Eyebrow>
          <h1 style={{ fontSize: 'clamp(36px,7vw,62px)', marginTop: 8 }}>The 500</h1>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <Stat label="showing" value={rows.length} />
          <Stat label="you've logged" value={loggedCount} accentVal />
        </div>
      </div>
      <p style={{ fontFamily: 'var(--font-quote)', fontSize: 18, color: 'var(--ink-soft)', maxWidth: 520, margin: '0 0 22px' }}>
        Browse the full catalog. You can't draw from here — that's the whole point — but you can see what's still out there.
      </p>

      {/* controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>⌕</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search title or artist…"
            style={{ width: '100%', padding: '11px 14px 11px 34px', border: '1.5px solid var(--line-strong)', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 15, borderRadius: 4, outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--line-strong)'} />
        </div>
        <div style={{ display: 'flex', gap: 4, border: '1.5px solid var(--line-strong)', borderRadius: 5, padding: 3 }}>
          {[['all', 'All'], ['logged', 'Logged'], ['unlogged', 'Unlogged'], ['heard', 'Heard']].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '7px 12px', border: 0, cursor: 'pointer', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.04em',
              background: filter === k ? 'var(--ink)' : 'transparent', color: filter === k ? 'var(--paper)' : 'var(--ink-soft)',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* table */}
      <div style={{ border: '1.5px solid var(--ink)', borderRadius: 8, background: 'var(--card)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <div className="cat-row cat-head">
          <SortTh label="#" k="rank" onClick={toggleSort} arrow={arrow} />
          <span />
          <SortTh label="Album" k="title" onClick={toggleSort} arrow={arrow} />
          <SortTh label="Artist" k="artist" onClick={toggleSort} arrow={arrow} className="cat-artist" />
          <SortTh label="Year" k="year" onClick={toggleSort} arrow={arrow} className="cat-year" />
          <SortTh label="You" k="mine" onClick={toggleSort} arrow={arrow} right />
        </div>
        {rows.map(a => <CatalogRow key={a.id} album={a} mine={myByAlbum[a.id]} onClick={() => goAlbum(a.id)} />)}
        {rows.length === 0 && <div style={{ padding: 40, textAlign: 'center' }} className="tag">no albums match “{q}”</div>}
      </div>
    </div>
  );
}

function SortTh({ label, k, onClick, arrow, right, className }) {
  return (
    <button onClick={() => onClick(k)} className={className}
      style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, textAlign: right ? 'right' : 'left',
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)',
        display: 'flex', alignItems: 'center', gap: 5, justifyContent: right ? 'flex-end' : 'flex-start' }}>
      {label} <span style={{ color: 'var(--accent)', fontSize: 8 }}>{arrow(k)}</span>
    </button>
  );
}

function CatalogRow({ album, mine, onClick }) {
  const status = !mine ? null : (mine.status === 'listening' ? 'listening' : mine.kind);
  return (
    <button onClick={onClick} className="cat-row cat-body"
      onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <span className="mono" style={{ fontSize: 14, color: 'var(--ink-faint)', fontWeight: 700 }}>{album.rank}</span>
      <span style={{ width: 40, height: 40 }}><Sleeve album={album} rounded /></span>
      <span style={{ minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.title}</span>
        <span className="cat-artist-inline" style={{ display: 'none', fontFamily: 'var(--font-quote)', fontSize: 14, color: 'var(--ink-soft)' }}>{album.artist}</span>
      </span>
      <span className="cat-artist" style={{ fontFamily: 'var(--font-quote)', fontSize: 16, color: 'var(--ink-soft)', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.artist}</span>
      <span className="cat-year mono" style={{ fontSize: 13, color: 'var(--ink-faint)', textAlign: 'left' }}>{album.year}</span>
      <span style={{ textAlign: 'right', justifySelf: 'end' }}>
        {!status && <span className="tag" style={{ color: 'var(--ink-faint)' }}>—</span>}
        {status === 'listening' && <span className="tag accent">listening</span>}
        {(status === 'fresh' || status === 'skip') && mine.rating != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {status === 'skip' && <span className="tag" style={{ color: 'var(--ink-faint)' }}>skip</span>}
            <ScoreBadge value={mine.rating} mode="number" max={10} />
          </span>
        )}
      </span>
    </button>
  );
}

Object.assign(window, { Catalog });
