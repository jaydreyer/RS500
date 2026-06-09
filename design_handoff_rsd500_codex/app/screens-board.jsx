/* The Board — current week, everyone's fresh pick, live (PRD §7.3). */

function Board({ listens, reactions, onReact, goAlbum, lastLive }) {
  const RSD = window.RSD;
  const week = RSD.CURRENT_WEEK;
  // one fresh pick per member this week (the headline pick)
  const cards = RSD.MEMBERS.map(m => {
    const pick = listens.find(l => l.user === m.id && l.kind === 'fresh' && l.week === week);
    return { member: m, pick };
  });
  const ratedCount = cards.filter(c => c.pick && c.pick.status === 'rated').length;
  const listeningCount = cards.filter(c => c.pick && c.pick.status === 'listening').length;

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 26 }}>
        <div>
          <Eyebrow><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--accent)', animation: 'liveBlink 1.2s infinite' }} />LIVE</span> · {week.replace('-', ' ')}</Eyebrow>
          <h1 style={{ fontSize: 'clamp(34px,7vw,62px)', marginTop: 8, whiteSpace: 'nowrap' }}>The Board</h1>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <Stat label="rated" value={ratedCount} />
          <Stat label="listening" value={listeningCount} accentVal />
          <Stat label="crew" value={RSD.MEMBERS.length} />
        </div>
      </div>

      {lastLive && (
        <div style={{ marginBottom: 18, padding: '10px 16px', border: '1.5px dashed var(--accent)', borderRadius: 6,
          fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-soft)', background: 'var(--card)', animation: 'riseIn .4s ease both' }}>
          <span className="accent">↻ just now</span> · {lastLive}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
        {cards.map(({ member, pick }) => (
          <BoardCard key={member.id} member={member} pick={pick} reactions={reactions}
            onReact={onReact} goAlbum={goAlbum} />
        ))}
      </div>
    </div>
  );
}

function BoardCard({ member, pick, reactions, onReact, goAlbum }) {
  const RSD = window.RSD;
  const isMe = member.id === RSD.ME;

  if (!pick) {
    return (
      <div style={{ border: '1.5px dashed var(--line-strong)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column',
        gap: 12, minHeight: 230, justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: 'var(--card)' }}>
        <Avatar id={member.id} size={40} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{isMe ? 'You' : member.name}</div>
        <div className="tag">{isMe ? "haven't drawn yet" : 'no pick this week'}</div>
        {isMe && <Btn variant="accent" size="sm" onClick={() => window.__rsdGo && window.__rsdGo('week')}>Draw your pick →</Btn>}
      </div>
    );
  }

  const album = RSD.album(pick.album);
  const listening = pick.status === 'listening';
  return (
    <div style={{ border: '1.5px solid var(--ink)', borderRadius: 8, background: 'var(--card)', overflow: 'hidden', boxShadow: 'var(--shadow)',
      display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line-strong)' }}>
        <Avatar id={member.id} size={30} ring={isMe} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{isMe ? 'You' : member.name}</div>
        <div style={{ marginLeft: 'auto' }}>
          {listening
            ? <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent)' }}><span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--accent)', animation: 'pulse 1.4s infinite' }} />listening</span>
            : <ScoreBadge value={pick.rating} mode="number" max={10} size="md" />}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, padding: 14 }}>
        <div style={{ width: 92, flex: '0 0 auto', cursor: 'pointer' }} onClick={() => goAlbum(album.id)}><Sleeve album={album} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>#{album.rank} · {album.year}</div>
          <h3 style={{ fontSize: 18, margin: '3px 0 2px', cursor: 'pointer' }} onClick={() => goAlbum(album.id)}>{album.title}</h3>
          <div style={{ fontFamily: 'var(--font-quote)', color: 'var(--ink-soft)', fontSize: 16 }}>{album.artist}</div>
        </div>
      </div>
      {pick.take && (
        <div style={{ padding: '0 14px 12px' }}>
          <p style={{ fontFamily: 'var(--font-quote)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}>
            “{pick.take}”
          </p>
        </div>
      )}
      {listening && !pick.take && (
        <div style={{ padding: '0 14px 12px' }}><p className="tag">take drops when they rate it</p></div>
      )}
      <div style={{ marginTop: 'auto', padding: '10px 14px', borderTop: '1px solid var(--line-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <ReactionRow listenId={pick.id} reactions={reactions} onAdd={onReact} />
        <a href="#" onClick={e => e.preventDefault()} className="mono" title="Play on Spotify"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--good)', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
          <span style={{ width: 14, height: 14, borderRadius: 99, background: 'var(--good)', display: 'inline-block' }} />PLAY
        </a>
      </div>
      {/* show first comment if any */}
      {reactions.filter(r => r.listen === pick.id && r.comment).slice(0, 1).map(r => (
        <div key={r.id} style={{ padding: '10px 14px', borderTop: '1px dashed var(--line-strong)', display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--paper-2)' }}>
          <Avatar id={r.user} size={22} />
          <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}><strong style={{ color: 'var(--ink)' }}>{window.RSD.member(r.user)?.name}</strong> {r.comment}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Board, BoardCard });
