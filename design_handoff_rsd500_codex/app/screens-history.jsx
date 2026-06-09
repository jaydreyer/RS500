/* History — scorecard grid (members × weeks) + per-member detail (PRD §7.4). */
const { useState } = React;

function History({ listens, goAlbum }) {
  const RSD = window.RSD;
  const [member, setMember] = useState(null);
  if (member) return <MemberDetail memberId={member} listens={listens} onBack={() => setMember(null)} goAlbum={goAlbum} />;

  const cell = (uid, wk) => listens.find(l => l.user === uid && l.kind === 'fresh' && l.week === wk);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <Eyebrow>the scorecard</Eyebrow>
      <h1 style={{ fontSize: 'clamp(36px,7vw,62px)', margin: '8px 0 4px' }}>History</h1>
      <p style={{ fontFamily: 'var(--font-quote)', fontSize: 18, color: 'var(--ink-soft)', maxWidth: 540, marginTop: 6 }}>
        Every fresh pick, crew × week. Tap a name to see everything they've logged.
      </p>

      <div style={{ overflowX: 'auto', marginTop: 26, border: '1.5px solid var(--ink)', borderRadius: 8, background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
          <thead>
            <tr>
              <th style={thLeft}>crew</th>
              {RSD.WEEKS.map(w => <th key={w} style={th}>{w.split('-')[1]}</th>)}
              <th style={th}>avg</th>
            </tr>
          </thead>
          <tbody>
            {RSD.MEMBERS.map(m => {
              const rated = listens.filter(l => l.user === m.id && l.rating != null);
              const avg = rated.length ? (rated.reduce((s, l) => s + l.rating, 0) / rated.length) : null;
              return (
                <tr key={m.id} style={{ borderTop: '1px solid var(--line-strong)' }}>
                  <td style={{ ...tdLeft }}>
                    <button onClick={() => setMember(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>
                      <Avatar id={m.id} size={30} ring={m.id === RSD.ME} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>{m.id === RSD.ME ? 'You' : m.name}</span>
                    </button>
                  </td>
                  {RSD.WEEKS.map(w => {
                    const c = cell(m.id, w);
                    return <td key={w} style={td}>{c ? <Cell listen={c} goAlbum={goAlbum} /> : <span style={{ color: 'var(--ink-faint)' }}>·</span>}</td>;
                  })}
                  <td style={{ ...td, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: avg >= 8 ? 'var(--good)' : 'var(--ink)' }}>
                    {avg ? avg.toFixed(1) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-faint)', padding: '12px 10px', textAlign: 'center', fontWeight: 400, whiteSpace: 'nowrap' };
const thLeft = { ...th, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--card)', zIndex: 2 };
const td = { padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' };
const tdLeft = { ...td, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--card)', zIndex: 1 };

function Cell({ listen, goAlbum }) {
  const RSD = window.RSD; const album = RSD.album(listen.album);
  const listening = listen.status === 'listening';
  return (
    <button onClick={() => goAlbum(album.id)} title={`${album.title} — ${album.artist}`}
      style={{ position: 'relative', width: 52, height: 52, padding: 0, border: '1px solid var(--line-strong)', borderRadius: 3, overflow: 'hidden', cursor: 'pointer', display: 'block', margin: '0 auto' }}>
      <Sleeve album={album} />
      <span style={{ position: 'absolute', inset: 0, background: listening ? 'transparent' : 'linear-gradient(to top, #000a, transparent 55%)' }} />
      <span style={{ position: 'absolute', right: 3, bottom: 2, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16,
        color: listening ? 'transparent' : '#fff', textShadow: '0 1px 3px #000' }}>
        {listening ? '' : listen.rating}
      </span>
      {listening && <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 99, background: 'var(--accent)', boxShadow: '0 0 0 1.5px #fff' }} />}
    </button>
  );
}

/* ---- per-member detail --------------------------------------------------- */
function MemberDetail({ memberId, listens, onBack, goAlbum }) {
  const RSD = window.RSD; const m = RSD.member(memberId);
  const mine = listens.filter(l => l.user === memberId).slice().reverse();
  const fresh = mine.filter(l => l.kind === 'fresh');
  const skips = mine.filter(l => l.kind === 'skip');
  const rated = mine.filter(l => l.rating != null);
  const avg = rated.length ? (rated.reduce((s, l) => s + l.rating, 0) / rated.length).toFixed(1) : '—';

  const Row = ({ l }) => {
    const a = RSD.album(l.album);
    return (
      <button onClick={() => goAlbum(a.id)} style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left',
        padding: '10px 6px', background: 'transparent', border: 0, borderBottom: '1px solid var(--line-strong)', cursor: 'pointer' }}>
        <div style={{ width: 46, flex: '0 0 auto' }}><Sleeve album={a} rounded /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>{a.title}</div>
          <div style={{ fontFamily: 'var(--font-quote)', fontSize: 15, color: 'var(--ink-soft)' }}>{a.artist} · #{a.rank}</div>
          {l.take && <div style={{ fontStyle: 'italic', fontFamily: 'var(--font-quote)', fontSize: 14, color: 'var(--ink-soft)', marginTop: 2 }}>“{l.take}”</div>}
        </div>
        <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
          {l.status === 'listening' ? <span className="tag accent">listening</span> : <ScoreBadge value={l.rating} mode="number" max={10} />}
          <div className="tag" style={{ marginTop: 2 }}>{l.kind} · {l.week.split('-')[1]}</div>
        </div>
      </button>
    );
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button onClick={onBack} className="mono" style={{ background: 'transparent', border: 0, color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← back to scorecard</button>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
        <Avatar id={memberId} size={56} ring={memberId === RSD.ME} />
        <div>
          <h1 style={{ fontSize: 'clamp(30px,6vw,46px)' }}>{memberId === RSD.ME ? 'You' : m.name}</h1>
          <div className="tag">@{m.handle}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 22, margin: '18px 0 26px' }}>
        <Stat label="fresh picks" value={fresh.length} />
        <Stat label="skips" value={skips.length} />
        <Stat label="avg score" value={avg} accentVal />
      </div>
      <Eyebrow style={{ marginBottom: 6 }}>everything logged</Eyebrow>
      <div>{mine.map(l => <Row key={l.id} l={l} />)}</div>
    </div>
  );
}

Object.assign(window, { History, MemberDetail });
