/* Album detail — big cover, listen link, crew scores, reactions (PRD §7.2, §8). */
const { useState } = React;

function AlbumDetail({ albumId, listens, reactions, onReact, onComment, onBack }) {
  const RSD = window.RSD; const a = RSD.album(albumId);
  const logs = listens.filter(l => l.album === albumId);
  const rated = logs.filter(l => l.rating != null);
  const crewAvg = rated.length ? (rated.reduce((s, l) => s + l.rating, 0) / rated.length).toFixed(1) : '—';
  const [comment, setComment] = useState('');

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <button onClick={onBack} className="mono" style={{ background: 'transparent', border: 0, color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13, marginBottom: 18 }}>← back</button>

      <div style={{ display: 'flex', gap: 'clamp(18px,4vw,40px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 'clamp(220px, 40vw, 320px)', flex: '0 0 auto' }}>
          <Sleeve album={a} />
          <a href="#" onClick={e => e.preventDefault()} style={{ marginTop: 14, display: 'flex' }}>
            <Btn variant="solid" full style={{ background: 'var(--good)', borderColor: 'var(--good)', color: '#fff' }}>
              <span style={{ width: 16, height: 16, borderRadius: 99, background: '#fff', display: 'inline-block' }} /> Play on Spotify
            </Btn>
          </a>
          <div className="mono" style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)', marginTop: 10 }}>RS rank #{a.rank} · {a.year}</div>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="tag accent">rolling stone 500 · #{a.rank}</div>
          <h1 style={{ fontSize: 'clamp(34px,7vw,58px)', margin: '8px 0 6px', textWrap: 'balance' }}>{a.title}</h1>
          <div style={{ fontFamily: 'var(--font-quote)', fontSize: 22, color: 'var(--ink-soft)' }}>{a.artist}</div>

          <div style={{ display: 'flex', gap: 24, margin: '24px 0', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, lineHeight: 1, color: crewAvg >= 8 ? 'var(--good)' : 'var(--ink)' }}>{crewAvg}</div>
              <div className="tag">crew average</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, lineHeight: 1.3 }}>{logs.length}</div>
              <div className="tag">crew logged it</div>
            </div>
          </div>

          <hr className="hairline" />
          <Eyebrow style={{ margin: '18px 0 12px' }}>who drew it</Eyebrow>
          <div style={{ display: 'grid', gap: 8 }}>
            {logs.length === 0 && <p className="tag">nobody in the crew has logged this yet</p>}
            {logs.map(l => {
              const m = RSD.member(l.user);
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line-strong)' }}>
                  <Avatar id={l.user} size={28} ring={l.user === RSD.ME} />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{l.user === RSD.ME ? 'You' : m.name}</span>
                  <span className="tag" style={{ background: l.kind === 'skip' ? 'var(--paper-2)' : 'transparent', padding: l.kind === 'skip' ? '2px 6px' : 0, borderRadius: 3 }}>{l.kind}</span>
                  {l.take && <span style={{ fontFamily: 'var(--font-quote)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{l.take}”</span>}
                  <span style={{ marginLeft: 'auto', flex: '0 0 auto' }}>{l.status === 'listening' ? <span className="tag accent">listening</span> : <ScoreBadge value={l.rating} mode="number" max={10} />}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* crew thread (reactions + short comments) */}
      <div style={{ marginTop: 32, border: '1.5px solid var(--ink)', borderRadius: 8, background: 'var(--card)', padding: 20, boxShadow: 'var(--shadow)' }}>
        <h3 style={{ fontSize: 20, marginBottom: 14 }}>Crew thread</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {logs.flatMap(l => reactions.filter(r => r.listen === l.id && r.comment)).map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar id={r.user} size={28} />
              <div><strong style={{ fontFamily: 'var(--font-display)' }}>{RSD.member(r.user)?.name}</strong>
                <span style={{ fontFamily: 'var(--font-quote)', fontSize: 16, color: 'var(--ink-soft)', marginLeft: 6 }}>{r.comment}</span></div>
            </div>
          ))}
          {logs.flatMap(l => reactions.filter(r => r.listen === l.id && r.comment)).length === 0 &&
            <p className="tag">no comments yet — start the thread</p>}
        </div>
        {logs[0] && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input value={comment} onChange={e => setComment(e.target.value.slice(0, 140))} placeholder="short comment…"
              style={{ flex: 1, padding: '10px 12px', border: '1.5px solid var(--line-strong)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font-quote)', fontSize: 16, borderRadius: 4, outline: 'none' }} />
            <Btn variant="accent" disabled={!comment.trim()} onClick={() => { onComment(logs[0].id, comment.trim()); setComment(''); }}>Post</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AlbumDetail });
