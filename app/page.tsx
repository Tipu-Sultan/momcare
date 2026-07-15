"use client";
import { useState } from "react";
import SugarTab from "@/components/SugarTab";
import BPTab from "@/components/BPTab";
import ThyroidTab from "@/components/ThyroidTab";
import InsulinTab from "@/components/InsulinTab";
import AiPanel from "@/components/AiPanel";

const tabs = [
  { id: "sugar",   label: "🩸 Diabetes",      color: "#e8566a" },
  { id: "insulin", label: "💉 Insulin",        color: "#7c3aed" },
  { id: "bp",      label: "💓 Blood Pressure", color: "#2d9596" },
  { id: "thyroid", label: "🧬 Thyroid",        color: "#d4870a" },
];

export default function Home() {
  const [active, setActive] = useState("sugar");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fff5f6 0%, #f5f0ff 40%, #f0fafa 70%, #fffbf0 100%)" }}>
      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #f0e6e8", padding: "0 1.5rem", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 12px rgba(232,86,106,0.08)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #e8566a, #c0394d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>❤️</div>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "#1a1a2e", lineHeight: 1 }}>MomCare</h1>
              <p style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 2 }}>Health Tracker</p>
            </div>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#6b7280", textAlign: "right" }}>
            <div style={{ fontWeight: 600, color: "#1a1a2e" }}>Mom's Dashboard</div>
            <div>Stay healthy, stay loved 💕</div>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{ background: "white", borderBottom: "1px solid #f0e6e8", overflowX: "auto" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", padding: "0 1rem", minWidth: "max-content" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActive(tab.id)} style={{
              padding: "14px 20px", border: "none", background: "none", cursor: "pointer",
              fontSize: "0.88rem", fontFamily: "var(--font-body)",
              fontWeight: active === tab.id ? 700 : 500,
              color: active === tab.id ? tab.color : "#6b7280",
              borderBottom: active === tab.id ? `3px solid ${tab.color}` : "3px solid transparent",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* AI Panel — always visible at top across all tabs */}
        <AiPanel />

        {active === "sugar"   && <SugarTab />}
        {active === "insulin" && <InsulinTab />}
        {active === "bp"      && <BPTab />}
        {active === "thyroid" && <ThyroidTab />}
      </main>

      <footer style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.8rem" }}>
        Made with ❤️ for Mom
      </footer>
    </div>
  );
}