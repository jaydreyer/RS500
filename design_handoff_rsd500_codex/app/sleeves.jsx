/* Procedural album sleeves. Deterministic art from album id so every cover
 * looks intentional and there are zero broken <img>s. In production these are
 * replaced by real `cover_url` from the seed dataset (PRD §8). */
(function () {
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  // Curated sleeve palettes — each its own little artwork, theme-independent.
  const PALS = [
    ['#E8E2D0', '#16130E', '#E2452B'], // bone / ink / vermillion
    ['#0E1A2B', '#EAF0F7', '#F2B53C'], // navy / cream / amber
    ['#F3E9DD', '#2A1A12', '#C9462C'], // sand / cocoa / brick
    ['#16110F', '#F1E4D2', '#E07A3E'], // espresso / cream / rust
    ['#10302C', '#EFE7D2', '#E9B949'], // pine / cream / gold
    ['#2A1430', '#F4E6F2', '#E64D8B'], // aubergine / blush / magenta
    ['#0C2230', '#E9F2F2', '#34B3A0'], // teal-dark / ice / aqua
    ['#3A0F12', '#F2DFC9', '#E8542F'], // oxblood / cream / orange
    ['#1C1C1C', '#EDEDED', '#D8D8D8'], // mono
    ['#13243B', '#F0EAD6', '#5C8BD6'], // indigo / parchment / blue
  ];

  function Sleeve({ album, rounded = false }) {
    if (!album) return null;
    const h = hash(album.artist + album.title + album.rank);
    const tpl = h % 6;
    const pal = PALS[(h >> 4) % PALS.length] || PALS[0];
    const bg = pal[0], ink = pal[1], acc = pal[2];
    const rot = (h >> 8) % 40 - 20;
    const id = 'sl' + album.id;

    const art = (() => {
      switch (tpl) {
        case 0: // concentric vinyl
          return <g>
            {[46,38,30,22,14].map((r,i) => <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={i%2?acc:ink} strokeWidth={i%2?2.2:1.1} opacity={i%2?1:0.5} />)}
            <circle cx="50" cy="50" r="7" fill={acc} />
            <circle cx="50" cy="50" r="2" fill={bg} />
          </g>;
        case 1: // bauhaus blocks
          return <g>
            <rect x="0" y="0" width="50" height="50" fill={acc} />
            <circle cx="75" cy="25" r="22" fill={ink} />
            <rect x="0" y="50" width="100" height="50" fill={ink} opacity="0.08" />
            <path d="M0 100 L50 50 L100 100 Z" fill={acc} opacity="0.85" />
          </g>;
        case 2: // halftone diagonal
          return <g>
            {Array.from({length: 7}).map((_,r) => Array.from({length: 7}).map((__,c) => {
              const d = (r + c) / 12;
              return <circle key={r+'-'+c} cx={8 + c*14} cy={8 + r*14} r={1 + d * 6.5} fill={ (r+c) % 5 === 0 ? acc : ink} opacity={0.85} />;
            }))}
          </g>;
        case 3: // sunburst
          return <g>
            {Array.from({length: 24}).map((_,i) => {
              const a = (i/24) * Math.PI * 2;
              return <line key={i} x1="50" y1="50" x2={50 + Math.cos(a)*70} y2={50 + Math.sin(a)*70} stroke={i%2?acc:ink} strokeWidth="6" opacity={i%2?0.9:0.18} />;
            })}
            <circle cx="50" cy="50" r="16" fill={bg} />
            <circle cx="50" cy="50" r="16" fill="none" stroke={ink} strokeWidth="1.5" />
          </g>;
        case 4: // stripes
          return <g>
            {Array.from({length: 9}).map((_,i) => <rect key={i} x={-20 + i*16} y="-20" width="8" height="140" fill={i%3===0?acc:ink} opacity={i%3===0?0.95:0.12} transform="rotate(18 50 50)" />)}
          </g>;
        default: // big initial mark
          return <g>
            <rect x="0" y="0" width="100" height="100" fill={ink} opacity="0.06" />
            <text x="50" y="58" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="62" fill={acc} style={{ letterSpacing: '-2px' }}>{(album.artist[0] || '?').toUpperCase()}</text>
          </g>;
      }
    })();

    return (
      <div className="sleeve" style={{ borderRadius: rounded ? '8px' : '2px' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }}>
          <rect x="0" y="0" width="100" height="100" fill={bg} />
          <g transform={`rotate(${tpl===1?0:rot} 50 50)`}>{art}</g>
          {/* film grain */}
          <rect x="0" y="0" width="100" height="100" fill="url(#grain)" opacity="0.5" />
          <defs>
            <filter id="gf"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
            <pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" filter="url(#gf)" opacity="0.06"/></pattern>
          </defs>
        </svg>
        {/* typographic caption baked onto the sleeve corner */}
        <div className="sleeve-cap">
          <span className="sleeve-rank" style={{ background: acc, color: bg }}>#{album.rank}</span>
        </div>
      </div>
    );
  }

  window.Sleeve = Sleeve;
})();
