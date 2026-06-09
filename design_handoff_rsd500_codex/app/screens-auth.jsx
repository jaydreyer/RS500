/* Auth — login + invite-gated signup (PRD §2, §7.1). The front door. */
const { useState } = React;

function Auth({ onEnter }) {
  const RSD = window.RSD;
  const [mode, setMode] = useState('signup'); // signup | login
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState(null);

  function submit() {
    if (mode === 'signup') {
      if (code.trim().toUpperCase() !== RSD.INVITE_CODE) { setErr('That invite code isn\u2019t valid. Ask the crew.'); return; }
      if (!email || !name) { setErr('Need a name and email.'); return; }
    }
    onEnter();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', placeItems: 'stretch' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', minHeight: '100vh' }}>
        {/* left — brand marquee */}
        <div style={{ position: 'relative', background: 'var(--paper-2)', color: 'var(--ink)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(28px,5vw,56px)' }}>
          <BrandMark light />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none',
            backgroundImage: 'repeating-linear-gradient(0deg, var(--ink) 0 1px, transparent 1px 6px)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(48px,9vw,108px)', lineHeight: 0.92, letterSpacing: '-0.03em' }}>
              500<br /><span style={{ color: 'var(--accent)' }}>albums.</span><br />one<br />at a time.
            </div>
            <p style={{ fontFamily: 'var(--font-quote)', fontSize: 'clamp(17px,2.4vw,21px)', maxWidth: 380, marginTop: 22, color: 'var(--ink-soft)' }}>
              A private listening club built on Rolling Stone's 500 Greatest Albums. Draw at random. No re-rolls. Argue about scores.
            </p>
          </div>
          <div className="mono" style={{ position: 'relative', fontSize: 12, opacity: 0.6, display: 'flex', gap: 16 }}>
            <span>INVITE ONLY</span><span>·</span><span>{RSD.MEMBERS.length} IN THE CREW</span>
          </div>
          {/* spinning record motif */}
          <div style={{ position: 'absolute', right: '-90px', bottom: '-90px', width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, var(--accent) 0 12%, transparent 12.5%), repeating-radial-gradient(circle at 50% 50%, #ffffff22 0 1px, transparent 1px 5px)',
            border: '2px solid #ffffff22', animation: 'spin360 14s linear infinite' }} />
        </div>

        {/* right — form */}
        <div style={{ display: 'grid', placeItems: 'center', padding: 'clamp(24px,5vw,48px)' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 26, border: '1.5px solid var(--ink)', borderRadius: 5, padding: 4 }}>
              {['signup', 'login'].map(m => (
                <button key={m} onClick={() => { setMode(m); setErr(null); }} style={{
                  flex: 1, padding: '10px', border: 0, cursor: 'pointer', borderRadius: 3, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
                  background: mode === m ? 'var(--ink)' : 'transparent', color: mode === m ? 'var(--paper)' : 'var(--ink-soft)',
                }}>{m === 'signup' ? 'Join with code' : 'Log in'}</button>
              ))}
            </div>

            <h2 style={{ fontSize: 30, marginBottom: 6 }}>{mode === 'signup' ? 'Got an invite?' : 'Welcome back.'}</h2>
            <p style={{ fontFamily: 'var(--font-quote)', fontSize: 17, color: 'var(--ink-soft)', marginBottom: 24 }}>
              {mode === 'signup' ? 'The crew shares one code. Enter it to claim a spot.' : 'Pick up where you left off.'}
            </p>

            <div style={{ display: 'grid', gap: 12 }}>
              {mode === 'signup' && (
                <Field label="Invite code" hint="try NEEDLE-DROP">
                  <input value={code} onChange={e => { setCode(e.target.value); setErr(null); }} placeholder="CREW-CODE"
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' }} />
                </Field>
              )}
              {mode === 'signup' && <Field label="Display name"><input value={name} onChange={e => setName(e.target.value)} placeholder="what the board calls you" style={inputStyle} /></Field>}
              <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@crew.fm" style={inputStyle} /></Field>
              <Field label="Password"><input type="password" defaultValue="" placeholder="••••••••" style={inputStyle} /></Field>
            </div>

            {err && <div style={{ marginTop: 14, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>✕ {err}</div>}

            <div style={{ marginTop: 22 }}>
              <Btn variant="accent" size="lg" full onClick={submit}>{mode === 'signup' ? 'Claim my spot →' : 'Enter the club →'}</Btn>
            </div>
            <p className="tag" style={{ textAlign: 'center', marginTop: 16 }}>strangers can't get in · server-validated code</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span className="tag">{label}</span>
        {hint && <span className="tag accent">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--line-strong)', background: 'var(--card)', color: 'var(--ink)', fontSize: 16, borderRadius: 4, outline: 'none', fontFamily: 'var(--font-body)' };

/* brand wordmark */
function BrandMark({ light }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 4px ' + (light ? 'var(--ink)' : 'var(--paper)') }}>
        <span style={{ width: 5, height: 5, borderRadius: 99, background: light ? 'var(--ink)' : 'var(--paper)' }} />
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>RSD<span className="accent"> 500</span></span>
    </div>
  );
}

Object.assign(window, { Auth, BrandMark });
