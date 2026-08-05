import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Vercel-side env var; falls back to production kria-api on EC2.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.trykria.com/api/v1";

const BAND_META: Record<string, { color: string; label: string }> = {
  Newcomer: { color: "#777575", label: "Newcomer" },
  Building: { color: "#ff7351", label: "Building" },
  Reliable: { color: "#8097ff", label: "Reliable" },
  Trusted:  { color: "#FFC83D", label: "Trusted" },
  Elite:    { color: "#D4FF00", label: "Elite" },
  Legend:   { color: "#ffffff", label: "Legend" },
};

function bandForScore(score: number | null): { color: string; label: string } {
  if (score == null) return BAND_META.Newcomer;
  if (score >= 900) return BAND_META.Legend;
  if (score >= 700) return BAND_META.Elite;
  if (score >= 500) return BAND_META.Trusted;
  if (score >= 300) return BAND_META.Reliable;
  if (score >= 100) return BAND_META.Building;
  return BAND_META.Newcomer;
}

interface RunnerProfile {
  slug: string;
  display_name: string;
  first_name: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  id_verified: boolean;
  total_gigs_completed: number;
  streak_count: number;
  momentum_score: number | null;
  skills: string[];
  languages: string[];
  verified_id_types: string[];
  joined_at: string;
}

async function fetchProfile(slug: string): Promise<RunnerProfile | null> {
  try {
    // Revalidate every 5 minutes so profile edits show up reasonably fast
    // without hammering the API on every share click.
    const res = await fetch(`${API_URL}/public/runners/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as RunnerProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchProfile(slug);
  if (!p) {
    return { title: "Runner not found · kria" };
  }
  const name = p.first_name || p.display_name || "Runner";
  const band = bandForScore(p.momentum_score);
  const desc = p.bio
    ? p.bio
    : `${name}${p.city ? ` from ${p.city}` : ""} — ${band.label} runner on Kria, ${p.total_gigs_completed} gigs completed.`;
  return {
    title: `${name} · kria`,
    description: desc,
    openGraph: {
      title: `${name} on Kria`,
      description: desc,
      type: "profile",
    },
  };
}

export default async function PublicProfilePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const p = await fetchProfile(slug);
  if (!p) notFound();

  const name = p.first_name || p.display_name || "Runner";
  const initial = name.charAt(0).toUpperCase();
  const band = bandForScore(p.momentum_score);
  const joined = new Date(p.joined_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        {/* Hero band strip */}
        <div style={{ ...styles.bandStrip, background: `linear-gradient(135deg, ${band.color}55 0%, transparent 100%)` }} />

        {/* Avatar + name */}
        <div style={styles.header}>
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt={name} style={styles.avatar} />
          ) : (
            <div style={{ ...styles.avatar, ...styles.avatarFallback }}>{initial}</div>
          )}
          <div style={styles.headerText}>
            <h1 style={styles.name}>
              {name}
              {p.is_verified && <span style={styles.verifiedCheck} title="Verified">✓</span>}
            </h1>
            {p.city && <p style={styles.city}>{p.city}</p>}
            <div style={styles.badgeRow}>
              <span style={{ ...styles.bandPill, color: band.color, borderColor: `${band.color}80` }}>
                {band.label}
                {p.momentum_score != null && (
                  <span style={styles.bandScore}> · {p.momentum_score}</span>
                )}
              </span>
              {p.id_verified && (
                <span style={styles.idVerifiedPill}>ID verified</span>
              )}
            </div>
          </div>
        </div>

        {p.bio && <p style={styles.bio}>{p.bio}</p>}

        {/* Stats */}
        <div style={styles.stats}>
          <Stat value={p.total_gigs_completed.toString()} label="Gigs done" />
          <Divider />
          <Stat value={p.streak_count.toString()} label="Day streak" prefix={p.streak_count > 0 ? "🔥" : undefined} />
          <Divider />
          <Stat value={p.momentum_score?.toString() ?? "0"} label="Momentum" color={band.color} />
        </div>

        {p.skills.length > 0 && (
          <Section title="Skills">
            <ChipRow items={p.skills.map((s) => s.replace(/_/g, " "))} />
          </Section>
        )}

        {p.languages.length > 0 && (
          <Section title="Languages">
            <ChipRow items={p.languages} />
          </Section>
        )}

        <p style={styles.joined}>On Kria since {joined}</p>

        {/* CTA */}
        <a href="https://trykria.com" style={styles.cta}>
          Discover Kria →
        </a>
      </div>
    </main>
  );
}

function Stat({ value, label, prefix, color }: { value: string; label: string; prefix?: string; color?: string }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValueRow}>
        {prefix && <span style={styles.statPrefix}>{prefix}</span>}
        <span style={{ ...styles.statValue, color: color ?? "var(--text)" }}>{value}</span>
      </div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div style={styles.divider} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div style={styles.chipRow}>
      {items.map((item) => (
        <span key={item} style={styles.chip}>{item}</span>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0E120D",
    color: "#F4EFE3",
    padding: "24px 16px 64px",
    fontFamily: "Inter, system-ui, sans-serif",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "#161a15",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.08)",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  bandStrip: {
    height: 84,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  header: {
    padding: "0 24px 24px",
    display: "flex",
    gap: 16,
    alignItems: "flex-end",
    marginTop: -46,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #161a15",
    background: "#D4FF00",
    display: "block",
  },
  avatarFallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 40,
    fontWeight: 800,
    color: "#0E120D",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 4,
  },
  name: {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: "#F4EFE3",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  verifiedCheck: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    background: "#1DA1F2",
    color: "#fff",
    borderRadius: "50%",
    fontSize: 13,
    fontWeight: 700,
  },
  city: {
    margin: "2px 0 10px",
    color: "rgba(244,239,227,0.55)",
    fontSize: 14,
  },
  badgeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  bandPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 12px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  bandScore: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.7,
    marginLeft: 4,
  },
  idVerifiedPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: 999,
    background: "rgba(29,161,242,0.14)",
    color: "#7cc3ff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  bio: {
    padding: "0 24px",
    fontSize: 15,
    lineHeight: 1.55,
    color: "rgba(244,239,227,0.85)",
    margin: "0 0 20px",
  },
  stats: {
    margin: "0 24px 20px",
    padding: "16px 12px",
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  stat: {
    flex: 1,
    textAlign: "center",
  },
  statValueRow: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: 4,
    justifyContent: "center",
  },
  statPrefix: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(244,239,227,0.5)",
    marginTop: 4,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    fontWeight: 600,
  },
  divider: {
    width: 1,
    height: 28,
    background: "rgba(255,255,255,0.08)",
  },
  section: {
    padding: "0 24px 18px",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(244,239,227,0.5)",
    margin: "0 0 10px",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    padding: "5px 11px",
    borderRadius: 999,
    background: "rgba(212,255,0,0.08)",
    color: "#D4FF00",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  joined: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(244,239,227,0.35)",
    padding: "8px 24px 20px",
    margin: 0,
  },
  cta: {
    display: "block",
    margin: "0 24px 28px",
    padding: "14px 20px",
    borderRadius: 12,
    background: "#D4FF00",
    color: "#0E120D",
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: 0.3,
    textAlign: "center",
    textDecoration: "none",
  },
};
