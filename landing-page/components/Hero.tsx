"use client";

import { useState } from "react";
import Nav from "./landing/Nav";
import Footer from "./landing/Footer";
import SectionHero from "./landing/sections/SectionHero";
import SectionWhyKria from "./landing/sections/SectionWhyKria";
import SectionMomentum from "./landing/sections/SectionMomentum";
import SectionWaitlist from "./landing/sections/SectionWaitlist";
import { LanguageProvider } from "./landing/LanguageContext";
import type { Role } from "./landing/constants";

export default function LandingPage() {
  const [role, setRole] = useState<Role>("seeker");

  return (
    <LanguageProvider>
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        ::placeholder { color: rgba(255,255,255,0.2) !important; }

        @keyframes breathe {
          0%,100% { opacity: 0.6; transform: scale(1);   }
          50%      { opacity: 1;   transform: scale(1.1); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px);   }
          50%      { transform: translateY(-18px); }
        }
        @keyframes upbounce {
          0%,100% { transform: translateY(0);    }
          50%      { transform: translateY(-4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes pulseOpacity {
          0%,100% { opacity: 1;   }
          50%      { opacity: 0.4; }
        }
      `}</style>

      <div style={{
        background: "#0B0F0A",
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}>
        {/* Nav overlays the hero */}
        <Nav />

        <SectionHero role={role} setRole={setRole} />

        {/* Divider */}
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 48px" }}>
          <div style={{
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(212,255,0,0.25) 35%, rgba(212,255,0,0.1) 65%, transparent)",
          }} />
        </div>

        <SectionWhyKria />

        <SectionMomentum />

        <SectionWaitlist />

        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 48px" }}>
          <Footer />
        </div>
      </div>
    </>
    </LanguageProvider>
  );
}
