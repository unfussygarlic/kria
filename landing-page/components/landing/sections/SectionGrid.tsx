"use client";

import { useWindowWidth } from "../utils";

const RECENT_GIGS = [
  { title: "Lead anchor", host: "Mama", skill: "Promoter", city: "Bangalore", date: "11 May", filled: "1/1", status: "progress" },
  { title: "Saturday wedding — banquet servers", host: "Olive & Oak", skill: "Hospitality", city: "Bangalore", date: "17 May", filled: "8/12", status: "progress" },
  { title: "Chennai Auto Expo — Tech Support Crew", host: "Chennai Trade Centre", skill: "Event Tech", city: "Chennai", date: "10 Jun", filled: "1/5", status: "open" },
  { title: "Flipkart Big Shopping Days — Lead Gen", host: "Flipkart", skill: "Lead Collection", city: "Hyderabad", date: "22 May", filled: "4/8", status: "open" },
  { title: "Sunburn Festival — Crowd Safety", host: "Sunburn Ent.", skill: "Usher", city: "Goa", date: "18 May", filled: "15/20", status: "open" },
];

const SIDEBAR_NAV = ["Dashboard", "Gigs", "Applications", "Events", "Analytics", "Profile"];

function StatusPill({ status }: { status: string }) {
  const isProgress = status === "progress";
  return (
    <span style={{
      padding: "3px 8px",
      borderRadius: 6,
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 600,
      background: isProgress ? "rgba(212,255,0,0.12)" : "rgba(128,151,255,0.12)",
      color: isProgress ? "var(--lime)" : "var(--cobalt)",
      border: `1px solid ${isProgress ? "rgba(212,255,0,0.2)" : "rgba(128,151,255,0.2)"}`,
    }}>
      {isProgress ? "In progress" : "Open"}
    </span>
  );
}

function GridMockup({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      border: "1px solid var(--hairline-strong)",
      borderRadius: 14,
      overflow: "hidden",
      background: "var(--ink-2)",
      boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
    }}>
      {/* Browser chrome */}
      <div style={{
        background: "var(--ink-3)",
        borderBottom: "1px solid var(--hairline)",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map(c => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1,
          maxWidth: 280,
          margin: "0 auto",
          background: "var(--ink-4)",
          border: "1px solid var(--hairline)",
          borderRadius: 7,
          padding: "4px 10px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--muted)",
          textAlign: "center",
        }}>
          grid.trykria.com / dashboard
        </div>
      </div>

      {/* Dashboard body */}
      <div style={{ display: "flex", minHeight: isMobile ? "auto" : 360 }}>
        {/* Sidebar */}
        {!isMobile && (
          <div style={{
            width: 160,
            borderRight: "1px solid var(--hairline)",
            padding: "16px 0",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}>
            <div style={{
              padding: "0 16px 12px",
              borderBottom: "1px solid var(--hairline)",
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text)",
              }}>kria</span>
              <span style={{ color: "var(--lime)" }}>.</span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--muted)",
                marginLeft: 4,
              }}>Grid</span>
            </div>

            {SIDEBAR_NAV.map((item, i) => (
              <div
                key={item}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: i === 0 ? 600 : 400,
                  color: i === 0 ? "var(--text)" : "var(--muted)",
                  background: i === 0 ? "var(--ink-4)" : "transparent",
                  borderRadius: 6,
                  margin: "0 6px",
                  cursor: "pointer",
                }}
              >{item}</div>
            ))}

            <div style={{ marginTop: "auto", padding: "12px 16px 0", borderTop: "1px solid var(--hairline)" }}>
              <div style={{ padding: "7px 10px", fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>Sign out</div>
            </div>
          </div>
        )}

        {/* Main area */}
        <div style={{ flex: 1, padding: isMobile ? "16px" : "20px 24px", overflow: "hidden" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            gap: 12,
          }}>
            <div style={{
              background: "var(--ink-3)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
              maxWidth: 220,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>Search gigs…</span>
            </div>
            <div style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "var(--lime)",
              color: "var(--lime-ink)",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}>+ Post gig</div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 20,
          }}>
            {[
              { label: "Active gigs", value: "5" },
              { label: "Applications", value: "38" },
              { label: "Filled today", value: "2" },
              { label: "Total payout", value: "₹68K" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "var(--ink-3)",
                border: "1px solid var(--hairline)",
                borderRadius: 8,
                padding: "10px 14px",
              }}>
                <div style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--text)",
                  lineHeight: 1,
                }}>{value}</div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--muted)",
                  marginTop: 3,
                }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{
            border: "1px solid var(--hairline)",
            borderRadius: 8,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--hairline)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr auto" : "1fr auto auto auto",
              gap: 12,
            }}>
              <span>Gig</span>
              {!isMobile && <span>Skill</span>}
              {!isMobile && <span>Date</span>}
              <span>Filled</span>
            </div>

            {RECENT_GIGS.map((gig, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 14px",
                  borderBottom: i < RECENT_GIGS.length - 1 ? "1px solid var(--hairline)" : "none",
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr auto" : "1fr auto auto auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>{gig.title}</div>
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}>{gig.host} · {gig.city}</div>
                </div>
                {!isMobile && (
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                  }}>{gig.skill}</span>
                )}
                {!isMobile && (
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                  }}>{gig.date}</span>
                )}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                  }}>{gig.filled}</span>
                  <StatusPill status={gig.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SectionGrid() {
  const width = useWindowWidth();
  const isMobile = width < 860;

  return (
    <section id="grid" style={{
      padding: isMobile ? "80px 20px" : "100px 48px",
      maxWidth: 1200,
      margin: "0 auto",
    }}>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--muted)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: 20,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 99, background: "var(--lime)",
          display: "inline-block", boxShadow: "0 0 8px var(--lime)",
        }} />
        Live — for Hosts
      </div>

      <h2 style={{
        fontFamily: "var(--font-serif)",
        fontWeight: 700,
        fontSize: "clamp(32px, 4.8vw, 64px)",
        lineHeight: 1.05,
        letterSpacing: "-0.025em",
        color: "var(--text)",
        margin: "0 0 20px",
        maxWidth: 700,
      }}>
        Post a gig at 3:42 pm. Watch it fill before chai.
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 24,
        marginBottom: 48,
      }}>
        <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--muted-2)", margin: 0 }}>
          Grid is kria&apos;s web dashboard for Hosts. Post a gig in four steps — role, time, pay, location. Verified Runners apply within minutes.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--muted-2)", margin: 0 }}>
          Browse applicants with full Momentum Scores. Accept, manage check-ins with OTP, and run events. Everything in one place.
        </p>
      </div>

      <GridMockup isMobile={isMobile} />

      <div style={{ marginTop: 32, textAlign: "center" }}>
        <a
          href="https://grid.trykria.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "13px 30px",
            borderRadius: 12,
            background: "var(--lime)",
            color: "var(--lime-ink)",
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
            boxShadow: "0 0 28px rgba(212,255,0,0.3)",
            transition: "opacity 0.2s, transform 0.2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = "0.88";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Open Grid →
        </a>
      </div>
    </section>
  );
}
