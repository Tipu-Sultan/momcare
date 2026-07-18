"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SugarTab from "@/components/SugarTab";
import BPTab from "@/components/BPTab";
import ThyroidTab from "@/components/ThyroidTab";
import InsulinTab from "@/components/InsulinTab";
import AiPanel from "@/components/AiPanel";
import MedicinesTab from "@/components/MedicinesTab";
import WaterTab from "@/components/WaterTab";
import AnalyticsTab from "@/components/AnalyticsTab";
import CriticalAlertSystem from "@/components/CriticalAlertSystem";
import DoctorReportPanel from "@/components/DoctorReportPanel";
import ConnectTab from "@/components/ConnectTab";
import HeartLoader from "@/components/HeartLoader";
import ReportsTab from "@/components/ReportsTab";
import AppointmentsTab from "@/components/AppointmentsTab";

const tabs = [
  { id: "sugar",         label: "🩸 Diabetes",       color: "#e8566a" },
  { id: "insulin",       label: "💉 Insulin",        color: "#7c3aed" },
  { id: "bp",            label: "💓 Blood Pressure", color: "#2d9596" },
  { id: "thyroid",       label: "🧬 Thyroid",        color: "#d4870a" },
  { id: "medicines",     label: "📋 Medicines",      color: "#6366f1" },
  { id: "water",         label: "💧 Water",         color: "#0ea5e9" },
  { id: "connect",       label: "⌚ Connect Watch",  color: "#3b82f6" },
  { id: "analytics",     label: "🔮 Predictive AI",  color: "#a855f7" },
  { id: "health-report", label: "💓 Health Reports",  color: "#08b452" },
  { id: "appointments",  label: "📅 Appointments",    color: "#8592d6" },
];


<style>{`
  .hide-scrollbar::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`}</style>

export default function Home() {
  return (
    <Suspense fallback={<HeartLoader />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [active, setActive] = useState("sugar");
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Initial Load: Read URL query parameter once on mount
  useEffect(() => {
    setMounted(true);
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some(t => t.id === tabParam)) {
      setActive(tabParam);
    }
  }, [searchParams]);

  // 2. Tab Change Handler: Updates state and dynamically synchronizes URL parameter
  const handleTabChange = (tabId: string) => {
    setActive(tabId);

    // Smoothly pushes the updated parameter to the browser history without fully reloading the page component tree
    router.push(`/?tab=${tabId}`, { scroll: false });
  };

  if (!mounted) {
    return <HeartLoader />;
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", textAlign: "right" }}>
              <div style={{ fontWeight: 600, color: "#1a1a2e" }}>Mom&apos;s Dashboard</div>
              <div style={{ fontSize: "0.75rem" }}>Patient: Shakila Khatoon (Age 52) 💕</div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar wrapper jismein class add ki gayi hai */}
      <div 
        className="hide-scrollbar" 
        style={{ background: "white", borderBottom: "1px solid #f0e6e8", overflowX: "auto" }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", padding: "0 1rem", minWidth: "max-content" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={{
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
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        <CriticalAlertSystem />
        <DoctorReportPanel />
        <AiPanel />

        {active === "sugar"         && <SugarTab />}
        {active === "insulin"       && <InsulinTab />}
        {active === "bp"            && <BPTab />}
        {active === "thyroid"       && <ThyroidTab />}
        {active === "medicines"     && <MedicinesTab />}
        {active === "water"         && <WaterTab />}
        {active === "connect"       && <ConnectTab />}
        {active === "analytics"     && <AnalyticsTab />}
        {active === "health-report" && <ReportsTab />}
        {active === "appointments"  && <AppointmentsTab />}

      </main>

      <footer style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.8rem" }}>
        Made with ❤️ for Shakila Khatoon
      </footer>
    </div>
  );
}