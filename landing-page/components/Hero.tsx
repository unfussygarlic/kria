"use client";

import Nav from "./landing/Nav";
import Footer from "./landing/Footer";
import SectionTicker from "./landing/sections/SectionTicker";
import SectionHero from "./landing/sections/SectionHero";
import SectionPocket from "./landing/sections/SectionPocket";
import SectionGrid from "./landing/sections/SectionGrid";
import SectionMomentum from "./landing/sections/SectionMomentum";
import SectionWaitlist from "./landing/sections/SectionWaitlist";
import { LanguageProvider } from "./landing/LanguageContext";

export default function LandingPage() {
  return (
    <LanguageProvider>
      <>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          ::placeholder { color: var(--muted) !important; }

          @keyframes tickerScroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          @keyframes float {
            0%,100% { transform: translateY(0px); }
            50%      { transform: translateY(-18px); }
          }

          @keyframes breathe {
            0%,100% { opacity: 0.6; transform: scale(1); }
            50%      { opacity: 1;   transform: scale(1.1); }
          }

          @keyframes pulseOpacity {
            0%,100% { opacity: 1; }
            50%      { opacity: 0.4; }
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>

        <div style={{
          background: "var(--ink)",
          minHeight: "100vh",
          color: "var(--text)",
          fontFamily: "var(--font-sans)",
        }}>
          <Nav />
          <SectionTicker />
          <SectionHero />

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--hairline)" }} />

          <SectionPocket />

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--hairline)" }} />

          <SectionGrid />

          <SectionMomentum />

          <SectionWaitlist />

          <Footer />
        </div>
      </>
    </LanguageProvider>
  );
}
