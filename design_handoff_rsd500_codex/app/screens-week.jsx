/* My Week — the draw experience (PRD §2, §4). The hero moment. */
const { useState, useRef, useEffect } = React;

function useDraw(listens, ratingMax) {
  const RSD = window.RSD;
  const myLogged = new Set(listens.filter(l => l.user === RSD.ME).map(l => l.album));
  const pool = RSD.ALBUMS.filter(a => !myLogged.has(a.id));
  const openFresh = listens.find(l => l.user === RSD.ME && l.kind === 'fresh' && l.status === 'listening');
  const drawOne = () => pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  return { pool, openFresh, drawOne };
}

function MyWeek({ listens, reactions, onLog, onUpdate, ratingMode, ratingMax, revealStyle, goAlbum }) {
  const RSD = window.RSD;
  const { pool, openFresh, drawOne } = useDraw(listens, ratingMax);
  const [phase, setPhase] = useState('idle');   // idle|spinning|presented|rate-skip|kept|blocked
  const [drawn, setDrawn] = useState(null);
  const [scramble, setScramble] = useState('000');
  const [toast, setToast] = useState(null);
  const reelRef = useRef();

  const fast = revealStyle === 'quick';
  const dur = fast ? 900 : revealStyle === 'tactile' ? 1500 : 1900;

  function startDraw() {
    if (pool.length === 0) { setToast("You've logged all 500 — legend."); return; }
    const target = drawOne();
    setDrawn(target);
    setPhase('spinning');
    // odometer scramble, decelerating (setTimeout so it runs even in bg tabs)
    const start = Date.now();
    function tick() {
      const t = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        setScramble(String(1 + Math.floor(Math.random() * 500)).padStart(3, '0'));
        setTimeout(tick, 30 + eased * 150);
      } else {
        setScramble(String(target.rank).padStart(3, '0'));
        setTimeout(() => setPhase('presented'), 240);
      }
    }
    tick();
  }

  function heard(yes) {
    if (yes) { setPhase('rate-skip'); return; }
    // keep as fresh — guard: one open fresh pick
    if (openFresh) { setPhase('blocked'); return; }
    onLog({ user: RSD.ME, album: drawn.id, kind: 'fresh', status: 'listening', rating: null, take: null, week: RSD.CURRENT_WEEK });
    setPhase('kept');
  }

  function submitSkip(rating, take) {
    onLog({ user: RSD.ME, album: drawn.id, kind: 'skip', status: 'rated', rating, take: take || null, week: RSD.CURRENT_WEEK });
    setToast(`Skipped & logged: ${drawn.title} — ${rating}/${ratingMax}`);
    setDrawn(null); setPhase('idle');
  }

  function reset() { setDrawn(null); setPhase('idle'); }

  const skipCount = listens.filter(l => l.user === RSD.ME && l.kind === 'skip').length;
  const myFreshCount = listens.filter(l => l.user === RSD.ME && l.kind === 'fresh').length;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 4px' }}>
      {/* status strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div>
          <Eyebrow>This is your draw · {RSD.CURRENT_WEEK.replace('-', ' ')}</Eyebrow>
          <h1 style={{ fontSize: 'clamp(34px, 7vw, 58px)', marginTop: 8 }}>My Week</h1>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <Stat label="picks kept" value={myFreshCount} />
          <Stat label="skips logged" value={skipCount} />
          <Stat label="pool left" value={pool.length} accentVal />
        </div>
      </div>

      {/* THE MACHINE */}
      <DrawMachine
        phase={phase} drawn={drawn} scramble={scramble} pool={pool}
        revealStyle={revealStyle} onDraw={startDraw} onHeard={heard} onReset={reset}
        onSubmitSkip={submitSkip} ratingMode={ratingMode} ratingMax={ratingMax}
        openFresh={openFresh} goAlbum={goAlbum} />

      {/* open fresh pick (listening) */}
      {openFresh && phase === 'idle' && (
        <NowListening listen={openFresh} ratingMode={ratingMode} ratingMax={ratingMax}
          onRate={(rating, take) => { onUpdate(openFresh.id, { rating, take: take || null, status: 'rated' }); setToast(`Rated ${RSD.album(openFresh.album).title} — ${rating}/${ratingMax}. Pick unlocked.`); }} />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function Stat({ label, value, accentVal }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: accentVal ? 'var(--accent)' : 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div className="tag" style={{ marginTop: 3 }}>{label}</div>
    </div>
  );
}

/* ---- The draw machine ---------------------------------------------------- */
function DrawMachine({ phase, drawn, scramble, pool, revealStyle, onDraw, onHeard, onReset, onSubmitSkip, ratingMode, ratingMax, openFresh, goAlbum }) {
  return (
    <div style={{
      position: 'relative', border: '2px solid var(--ink)', borderRadius: 8, background: 'var(--card)',
      boxShadow: 'var(--shadow)', overflow: 'hidden', minHeight: 420,
    }}>
      {/* perforated header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '2px dashed var(--line-strong)' }}>
        <span className="tag">RSD · 500 RANDOMIZER</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{pool.length} of 500 unlogged</span>
      </div>

      <div style={{ padding: 'clamp(22px, 5vw, 44px)', display: 'grid', placeItems: 'center', minHeight: 356 }}>
        {phase === 'idle' && <IdleFace onDraw={onDraw} hasOpen={!!openFresh} />}
        {phase === 'spinning' && <SpinFace scramble={scramble} revealStyle={revealStyle} />}
        {(phase === 'presented' || phase === 'rate-skip' || phase === 'kept' || phase === 'blocked') && drawn && (
          <PresentFace phase={phase} album={drawn} onHeard={onHeard} onReset={onReset}
            onSubmitSkip={onSubmitSkip} ratingMode={ratingMode} ratingMax={ratingMax}
            openFresh={openFresh} goAlbum={goAlbum} />
        )}
      </div>
    </div>
  );
}

function IdleFace({ onDraw, hasOpen }) {
  return (
    <div style={{ textAlign: 'center', animation: 'riseIn .4s ease both' }}>
      <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto 26px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, var(--ink) 0 18%, transparent 18.5%), repeating-radial-gradient(circle at 50% 50%, var(--line-strong) 0 1px, transparent 1px 4px)', border: '2px solid var(--ink)' }} />
        <div style={{ position: 'absolute', inset: '40%', borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700 }}>500</div>
      </div>
      <h2 style={{ fontSize: 'clamp(26px,5vw,40px)', maxWidth: 460 }}>Pull a record from the crate.</h2>
      <p style={{ color: 'var(--ink-soft)', maxWidth: 420, margin: '12px auto 26px', fontFamily: 'var(--font-quote)', fontSize: 18 }}>
        One album, drawn at random from the 500. No re-rolls. Discovery through constraint.
      </p>
      <Btn variant="accent" size="lg" onClick={onDraw} style={{ fontSize: 21, padding: '17px 40px', whiteSpace: 'nowrap' }}>◉ DRAW THIS WEEK</Btn>
      {hasOpen && <p className="tag" style={{ marginTop: 16 }}>you also have a pick still listening — rate it below</p>}
    </div>
  );
}

function SpinFace({ scramble, revealStyle }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 168, height: 168, margin: '0 auto 18px', borderRadius: '50%', border: '2px solid var(--ink)',
        background: 'radial-gradient(circle at 50% 50%, var(--ink) 0 16%, transparent 16.5%), repeating-radial-gradient(circle at 50% 50%, var(--line-strong) 0 1px, transparent 1px 3.5px)',
        animation: `spin360 ${revealStyle==='quick'?'.4s':'.7s'} linear infinite` }} />
      <div className="mono" style={{ fontSize: 'clamp(48px,12vw,90px)', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--accent)' }}>
        #{scramble}
      </div>
      <div className="tag" style={{ marginTop: 4 }}>spinning the crate…</div>
    </div>
  );
}

function PresentFace({ phase, album, onHeard, onReset, onSubmitSkip, ratingMode, ratingMax, openFresh, goAlbum }) {
  const RSD = window.RSD;
  return (
    <div style={{ width: '100%', maxWidth: 520, animation: 'riseIn .45s ease both' }}>
      <div style={{ display: 'flex', gap: 'clamp(14px,3vw,26px)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ width: 'clamp(150px,38vw,200px)', flex: '0 0 auto', perspective: 900 }}>
          <div style={{ animation: 'flipIn .7s cubic-bezier(.2,.7,.2,1) both', transformStyle: 'preserve-3d', cursor: 'pointer' }} onClick={() => goAlbum(album.id)}>
            <Sleeve album={album} />
          </div>
        </div>
        <div style={{ minWidth: 200, flex: 1 }}>
          <div className="tag" style={{ color: 'var(--accent)' }}>you drew · #{album.rank}</div>
          <h2 style={{ fontSize: 'clamp(24px,5vw,36px)', margin: '8px 0 4px' }}>{album.title}</h2>
          <div style={{ fontFamily: 'var(--font-quote)', fontSize: 19, color: 'var(--ink-soft)' }}>{album.artist} · {album.year}</div>
        </div>
      </div>

      <hr className="hairline" style={{ margin: '24px 0' }} />

      {phase === 'presented' && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, marginBottom: 16 }}>Have you already heard this one?</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn variant="accent" size="lg" onClick={() => onHeard(false)}>No — keep it as my pick</Btn>
            <Btn variant="ghost" size="lg" onClick={() => onHeard(true)}>Yes — rate it & redraw</Btn>
          </div>
          <p className="tag" style={{ marginTop: 14 }}>honor system · skips are public</p>
        </div>
      )}

      {phase === 'rate-skip' && (
        <RateForm kind="skip" album={album} ratingMode={ratingMode} ratingMax={ratingMax}
          onSubmit={onSubmitSkip} hint="You've heard it — log a quick score, then draw again." />
      )}

      {phase === 'kept' && (
        <div style={{ textAlign: 'center', animation: 'riseIn .4s ease both' }}>
          <div style={{ fontSize: 40 }}>📀</div>
          <h3 style={{ fontSize: 24, margin: '8px 0' }}>It's yours for the week.</h3>
          <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-quote)', fontSize: 18, maxWidth: 380, margin: '0 auto 20px' }}>
            Go listen. Rate it when you're done — that's what unlocks your next fresh draw.
          </p>
          <Btn variant="solid" onClick={onReset}>Back to my week</Btn>
        </div>
      )}

      {phase === 'blocked' && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, marginBottom: 8 }}>One pick at a time.</h3>
          <p style={{ color: 'var(--ink-soft)', maxWidth: 400, margin: '0 auto 18px', fontFamily: 'var(--font-quote)', fontSize: 18 }}>
            You're still listening to <strong>{RSD.album(openFresh.album).title}</strong>. Rate that first, then this one's yours.
            <br /><span className="tag">(you can still say "yes, heard it" to log a skip)</span>
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Btn variant="accent" onClick={() => onHeard(true)}>Actually, I've heard it</Btn>
            <Btn variant="quiet" onClick={onReset}>Go rate my pick</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- shared rate form ---------------------------------------------------- */
function RateForm({ album, ratingMode, ratingMax, onSubmit, hint, kind }) {
  const [rating, setRating] = useState(null);
  const [take, setTake] = useState('');
  return (
    <div style={{ animation: 'riseIn .35s ease both' }}>
      {hint && <p className="tag" style={{ textAlign: 'center', marginBottom: 14 }}>{hint}</p>}
      <div style={{ display: 'grid', placeItems: 'center', gap: 16 }}>
        <RatingInput value={rating} onChange={setRating} mode={ratingMode} max={ratingMax} />
        <input value={take} onChange={e => setTake(e.target.value.slice(0, 90))} placeholder="one-line take (optional)…"
          style={{ width: '100%', maxWidth: 440, padding: '12px 14px', border: '1.5px solid var(--line-strong)', background: 'var(--paper)',
            color: 'var(--ink)', fontFamily: 'var(--font-quote)', fontSize: 17, borderRadius: 4, outline: 'none' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--line-strong)'} />
        <Btn variant="accent" size="lg" disabled={rating == null} onClick={() => onSubmit(rating, take)}>
          {kind === 'skip' ? 'Log skip & draw again →' : 'Lock in my rating'}
        </Btn>
      </div>
    </div>
  );
}

/* ---- now-listening card -------------------------------------------------- */
function NowListening({ listen, ratingMode, ratingMax, onRate }) {
  const RSD = window.RSD; const album = RSD.album(listen.album);
  const [rating, setRating] = useState(null);
  const [take, setTake] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 26, border: '1.5px solid var(--line-strong)', borderRadius: 8, background: 'var(--card)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line-strong)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--accent)', animation: 'pulse 1.4s infinite' }} />
        <span className="tag">currently listening</span>
      </div>
      <div style={{ display: 'flex', gap: 16, padding: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 84, flex: '0 0 auto' }}><Sleeve album={album} rounded /></div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <h3 style={{ fontSize: 22 }}>{album.title}</h3>
          <div style={{ fontFamily: 'var(--font-quote)', color: 'var(--ink-soft)', fontSize: 17 }}>{album.artist} · {album.year}</div>
        </div>
        {!open && <Btn variant="accent" onClick={() => setOpen(true)}>I've finished — rate it</Btn>}
      </div>
      {open && (
        <div style={{ padding: '0 18px 20px' }}>
          <hr className="hairline" style={{ margin: '4px 0 16px' }} />
          <RateForm album={album} ratingMode={ratingMode} ratingMax={ratingMax} onSubmit={onRate} kind="fresh" />
        </div>
      )}
    </div>
  );
}

/* ---- toast --------------------------------------------------------------- */
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [msg]);
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 92, transform: 'translateX(-50%)', zIndex: 4000,
      background: 'var(--ink)', color: 'var(--paper)', padding: '12px 20px', borderRadius: 6, fontFamily: 'var(--font-mono)',
      fontSize: 13, boxShadow: 'var(--shadow)', animation: 'riseIn .3s ease both', maxWidth: '90vw' }}>{msg}</div>
  );
}

Object.assign(window, { MyWeek, Stat });
