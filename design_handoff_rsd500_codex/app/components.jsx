/* Shared UI for RSD 500 Randomizer */
const { useState, useRef, useEffect } = React;

/* ---- Avatar -------------------------------------------------------------- */
function Avatar({ id, size = 32, ring = false }) {
  const m = window.RSD.member(id);
  if (!m) return null;
  const bg = `oklch(0.62 0.16 ${m.hue})`;
  return (
    <div title={m.name} style={{
      width: size, height: size, borderRadius: '50%', flex: '0 0 auto',
      background: bg, color: '#fff', display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: size * 0.36,
      letterSpacing: '0.02em', boxShadow: ring ? '0 0 0 2px var(--paper), 0 0 0 3.5px ' + bg : 'inset 0 0 0 1px #0003',
      userSelect: 'none',
    }}>{m.initials}</div>
  );
}

/* ---- Score badge (display) ---------------------------------------------- */
function ScoreBadge({ value, mode = 'number', max = 10, size = 'md' }) {
  if (value == null) return null;
  if (mode === 'stars') {
    const stars5 = (value / max) * 5;
    return (
      <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: size === 'lg' ? 18 : 13, color: 'var(--accent)' }}>
        {[0,1,2,3,4].map(i => {
          const fill = Math.max(0, Math.min(1, stars5 - i));
          return <Star key={i} fill={fill} px={size === 'lg' ? 18 : 13} />;
        })}
      </span>
    );
  }
  const px = size === 'lg' ? 30 : size === 'sm' ? 14 : 20;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1 }}>
      <span style={{ fontSize: px, color: 'var(--ink)' }}>{value}</span>
      <span style={{ fontSize: px * 0.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontWeight: 400 }}>/{max}</span>
    </span>
  );
}
function Star({ fill, px }) {
  const id = 'st' + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24">
      <defs><linearGradient id={id}><stop offset={fill * 100 + '%'} stopColor="var(--accent)" /><stop offset={fill * 100 + '%'} stopColor="var(--line-strong)" /></linearGradient></defs>
      <path fill={`url(#${id})`} d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.8 5.9 20.3 7.2 13.6l-5-4.6 6.8-.8z" />
    </svg>
  );
}

/* ---- Rating input (interactive) ----------------------------------------- */
function RatingInput({ value, onChange, mode = 'number', max = 10 }) {
  const [hover, setHover] = useState(null);
  if (mode === 'stars') {
    const cur = hover != null ? hover : (value != null ? (value / max) * 10 : 0); // 0..10 => 5 stars halves
    return (
      <div style={{ display: 'flex', gap: 6 }} onMouseLeave={() => setHover(null)}>
        {[0,1,2,3,4].map(i => {
          const segVal = i * 2; // each star = 2 points (1-10 scale)
          const fill = Math.max(0, Math.min(1, (cur - i*2) / 2));
          return (
            <div key={i} style={{ position: 'relative', cursor: 'pointer' }}>
              <div onMouseEnter={() => setHover(i*2 + 1)} onClick={() => onChange(i*2 + 1)}
                   style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }} />
              <div onMouseEnter={() => setHover(i*2 + 2)} onClick={() => onChange(i*2 + 2)}
                   style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }} />
              <Star fill={fill} px={38} />
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} onMouseLeave={() => setHover(null)}>
      {Array.from({ length: max }).map((_, i) => {
        const n = i + 1;
        const active = (hover != null ? n <= hover : n <= (value || 0));
        return (
          <button key={n} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}
            style={{
              width: 38, height: 44, border: '1.5px solid ' + (active ? 'var(--accent)' : 'var(--line-strong)'),
              background: active ? 'var(--accent)' : 'transparent', color: active ? 'var(--accent-ink)' : 'var(--ink-soft)',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, cursor: 'pointer', borderRadius: 3,
              transition: 'all .12s',
            }}>{n}</button>
        );
      })}
    </div>
  );
}

/* ---- Button -------------------------------------------------------------- */
function Btn({ children, onClick, variant = 'solid', size = 'md', full = false, disabled = false, style = {} }) {
  const base = {
    fontFamily: 'var(--font-display)', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1.5px solid var(--ink)', borderRadius: 3, transition: 'transform .08s, background .15s, color .15s',
    letterSpacing: '-0.01em', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: full ? '100%' : 'auto', opacity: disabled ? 0.45 : 1,
    padding: size === 'lg' ? '15px 26px' : size === 'sm' ? '7px 12px' : '11px 18px',
    fontSize: size === 'lg' ? 18 : size === 'sm' ? 13 : 15,
  };
  const variants = {
    solid: { background: 'var(--ink)', color: 'var(--paper)' },
    accent: { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' },
    ghost: { background: 'transparent', color: 'var(--ink)' },
    quiet: { background: 'transparent', color: 'var(--ink-soft)', border: '1.5px solid var(--line-strong)' },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'translateY(1px)')}
      onMouseUp={e => (e.currentTarget.style.transform = '')}
      onMouseLeave={e => (e.currentTarget.style.transform = '')}
      style={{ ...base, ...variants[variant], ...style }}>{children}</button>
  );
}

/* ---- Reactions ----------------------------------------------------------- */
const QUICK_EMOJI = ['🔥','💯','❤️','🤯','😵','🎷','👀','😴'];
function ReactionRow({ listenId, reactions, onAdd, compact = false }) {
  const [open, setOpen] = useState(false);
  const mine = reactions.filter(r => r.listen === listenId);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {mine.filter(r => r.emoji).map(r => (
        <span key={r.id} title={window.RSD.member(r.user)?.name} style={{
          fontSize: 14, padding: '2px 7px', background: 'var(--paper-2)', borderRadius: 99,
          border: '1px solid var(--line-strong)', lineHeight: 1.6,
        }}>{r.emoji}</span>
      ))}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: 26, height: 26, borderRadius: 99, border: '1px dashed var(--line-strong)',
          background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 15, lineHeight: 1,
        }}>+</button>
        {open && (
          <div style={{
            position: 'absolute', bottom: '130%', left: 0, display: 'flex', gap: 2, padding: 6, zIndex: 30,
            background: 'var(--card)', border: '1.5px solid var(--ink)', borderRadius: 6, boxShadow: 'var(--shadow)',
          }}>
            {QUICK_EMOJI.map(e => (
              <button key={e} onClick={() => { onAdd(listenId, e); setOpen(false); }}
                style={{ fontSize: 18, background: 'transparent', border: 0, cursor: 'pointer', padding: 3, borderRadius: 4 }}
                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--paper-2)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Section heading ----------------------------------------------------- */
function Eyebrow({ children, style = {} }) {
  return <div className="tag" style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
    <span style={{ width: 18, height: 2, background: 'var(--accent)' }} />{children}
  </div>;
}

Object.assign(window, { Avatar, ScoreBadge, Star, RatingInput, Btn, ReactionRow, Eyebrow, QUICK_EMOJI });
