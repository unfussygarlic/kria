/* global React, ReactDOM, SwipeStack, SkillGraph, DIMENSIONS, BAND_COLOR, BAND_LABEL */

// ============================================================
// Nav
// ============================================================

function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="logo" href="#">
          <span>kria</span>
          <small>India · 2026</small>
        </a>
        <nav className="nav-links">
          <a href="#pocket">Pocket</a>
          <a href="#grid">Grid</a>
          <a href="#momentum">Momentum</a>
          <a href="https://grid.trykria.com" className="btn btn-primary nav-cta" style={{ padding: '10px 18px', fontSize: 13 }}>
            Post a gig <span>→</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

// ============================================================
// Ticker — rolling activity strip
// ============================================================

const TICKER_ITEMS = [
  ['Anika P.', 'just hit 900 — Legend band'],
  ['Olive & Oak', 'posted 3 shifts · Indiranagar'],
  ['Today', '142 gigs live across 8 cities'],
  ['Verba Studios', 'filled a 10-hour shoot in 9 minutes'],
  ['₹18.4L', 'paid out to Runners this week'],
  ['Rohan M.', 'completed his 64th gig in Koramangala'],
  ['Bandra Books', 'is hiring for the weekend pop-up'],
  ['94%', 'of accepted gigs got a check-in this month'],
];

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((it, i) => (
          <span key={i}>
            <span className="sep"></span>
            <b>{it[0]}</b> {it[1]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Hero
// ============================================================

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-left">
          <div className="hero-meta-top">
            <span className="stamp">Issue 04 · May 2026</span>
            <span className="filed">Filed from Bengaluru, 28.6° C</span>
          </div>

          <h1 className="h-display">
            Short gigs.<br/>
            Long <em>momentum.</em>
          </h1>

          <p className="hero-lead">
            There are <span className="ink">12 million daily-wage workers</span> in India who can't put <i>reliable</i> on a CV. kria is the receipt book that proves it for them — and the dashboard that lets Hosts hire by track record, not a paragraph of hopes.
          </p>

          <div className="hero-cta-row">
            <a href="https://grid.trykria.com" className="btn btn-primary">
              Post a gig on Grid
              <span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10m0 0L7.5 2.5M12 7l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </a>
            <a href="#pocket" className="btn btn-ghost">Pocket — coming soon</a>
            <span className="hero-cta-meta">Free until you fill it.</span>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-cta-arrow">
            <svg width="200" height="100" viewBox="0 0 200 100" fill="none">
              <path d="M14 22 C 40 8, 90 8, 130 36 S 184 70, 178 92" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M170 86 L 178 92 L 168 96" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="label">try it ↘</span>
          </div>
          <SwipeStack />
        </div>
      </div>

      <div className="container">
        <div className="hero-ribbon">
          <div className="col">
            <div className="lbl">Runners onboarded</div>
            <div className="val">12,418</div>
            <div className="sub">Bengaluru, Mumbai, Pune, Hyderabad</div>
          </div>
          <div className="col">
            <div className="lbl">Median apply → accept</div>
            <div className="val">8 min, 12 sec</div>
            <div className="sub">Across all gigs filed last week</div>
          </div>
          <div className="col">
            <div className="lbl">Show-up rate</div>
            <div className="val">94.2%</div>
            <div className="sub">OTP-confirmed arrivals at check-in</div>
          </div>
          <div className="col">
            <div className="lbl">Paid out, last 30 days</div>
            <div className="val">₹2.8 Cr</div>
            <div className="sub">Wages settled within 48 hours</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Pull quote — bridge between sections
// ============================================================

function PullQuote({ label, quote, cite }) {
  return (
    <section className="pull-quote">
      <div className="container">
        <div className="label">{label}</div>
        <div>
          <q>{quote}</q>
          <cite>— {cite}</cite>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Pocket section
// ============================================================

const POCKET_FEATURES = [
  { n: '01', tag: 'Swipe', title: 'A deck, not a search bar.', body: 'Live gigs nearby are stacked like cards. Swipe up to apply, sideways to skip. No forms, no cover letters, no "we\'ll be in touch."' },
  { n: '02', tag: 'GPS', title: 'Nearest first.',              body: 'You\'ll only ever see what you can actually reach — ranked by distance, timing, and how the Host\'s track record matches yours.' },
  { n: '03', tag: 'OTP', title: 'Four digits, in person.',       body: 'Check in to your shift with a code the Host scans. No location guesswork. No he-said-she-said about whether you showed up.' },
  { n: '04', tag: 'KYC', title: 'Verified, not just claimed.', body: 'Aadhaar, PAN, DL, Passport, Voter ID — each ID you clear earns a visible chip on your profile. Hosts see what you\'ve proved, not what you\'ve typed.' },
];

function PocketSection() {
  return (
    <section className="section pocket-section" id="pocket">
      <div className="container">
        <div className="section-head">
          <div className="kicker"><span className="pin"></span>Field gear — for Runners</div>
          <h2 className="h-section">Open the app. The work <em>is already nearby.</em></h2>
          <p className="lead">
            Pocket is the Runner-side mobile app. Browse live gigs by GPS, apply with a swipe, and build a Momentum Score over every shift you complete. <span style={{ color: 'var(--text)' }}>Track record &gt; resume.</span>
          </p>
        </div>

        <div className="pocket-grid">
          <div className="phone-col">
            <PhoneMockup />
            <div className="phone-annotations">
              <div className="ann a1 left">
                <span style={{ maxWidth: 180 }}>nearest gigs surface first</span>
                <svg width="120" height="20" viewBox="0 0 120 20" fill="none">
                  <path d="M0 10 C 30 14, 70 8, 116 11" stroke="#D4FF00" strokeWidth="1.5" fill="none"/>
                  <path d="M110 6 L 116 11 L 108 14" stroke="#D4FF00" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
              <div className="ann a2 right">
                <span style={{ maxWidth: 180 }}>swipe up to apply ↑</span>
                <svg width="120" height="20" viewBox="0 0 120 20" fill="none">
                  <path d="M120 10 C 90 5, 50 16, 4 9" stroke="#D4FF00" strokeWidth="1.5" fill="none"/>
                  <path d="M10 5 L 4 9 L 12 13" stroke="#D4FF00" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
              <div className="ann a3 left">
                <span style={{ maxWidth: 180 }}>Host's Momentum<br/>before you apply</span>
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
                  <path d="M0 8 C 40 10, 60 28, 116 30" stroke="#D4FF00" strokeWidth="1.5" fill="none"/>
                  <path d="M110 25 L 116 30 L 108 33" stroke="#D4FF00" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="feature-list">
            {POCKET_FEATURES.map((f) => (
              <div key={f.n} className="feature">
                <div className="num">{f.n}</div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.body}</p>
                  <span className="tag">{f.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="phone">
      <div className="phone-screen">
        <div className="phone-notch"></div>
        <div className="phone-statusbar">
          <span>9:41</span>
          <div className="icons">
            <span>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 9h2v-2H1zM5 9h2v-5H5zM9 9h2V1H9z" fill="currentColor"/></svg>
            </span>
            <span>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><rect x="1" y="3" width="11" height="6" rx="1.2" stroke="currentColor" strokeWidth="1"/><rect x="3" y="5" width="6" height="2" fill="currentColor"/></svg>
            </span>
          </div>
        </div>

        <div className="app-head">
          <div>
            <div className="greet">Hi, Priya.</div>
            <div className="sub">7 gigs near you</div>
          </div>
          <div className="avatar">P</div>
        </div>

        <div className="app-filters">
          <div className="pill active">All</div>
          <div className="pill">Today</div>
          <div className="pill">F&amp;B</div>
          <div className="pill">Retail</div>
        </div>

        <div className="app-stack">
          <SwipeStack withInstructions={false} compact={true} />
        </div>

        <div className="phone-tab">
          <div className="t active">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.4"/><path d="M3 9h14" stroke="currentColor" strokeWidth="1.4"/></svg>
            <span>Gigs</span>
          </div>
          <div className="t">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><polygon points="10,3 17,17 3,17" stroke="currentColor" strokeWidth="1.4" fill="none"/></svg>
            <span>Momentum</span>
          </div>
          <div className="t">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4"/></svg>
            <span>Me</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Grid section
// ============================================================

const RECENT_GIGS = [
  { name: 'Lead anchor',                                     host: 'Mama',                       cat: 'Promoter',           city: 'Bangalore', date: ['11', 'May'], slots: '1/1',   status: 'progress' },
  { name: 'Saturday wedding — banquet servers',               host: 'Olive & Oak Catering',       cat: 'Hospitality',        city: 'Bangalore', date: ['17', 'May'], slots: '8/12',  status: 'progress' },
  { name: 'Chennai Auto Expo — Tech Support Crew',            host: 'Chennai Trade Centre',       cat: 'Event Tech Support', city: 'Chennai',   date: ['10', 'Jun'], slots: '1/5',   status: 'open' },
  { name: 'Flipkart Big Shopping Days — Lead Generation',     host: 'Flipkart',                   cat: 'Lead Collection',    city: 'Hyderabad', date: ['22', 'May'], slots: '4/8',   status: 'open' },
  { name: 'Sunburn Festival — Crowd Safety',                  host: 'Sunburn Entertainment',      cat: 'Usher',              city: 'Goa',       date: ['18', 'May'], slots: '15/20', status: 'open' },
];

const SIDEBAR_ITEMS = [
  { key: 'dashboard',     label: 'Dashboard',    icon: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )},
  { key: 'gigs',          label: 'Gigs',         icon: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="5" width="12" height="9" rx="1.4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M6 5V3.5A1 1 0 0 1 7 2.5h2a1 1 0 0 1 1 1V5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )},
  { key: 'applications',  label: 'Applications', icon: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1.4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )},
  { key: 'events',        label: 'Events',       icon: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )},
  { key: 'analytics',     label: 'Analytics',    icon: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 13V8M7.5 13V4M12 13V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M2 13.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )},
  { key: 'profile',       label: 'Profile',      icon: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3 13.5c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )},
];

function GridSection() {
  return (
    <section className="section grid-section" id="grid">
      <div className="container">
        <div className="section-head">
          {/* <div className="kicker"><span className="pin"></span>Live — for Hosts</div> */}
          <h2 className="h-section">Post a gig at <em>3:42 pm.</em><br/>Watch it fill before <em>chai.</em></h2>
        </div>

        <div className="lede">
          <p className="body-lg" style={{ margin: 0 }}>
            Grid is the Host-side web dashboard — already live at <span className="scribble">grid.trykria.com</span>. Post a shift with GPS pinning, browse applicants with their full Momentum, accept who you trust, and run OTP check-ins on the day.
          </p>
          <p className="right">
            Catering, retail, events, film production, hospitality — anyone hiring for less than a week, in any of eight cities. No staffing-agency cut. No phone calls.
          </p>
        </div>

        <div className="grid-wrap">
          <div className="live-stamp">
            <span className="stamp">● Live · grid.trykria.com</span>
          </div>
          <div className="grid-titlebar">
            <div className="dots"><span></span><span></span><span></span></div>
            <div className="url">grid.trykria.com / dashboard</div>
            <div style={{ width: 40 }}></div>
          </div>

          <div className="grid-body">
            {/* Sidebar */}
            <aside className="grid-sidebar">
              <div className="glogo">
                kria
                <small>Grid</small>
              </div>
              {SIDEBAR_ITEMS.map((it) => (
                <div key={it.key} className={"nav-item" + (it.key === 'dashboard' ? ' active' : '')}>
                  {it.icon}
                  <span>{it.label}</span>
                </div>
              ))}
              <div className="bottom">
                <div className="nav-item">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M8 1.5v1.5M8 13v1.5M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span>Light mode</span>
                </div>
                <div className="nav-item">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M9 2.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M11 5l3 3-3 3M14 8H6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Sign out</span>
                </div>
              </div>
            </aside>

            {/* Main */}
            <div className="grid-main">
              {/* Topbar */}
              <div className="grid-topbar">
                <div className="grid-search">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input type="text" placeholder="Search gigs or locations…" defaultValue="" />
                </div>
                <div className="grid-topbar-right">
                  <div className="icon-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 12.5l1-1.5V7a3.5 3.5 0 0 1 7 0v4l1 1.5h-9zM6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="icon-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M8 1.5v1.5M8 13v1.5M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="user">
                    <div>
                      <div className="name">Priya Mehta</div>
                      <div className="role">Host</div>
                    </div>
                    <div className="av">P</div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="grid-content">
                <div className="grid-main-head">
                  <div>
                    <h3>Host Dashboard</h3>
                    <p className="sub">Real-time performance and gig management.</p>
                  </div>
                  <div className="actions">
                    <button className="btn btn-ghost">
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2v8M3.5 6.5L7 10l3.5-3.5M2.5 12h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Export CSV
                    </button>
                    <button className="btn btn-primary">
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      Post new gig
                    </button>
                  </div>
                </div>

                <div className="grid-stats">
                  <div className="grid-stat">
                    <div className="grid-stat-head">
                      <div className="lbl">Active gigs</div>
                      <svg className="ico" viewBox="0 0 22 22" fill="none">
                        <rect x="3" y="7" width="16" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.6"/>
                        <path d="M8 7V5.5a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 14 5.5V7" stroke="currentColor" strokeWidth="1.6"/>
                      </svg>
                    </div>
                    <div className="val">7</div>
                    <div className="delta">open or in progress</div>
                  </div>
                  <div className="grid-stat cobalt">
                    <div className="grid-stat-head">
                      <div className="lbl">Total events</div>
                      <svg className="ico" viewBox="0 0 22 22" fill="none">
                        <rect x="3.5" y="5" width="15" height="14" rx="1.6" stroke="currentColor" strokeWidth="1.6"/>
                        <path d="M3.5 9h15M8 3v3.5M14 3v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="val">0</div>
                    <div className="delta">all time</div>
                  </div>
                  <div className="grid-stat">
                    <div className="grid-stat-head">
                      <div className="lbl">Slots filled</div>
                      <svg className="ico" viewBox="0 0 22 22" fill="none">
                        <circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth="1.6"/>
                        <circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                        <path d="M2.5 17c0-2.4 2.4-4 5.5-4s5.5 1.6 5.5 4M13.5 16.5c.2-1.6 2-2.5 4-2.5 1.5 0 2.5.5 3 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="val">113<span style={{ color: 'var(--muted)', fontSize: 22, marginLeft: 4 }}>/136</span></div>
                    <div className="bar"><i style={{ width: '83%' }}/></div>
                    <div className="delta">83% fill rate</div>
                  </div>
                  <div className="grid-stat cobalt">
                    <div className="grid-stat-head">
                      <div className="lbl">Total posted</div>
                      <svg className="ico" viewBox="0 0 22 22" fill="none">
                        <path d="M3 16l5-5 3 3 6-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 7h4v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="val">17</div>
                    <div className="delta">gigs all time</div>
                  </div>
                </div>

                <div className="grid-content-row">
                  <div className="gigs-panel">
                    <div className="gigs-panel-head">
                      <div className="ttl">Recent gigs</div>
                      <div className="legend">
                        <span><span className="dot" style={{ background: 'var(--lime)' }}></span>Open</span>
                        <span><span className="dot" style={{ background: 'var(--cobalt)' }}></span>In progress</span>
                      </div>
                    </div>
                    <div className="gigs-table-head">
                      <div>Gig details</div>
                      <div>Category</div>
                      <div>City</div>
                      <div>Date</div>
                      <div>Slots</div>
                      <div>Status</div>
                    </div>
                    {RECENT_GIGS.map((g) => (
                      <div key={g.name} className="gig-row">
                        <div>
                          <div className="gig-name">{g.name}</div>
                          <div className="gig-host">{g.host}</div>
                        </div>
                        <div><span className="cat">{g.cat}</span></div>
                        <div className="city">{g.city}</div>
                        <div className="date">
                          <span className="num">{g.date[0]}</span>
                          <span>{g.date[1]}</span>
                        </div>
                        <div className="slots">{g.slots}</div>
                        <div>
                          <span className={"status " + g.status}>
                            {g.status === 'open' ? 'Open' : 'In progress'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="side-panel">
                    <div className="side-card">
                      <div className="ttl">Quick actions</div>
                      <div className="quick-action">
                        <div className="ico">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="5" width="12" height="9" rx="1.4" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M6 5V3.5A1 1 0 0 1 7 2.5h2a1 1 0 0 1 1 1V5" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </div>
                        <div>
                          <div className="lbl">Post a gig</div>
                          <div className="sub">Find runners instantly</div>
                        </div>
                      </div>
                      <div className="quick-action cobalt">
                        <div className="ico">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="2.5" y="3.5" width="11" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div>
                          <div className="lbl">Create event</div>
                          <div className="sub">Bundle multiple gigs</div>
                        </div>
                      </div>
                    </div>

                    <div className="side-card">
                      <div className="ttl">
                        System status
                        <span className="status-pill">Optimal</span>
                      </div>
                      <div className="status-row">
                        <span>API uptime</span>
                        <b>99.98%</b>
                        <div className="row-bar"><i style={{ width: '99.98%' }}/></div>
                      </div>
                      <div className="status-row">
                        <span>Match rate</span>
                        <b>94.2%</b>
                        <div className="row-bar"><i style={{ width: '94.2%' }}/></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Momentum section
// ============================================================

const BANDS = [
  { band: 'newcomer', name: 'Newcomer', range: '0–99',     desc: 'Just signed up. First record builds with every completed gig.',     pct: '38%' },
  { band: 'building', name: 'Building', range: '100–299',  desc: 'A few shifts in. Hosts see early consistency signals.',             pct: '24%' },
  { band: 'reliable', name: 'Reliable', range: '300–499',  desc: 'Shows up, on time, finishes the work. The baseline Hosts trust.',   pct: '18%' },
  { band: 'trusted',  name: 'Trusted',  range: '500–699',  desc: 'Surfaces ahead of newcomers. Cleared identity, strong history.',    pct: '12%' },
  { band: 'elite',    name: 'Elite',    range: '700–899',  desc: 'Top-tier Runners. First in line for high-pay gigs.',                pct: '6%'  },
  { band: 'legend',   name: 'Legend',   range: '900–1000', desc: 'Hand-picked. The Hosts queue up for them.',                         pct: '2%'  },
];

function MomentumSection() {
  const [active, setActive] = React.useState(null);
  return (
    <section className="section momentum-section" id="momentum">
      <div className="container">
        <div className="section-head">
          {/* <div className="kicker"><span className="pin"></span>The Score</div> */}
          <h2 className="h-section">A record that <em>travels with you.</em></h2>
        </div>

        <div className="momentum-explain">
          <div className="answer">
            Every Runner has a <em>Momentum Score</em> from 0 to 1000. It's built from five signals across every shift, and it replaces star ratings entirely. <span className="scribble cobalt">Hosts hire by it</span>, Runners earn by it.
          </div>
          <div>
            <div className="kicker" style={{ marginBottom: 12 }}>How it's built</div>
            <p className="note">
              Show rate. On-time arrival. Performance. Communication. Professionalism. Every gig you complete updates each axis. There is no review form, no five-star slot machine — just the receipts.
            </p>
            <p className="note">
              Hosts have Momentum too. Runners see a Host's record before they swipe.
            </p>
          </div>
        </div>

        {/* ID-CARD CENTERPIECE */}
        <div className="id-card-wrap">
          <div className="id-card">
            <div className="id-card-head">
              <div>
                <div className="brand">kria<span style={{ color: 'var(--mark)' }}>.</span></div>
                <small>Runner record</small>
              </div>
              <div className="doctype">
                Document<br/>
                <b>RR-2026-04718</b>
              </div>
            </div>

            <div className="id-card-body">
              <div className="id-photo">P</div>
              <div className="id-fields">
                <div className="row"><div className="lbl">Name</div><div className="val">Priya Ramachandran</div></div>
                <div className="row"><div className="lbl">Base</div><div className="val">Indiranagar, Bengaluru</div></div>
                <div className="row"><div className="lbl">Joined</div><div className="val mono">15 · 02 · 2025</div></div>
                <div className="row"><div className="lbl">Gigs</div><div className="val mono">47 completed · 0 no-shows</div></div>
                <div className="row"><div className="lbl">Skills</div><div className="val">Hospitality, F&amp;B, Events</div></div>
              </div>
            </div>

            <div className="id-score">
              <div>
                <div className="big">842<small>/ 1000</small></div>
                <div className="kicker" style={{ marginTop: 4, color: 'rgba(14,18,13,0.55)' }}>Momentum</div>
              </div>
              <div className="id-band">Elite</div>
            </div>

            <div className="id-badges">
              <span className="v">Aadhaar ✓</span>
              <span className="v">PAN ✓</span>
              <span>50-gig streak</span>
              <span>Hospitality I</span>
              <span>On-time II</span>
              <span>Night shift</span>
            </div>

            <div className="id-card-footer">
              <span>Issued · trykria.com</span>
              <span>Renews on every shift</span>
            </div>

            <div className="stamp-mark">
              Verified<br/>
              <b>by kria</b>
            </div>
          </div>

          <div className="skill-detail">
            {/* <div className="kicker">Skill graph · five signals</div> */}
            <h3>Hover an axis. <em>See where it's earned.</em></h3>
            <p className="lede">
              Each axis on the radar measures one slice of how Priya works. The score is the average — but Hosts hiring for a wedding banquet care more about <i>Show rate</i> than <i>Communication</i>, and the graph tells them that in a glance.
            </p>

            <div style={{ margin: '24px -8px 0' }}>
              <SkillGraph active={active} setActive={setActive} size={440} />
            </div>

            <div className="dim-list">
              {DIMENSIONS.map((d) => (
                <div
                  key={d.key}
                  className={"dim-row" + (active === d.key ? ' active' : '')}
                  onMouseEnter={() => setActive(d.key)}
                  onMouseLeave={() => setActive(null)}
                >
                  <div>
                    <div className="dim-name">{d.name}</div>
                    <div className="dim-desc">{d.desc}</div>
                  </div>
                  <div className="dim-val">{d.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BAND LADDER */}
        <div className="bands-section">
          <div className="lede">
            <div>
              {/* <div className="kicker"><span className="pin"></span>Six bands</div> */}
              <h3>From <em>just signed up</em> to <em>hand-picked.</em></h3>
            </div>
            <p>
              Every Runner moves between bands based on their last 90 days of work. No one is stuck. No one stays Elite without proving it again next week.
            </p>
          </div>

          <div className="bands-row">
            {BANDS.map((b) => (
              <div key={b.band} className="band-card" style={{ color: BAND_COLOR[b.band] }}>
                <div className="bar-vis" />
                <div className="name" style={{ color: 'var(--text)' }}>{b.name}</div>
                <div className="range">{b.range}</div>
                <div className="desc">{b.desc}</div>
                <div className="pct"><b>{b.pct}</b> of Runners</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CTA + Footer
// ============================================================

function CtaSection() {
  return (
    <section className="cta-section">
      <div className="container">
        <span className="stamp">Open · India · 2026</span>
        <h2>
          Post your first gig.<br/>
          Fill it before <em>the <span className="marker">kettle boils.</span></em>
        </h2>
        <div className="row">
          <a href="https://grid.trykria.com" className="btn btn-primary">
            Post a gig on Grid
            <span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10m0 0L7.5 2.5M12 7l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </a>
          <a href="#pocket" className="btn btn-ghost">Pocket — coming soon</a>
        </div>
        <div className="ps">P.S. Free until you fill it. We mean that.</div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="container footer">
      <div className="col">
        <span className="logo" style={{ color: 'var(--text)' }}>kria</span>
        <span>© 2026 kria · Bengaluru</span>
        <span>Made by humans, in five Indian cities.</span>
      </div>
      <div className="col">
        <b>For Runners</b>
        <a href="#pocket">Pocket app</a>
        <a href="#momentum">Momentum Score</a>
        <a href="#">Badges &amp; ID</a>
      </div>
      <div className="col">
        <b>For Hosts</b>
        <a href="https://grid.trykria.com">Grid dashboard</a>
        <a href="#">Pricing</a>
        <a href="#">Status</a>
      </div>
      <div className="col">
        <b>Say hello</b>
        <a href="mailto:hello@trykria.com">hello@trykria.com</a>
        <a href="#">Twitter / X</a>
        <a href="#">LinkedIn</a>
      </div>
    </footer>
  );
}

// ============================================================
// Root
// ============================================================

function App() {
  return (
    <>
      <Nav />
      <Ticker />
      <Hero />
      {/* <PullQuote
        label="// Filed from a wedding shift, Indiranagar"
        quote="I used to send my number to 14 numbers a day. Now I swipe twice, and someone with a name and a record turns up at six."
        cite="Renu Iyer, owner — Olive & Oak Catering"
      />
      <PocketSection />
      <PullQuote
        label="// Filed from a 64-gig Runner, Koramangala"
        quote="The score is the closest thing I've got to a CV. It changes every Saturday. So do my shifts."
        cite="Rohan M., Runner — 921 / Legend"
      /> */}
      <GridSection />
      <MomentumSection />
      <CtaSection />
      <Footer />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
