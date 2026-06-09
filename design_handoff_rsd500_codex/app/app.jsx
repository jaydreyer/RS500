/* RSD 500 Randomizer — app root: routing, shell, live sim, tweaks. */
const { useState: useS, useEffect: useE, useRef: useR } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "newsprint",
  "accent": "default",
  "reveal": "cinematic",
  "rating": "number"
}/*EDITMODE-END*/;

const ACCENTS = {
  default: null,
  vermillion: '#E2452B',
  cobalt: '#2C4ED6',
  acid: '#B6D60A',
  magenta: '#FF3D8B',
  gold: '#E8A02F',
};
function inkFor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum > 0.6 ? '#16130c' : '#fff6ee';
}

const NAV = [
  { id: 'week', label: 'My Week', glyph: '◉' },
  { id: 'board', label: 'The Board', glyph: '▦' },
  { id: 'catalog', label: 'The 500', glyph: '≣' },
  { id: 'history', label: 'History', glyph: '▤' },
  { id: 'stats', label: 'Stats', glyph: '◴' },
];

function App() {
  const RSD = window.RSD;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [authed, setAuthed] = useS(false);
  const [route, setRoute] = useS('week');
  const [detail, setDetail] = useS(null);
  const [listens, setListens] = useS(() => RSD.LISTENS.map(l => ({ ...l })));
  const [reactions, setReactions] = useS(() => RSD.REACTIONS.map(r => ({ ...r })));
  const [lastLive, setLastLive] = useS(null);

  window.__rsdGo = (r) => { setDetail(null); setRoute(r); };

  // ---- live simulation (PRD §7.3 realtime feel) ----
  useE(() => {
    if (!authed) return;
    const events = [
      () => {
        // a listening pick gets rated
        const target = listens.find(l => l.user !== RSD.ME && l.status === 'listening' && l.week === RSD.CURRENT_WEEK);
        if (!target) return null;
        const rating = 6 + Math.floor(Math.random() * 5);
        setListens(ls => ls.map(l => l.id === target.id ? { ...l, status: 'rated', rating, take: l.take || 'just landed — live from the bus.' } : l));
        return `${RSD.member(target.user).name} just rated ${RSD.album(target.album).title} — ${rating}/10`;
      },
      () => {
        const target = listens.find(l => l.user !== RSD.ME && l.status === 'rated' && l.week === RSD.CURRENT_WEEK);
        if (!target) return null;
        const m = RSD.MEMBERS.filter(x => x.id !== target.user)[Math.floor(Math.random()*5)];
        const e = QUICK_EMOJI[Math.floor(Math.random()*QUICK_EMOJI.length)];
        setReactions(rs => [...rs, { id: 'rl' + Date.now(), listen: target.id, user: m.id, emoji: e, comment: null }]);
        return `${m.name} reacted ${e} to ${RSD.member(target.user).name}'s pick`;
      },
    ];
    const iv = setInterval(() => {
      const ev = events[Math.floor(Math.random() * events.length)];
      const msg = ev();
      if (msg) setLastLive(msg);
    }, 9000);
    return () => clearInterval(iv);
  }, [authed, listens]);

  function addListen(data) { setListens(ls => [...ls, { ...data, id: 'mine' + Date.now(), created: data.week }]); }
  function updateListen(id, patch) { setListens(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l)); }
  function addReaction(listenId, emoji) { setReactions(rs => [...rs, { id: 'r' + Date.now(), listen: listenId, user: RSD.ME, emoji, comment: null }]); }
  function addComment(listenId, comment) { setReactions(rs => [...rs, { id: 'c' + Date.now(), listen: listenId, user: RSD.ME, emoji: null, comment }]); }
  const goAlbum = (id) => setDetail(id);

  // ---- theme application ----
  const accentHex = ACCENTS[t.accent];
  const shellStyle = {};
  if (accentHex) { shellStyle['--accent'] = accentHex; shellStyle['--accent-ink'] = inkFor(accentHex); }

  useE(() => { document.documentElement.setAttribute('data-theme', t.theme); }, [t.theme]);

  if (!authed) {
    return (
      <div data-theme={t.theme} style={shellStyle}>
        <Auth onEnter={() => setAuthed(true)} />
        <TweakUI t={t} setTweak={setTweak} />
      </div>
    );
  }

  return (
    <div data-theme={t.theme} style={{ ...shellStyle, minHeight: '100vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <TopNav route={route} setRoute={r => { setDetail(null); setRoute(r); }} />
      <main style={{ padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,40px) 120px', maxWidth: 1280, margin: '0 auto' }}>
        {detail
          ? <AlbumDetail albumId={detail} listens={listens} reactions={reactions} onReact={addReaction} onComment={addComment} onBack={() => setDetail(null)} />
          : <>
              {route === 'week' && <MyWeek listens={listens} reactions={reactions} onLog={addListen} onUpdate={updateListen} ratingMode={t.rating} ratingMax={10} revealStyle={t.reveal} goAlbum={goAlbum} />}
              {route === 'board' && <Board listens={listens} reactions={reactions} onReact={addReaction} goAlbum={goAlbum} lastLive={lastLive} />}
              {route === 'catalog' && <Catalog listens={listens} goAlbum={goAlbum} />}
              {route === 'history' && <History listens={listens} goAlbum={goAlbum} />}
              {route === 'stats' && <Stats listens={listens} goAlbum={goAlbum} />}
            </>}
      </main>
      <BottomNav route={route} setRoute={r => { setDetail(null); setRoute(r); }} />
      <TweakUI t={t} setTweak={setTweak} />
    </div>
  );
}

/* ---- top nav (desktop) --------------------------------------------------- */
function TopNav({ route, setRoute }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'var(--paper)', borderBottom: '1.5px solid var(--ink)',
      display: 'flex', alignItems: 'center', gap: 16, padding: '12px clamp(16px,4vw,40px)' }}>
      <div onClick={() => setRoute('week')} style={{ cursor: 'pointer' }}><BrandMark /></div>
      <nav className="topnav-links" style={{ marginLeft: 24, display: 'flex', gap: 4 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setRoute(n.id)} style={{
            background: route === n.id ? 'var(--ink)' : 'transparent', color: route === n.id ? 'var(--paper)' : 'var(--ink-soft)',
            border: 0, padding: '9px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
          }}>{n.label}</button>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{window.RSD.CURRENT_WEEK.replace('-', ' ')}</span>
        <Avatar id={window.RSD.ME} size={32} ring />
      </div>
    </header>
  );
}

/* ---- bottom nav (mobile) ------------------------------------------------- */
function BottomNav({ route, setRoute }) {
  return (
    <nav className="bottomnav" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000,
      background: 'var(--paper)', borderTop: '1.5px solid var(--ink)', display: 'none',
      paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${NAV.length},1fr)` }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setRoute(n.id)} style={{
            background: 'transparent', border: 0, padding: '10px 4px 12px', cursor: 'pointer',
            color: route === n.id ? 'var(--accent)' : 'var(--ink-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{n.glyph}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.02em' }}>{n.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ---- tweaks panel -------------------------------------------------------- */
function TweakUI({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Visual direction" />
      <TweakRadio label="Theme" value={t.theme} options={['newsprint', 'afterhours', 'riso']} onChange={v => setTweak('theme', v)} />
      <TweakColor label="Accent" value={t.accent === 'default' ? '#E2452B' : ACCENTS[t.accent]}
        options={['#E2452B', '#2C4ED6', '#B6D60A', '#FF3D8B', '#E8A02F']}
        onChange={hex => { const key = Object.keys(ACCENTS).find(k => ACCENTS[k] === hex) || 'default'; setTweak('accent', key); }} />
      <TweakSection label="The draw" />
      <TweakRadio label="Reveal" value={t.reveal} options={['cinematic', 'quick', 'tactile']} onChange={v => setTweak('reveal', v)} />
      <TweakSection label="Scoring" />
      <TweakRadio label="Rating scale" value={t.rating} options={['number', 'stars']} onChange={v => setTweak('rating', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
