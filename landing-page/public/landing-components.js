/* global React */

// ============================================================
// Data
// ============================================================

const GIGS = [
  {
    id: 'KR-0142',
    host: { name: 'Olive & Oak Catering', initials: 'OC', momentum: 842, band: 'elite' },
    title: 'Banquet server — wedding reception',
    location: 'Indiranagar, Bengaluru',
    distance: '2.4 km',
    pay: 1800,
    hours: '6 hrs',
    date: 'Sat, 17 May',
    skill: 'Hospitality',
    cover: 'HOSPITALITY · 18 PAX',
  },
  {
    id: 'KR-0156',
    host: { name: 'Verba Studios', initials: 'VS', momentum: 612, band: 'trusted' },
    title: 'Camera assistant — Versova short film',
    location: 'Versova, Mumbai',
    distance: '5.1 km',
    pay: 2400,
    hours: '10 hrs',
    date: 'Sun, 18 May',
    skill: 'Production',
    cover: 'FILM PROD · DAY SHIFT',
  },
  {
    id: 'KR-0188',
    host: { name: 'Bandra Books', initials: 'BB', momentum: 348, band: 'reliable' },
    title: 'Store assistant — weekend pop-up',
    location: 'Bandra W, Mumbai',
    distance: '1.2 km',
    pay: 950,
    hours: '5 hrs',
    date: 'Sat, 17 May',
    skill: 'Retail',
    cover: 'POP-UP · 5 HRS',
  },
  {
    id: 'KR-0204',
    host: { name: 'Loop Logistics', initials: 'LL', momentum: 921, band: 'legend' },
    title: 'Dispatch helper — same-day routes',
    location: 'Koramangala, Bengaluru',
    distance: '3.8 km',
    pay: 1400,
    hours: '7 hrs',
    date: 'Today',
    skill: 'Logistics',
    cover: 'LOGISTICS · TODAY',
  },
  {
    id: 'KR-0221',
    host: { name: 'Sundar Tea Co.', initials: 'ST', momentum: 489, band: 'reliable' },
    title: 'Barista — pop-up coffee bar',
    location: 'HSR Layout, Bengaluru',
    distance: '4.6 km',
    pay: 1100,
    hours: '6 hrs',
    date: 'Sun, 18 May',
    skill: 'F&B',
    cover: 'F&B · POP-UP',
  },
];

const BAND_COLOR = {
  newcomer: '#777575',
  building: '#ff7351',
  reliable: '#8097ff',
  trusted: '#FFC83D',
  elite: '#D4FF00',
  legend: '#F4EFE3',
};

const BAND_LABEL = {
  newcomer: 'Newcomer',
  building: 'Building',
  reliable: 'Reliable',
  trusted: 'Trusted',
  elite: 'Elite',
  legend: 'Legend',
};

// ============================================================
// Swipe stack — ticket / receipt card
// ============================================================

function SwipeCard({ gig, index, total, onSwiped, isTop, compact }) {
  const [drag, setDrag] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const startRef = React.useRef(null);
  const cardRef = React.useRef(null);

  const onPointerDown = (e) => {
    if (!isTop) return;
    setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY };
    cardRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging || !startRef.current) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  };
  const finishSwipe = (dir) => {
    setDragging(false);
    const exit = dir === 'up' ? { x: 0, y: -700 }
              : dir === 'right' ? { x: 700, y: 0 }
              : { x: -700, y: 0 };
    setDrag(exit);
    setTimeout(() => onSwiped(dir), 240);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    const { x, y } = drag;
    const upSwipe = y < -90 && Math.abs(y) > Math.abs(x);
    const sideSwipe = Math.abs(x) > 110;
    if (upSwipe) finishSwipe('up');
    else if (sideSwipe) finishSwipe(x > 0 ? 'right' : 'left');
    else {
      setDragging(false);
      setDrag({ x: 0, y: 0 });
    }
    startRef.current = null;
  };

  const depth = total - 1 - index;
  const baseY = depth * 10;
  const baseScale = 1 - depth * 0.035;
  const baseOpacity = depth > 2 ? 0 : 1 - depth * 0.1;
  const baseRotate = depth === 0 ? 0 : (index % 2 === 0 ? -0.6 : 0.8) * depth;

  const rot = drag.x / 22;
  const transform = isTop
    ? `translate(${drag.x}px, ${drag.y}px) rotate(${rot}deg)`
    : `translate(0, ${baseY}px) scale(${baseScale}) rotate(${baseRotate}deg)`;

  const applyOpacity = isTop ? Math.max(0, Math.min(1, -drag.y / 100)) : 0;
  const skipOpacity = isTop ? Math.max(0, Math.min(1, Math.abs(drag.x) / 110)) : 0;

  const c = BAND_COLOR[gig.host.band];

  return (
    <div
      ref={cardRef}
      className={"swipe-card" + (dragging ? " dragging" : "") + (compact ? " compact" : "")}
      style={{
        transform,
        zIndex: 10 + index,
        opacity: baseOpacity,
        pointerEvents: isTop ? 'auto' : 'none',
        cursor: isTop ? (dragging ? 'grabbing' : 'grab') : 'default',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="ticket-head">
        <span><span className="id">№ {gig.id}</span></span>
        <span>{gig.skill}</span>
      </div>

      <div className="pay-row">
        <div className="pay">₹{gig.pay.toLocaleString('en-IN')}</div>
        <div className="pay-sub">{gig.hours} · {gig.date}</div>
      </div>

      <div className="swipe-card-title">{gig.title}</div>
      <div className="swipe-card-loc">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M6 11s4-3.5 4-7a4 4 0 1 0-8 0c0 3.5 4 7 4 7Z" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="6" cy="4.2" r="1.4" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        {gig.location} · {gig.distance}
      </div>

      <div className="swipe-card-img" data-label={gig.cover} />

      <div className="swipe-card-meta">
        <div>Shift<strong>{gig.hours}</strong></div>
        <div>Skill<strong>{gig.skill}</strong></div>
        <div>From<strong>{gig.distance}</strong></div>
      </div>

      <div className="host-row">
        <div>
          <div className="host-name">{gig.host.name}</div>
          <div className="host-sub">Verified host</div>
        </div>
        <div className="host-momentum" style={{ color: c }}>
          {gig.host.momentum} · {BAND_LABEL[gig.host.band]}
        </div>
      </div>

      <div className="swipe-overlay apply" style={{ opacity: applyOpacity }}>
        <div className="badge">Applied ↑</div>
      </div>
      <div className="swipe-overlay skip" style={{ opacity: skipOpacity }}>
        <div className="badge">Skip ✕</div>
      </div>
    </div>
  );
}

// Compact mode for in-phone — condensed scaling on dark card
const compactStyle = `
.swipe-card.compact { padding: 14px; border-radius: 10px; }
.swipe-card.compact .ticket-head { font-size: 8.5px; margin-bottom: 8px; padding-bottom: 6px; }
.swipe-card.compact .pay { font-size: 26px; }
.swipe-card.compact .pay-sub { font-size: 8.5px; }
.swipe-card.compact .swipe-card-title { font-size: 15px; margin: 4px 0 4px; }
.swipe-card.compact .swipe-card-loc { font-size: 9px; }
.swipe-card.compact .swipe-card-img { height: 92px; margin-top: 10px; border-radius: 6px; }
.swipe-card.compact .swipe-card-img::after { font-size: 7.5px; padding: 2px 6px; }
.swipe-card.compact .swipe-card-meta { padding-top: 8px; gap: 4px; margin-top: 10px; }
.swipe-card.compact .swipe-card-meta div { font-size: 7.5px; letter-spacing: 0.08em; }
.swipe-card.compact .swipe-card-meta div strong { font-size: 10px; margin-top: 1px; }
.swipe-card.compact .host-row { margin-top: 8px; padding-top: 8px; }
.swipe-card.compact .host-row .host-name { font-size: 10px; }
.swipe-card.compact .host-row .host-sub { font-size: 7.5px; }
.swipe-card.compact .host-momentum { font-size: 8.5px; padding: 2px 6px; }
.swipe-card.compact .host-momentum::before { width: 4px; height: 4px; }
`;

function SwipeStack({ withInstructions = true, compact = false }) {
  const [deck, setDeck] = React.useState(GIGS);
  const [applied, setApplied] = React.useState(0);

  const onSwiped = (dir) => {
    if (dir === 'up') setApplied((a) => a + 1);
    setDeck((d) => d.slice(0, -1));
  };
  const reset = () => { setDeck(GIGS); setApplied(0); };

  return (
    <div className="swipe-stage" style={compact ? { width: 252, height: 380 } : null}>
      {deck.length === 0 ? (
        <div className="empty-state">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              ledger closed
            </div>
            <div className="big" style={{ marginTop: 8 }}>
              {applied} {applied === 1 ? 'gig' : 'gigs'} applied.
            </div>
            <button onClick={reset}>Re-open the deck</button>
          </div>
        </div>
      ) : (
        deck.map((gig, i) => (
          <SwipeCard
            key={gig.id}
            gig={gig}
            index={i}
            total={deck.length}
            isTop={i === deck.length - 1}
            onSwiped={onSwiped}
            compact={compact}
          />
        ))
      )}

      {withInstructions && deck.length > 0 && (
        <div className="swipe-instructions">
          <div className="key"><b>↑</b> apply</div>
          <div className="key"><b>← →</b> skip</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Skill graph (sketchier pentagon, integrated with ID card)
// ============================================================

const DIMENSIONS = [
  { key: 'show', name: 'Show rate',      val: 96, desc: 'Showed up to 96% of accepted gigs over the last 90 days.' },
  { key: 'time', name: 'On-time',        val: 92, desc: 'Arrived within the 10-minute window on 92% of check-ins.' },
  { key: 'perf', name: 'Performance',    val: 88, desc: 'Average host rating across completed shifts, weighted by recency.' },
  { key: 'comm', name: 'Communication',  val: 81, desc: 'Reply speed, clarity, and reliability of pre-shift messages.' },
  { key: 'prof', name: 'Professionalism',val: 90, desc: 'Dress code, conduct, and post-gig host commentary.' },
];

function SkillGraph({ active, setActive, size = 440 }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.32;
  const labelPadX = 100;
  const labelPadY = 30;
  const levels = [0.25, 0.5, 0.75, 1];

  const points = DIMENSIONS.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DIMENSIONS.length;
    return { angle, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });

  const valuePoints = DIMENSIONS.map((d, i) => {
    const r = (d.val / 100) * radius;
    const angle = points[i].angle;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  const polygon = valuePoints.map((p) => `${p.x},${p.y}`).join(' ');
  const viewBox = `${-labelPadX} ${-labelPadY} ${size + 2*labelPadX} ${size + 2*labelPadY}`;

  return (
    <div className="skill-graph-wrap">
      <svg viewBox={viewBox}>
        {/* concentric pentagons — dashed, sketchy */}
        {levels.map((lv) => (
          <polygon
            key={lv}
            points={points.map((p) => {
              const r = lv * radius;
              return `${cx + Math.cos(p.angle) * r},${cy + Math.sin(p.angle) * r}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(244,239,227,0.10)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}

        {/* axis lines */}
        {points.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(244,239,227,0.10)" strokeDasharray="2 4" />
        ))}

        {/* value polygon — slight noise via filter, lime fill */}
        <polygon
          points={polygon}
          fill="rgba(212, 255, 0, 0.18)"
          stroke="#D4FF00"
          strokeWidth="1.8"
          strokeLinejoin="round"
          style={{ transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />

        {/* second outline for hand-drawn doubled effect */}
        <polygon
          points={polygon}
          fill="none"
          stroke="#D4FF00"
          strokeWidth="0.8"
          strokeOpacity="0.5"
          strokeLinejoin="round"
          transform={`translate(1.5, -1)`}
        />

        {valuePoints.map((p, i) => {
          const isActive = active === DIMENSIONS[i].key;
          return (
            <g key={i}>
              <circle
                cx={p.x} cy={p.y}
                r={isActive ? 7 : 4}
                fill={isActive ? '#D4FF00' : 'var(--ink, #0E120D)'}
                stroke="#D4FF00"
                strokeWidth="1.8"
                style={{ transition: 'r 0.2s' }}
              />
              {isActive && (
                <text x={p.x} y={p.y - 16} textAnchor="middle" className="skill-graph-value">
                  {DIMENSIONS[i].val}
                </text>
              )}
            </g>
          );
        })}

        {points.map((p, i) => {
          const lx = cx + Math.cos(p.angle) * (radius + 30);
          const ly = cy + Math.sin(p.angle) * (radius + 30);
          const anchor = Math.abs(Math.cos(p.angle)) < 0.2 ? 'middle' : Math.cos(p.angle) > 0 ? 'start' : 'end';
          return (
            <text
              key={i}
              x={lx}
              y={ly + 4}
              textAnchor={anchor}
              className={"skill-graph-axis-label" + (active === DIMENSIONS[i].key ? ' active' : '')}
              onMouseEnter={() => setActive(DIMENSIONS[i].key)}
              onMouseLeave={() => setActive(null)}
            >
              {DIMENSIONS[i].name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================
// Inject compact card overrides (one-time)
// ============================================================

if (typeof document !== 'undefined' && !document.getElementById('__kria_compact_style')) {
  const s = document.createElement('style');
  s.id = '__kria_compact_style';
  s.textContent = compactStyle;
  document.head.appendChild(s);
}

// ============================================================
// Export
// ============================================================

Object.assign(window, {
  SwipeStack,
  SwipeCard,
  SkillGraph,
  GIGS,
  DIMENSIONS,
  BAND_COLOR,
  BAND_LABEL,
});
