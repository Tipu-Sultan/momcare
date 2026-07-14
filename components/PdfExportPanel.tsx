"use client";
import { useState } from "react";
import dayjs from "dayjs";
import { exportToPdf, PdfSection } from "@/lib/pdfExport";

interface Props {
  accentColor: string;
  accentRgb: [number, number, number];
  buildSections: (from: dayjs.Dayjs, to: dayjs.Dayjs) => Promise<PdfSection[]>;
  tabLabel: string;
}

const PRESETS = [
  { label: "Today",  days: 1 },
  { label: "Last 7 days",  days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Custom range", days: 0 },
];

export default function PdfExportPanel({ accentColor, accentRgb, buildSections, tabLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(1);
  const [custom, setCustom] = useState(false);
  const [fromDate, setFromDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [exporting, setExporting] = useState(false);

  const handlePreset = (days: number) => {
    if (days === 0) { setCustom(true); return; }
    setCustom(false);
    setPreset(days);
    setFromDate(dayjs().subtract(days, "day").format("YYYY-MM-DD"));
    setToDate(dayjs().format("YYYY-MM-DD"));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const from = dayjs(fromDate).startOf("day");
      const to = dayjs(toDate).endOf("day");
      const sections = await buildSections(from, to);
      const label = `${from.format("DD-MMM-YYYY")}_to_${to.format("DD-MMM-YYYY")}`;
      await exportToPdf(
        sections,
        from.format("DD MMM YYYY"),
        to.format("DD MMM YYYY"),
        `MomCare_${tabLabel}_${label}.pdf`
      );
    } finally {
      setExporting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb",
    fontSize: "0.85rem", fontFamily: "var(--font-body)", color: "#1a1a2e",
    background: "white", outline: "none",
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? "#f5f5f5" : "white",
          color: accentColor, border: `1.5px solid ${accentColor}`,
          borderRadius: 10, padding: "9px 18px",
          fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.85rem",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6
        }}
      >
        📄 {open ? "Close PDF Export" : "Export to PDF"}
      </button>

      {open && (
        <div style={{
          marginTop: 10, background: "white", borderRadius: 16, padding: "1.2rem 1.5rem",
          border: `1.5px solid ${accentColor}30`,
          boxShadow: `0 4px 20px ${accentColor}12`
        }}>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Select Date Range
          </p>

          {/* Preset buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.days)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: "0.8rem",
                  fontFamily: "var(--font-body)", fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${(!custom && preset === p.days) || (custom && p.days === 0) ? accentColor : "#e5e7eb"}`,
                  background: (!custom && preset === p.days) || (custom && p.days === 0) ? accentColor : "white",
                  color: (!custom && preset === p.days) || (custom && p.days === 0) ? "white" : "#6b7280",
                  transition: "all 0.15s"
                }}
              >{p.label}</button>
            ))}
          </div>

          {/* Custom date pickers */}
          {custom && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#9ca3af", marginBottom: 4 }}>FROM</label>
                <input type="text" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="YYYY-MM-DD" style={inputStyle} />
              </div>
              <div style={{ marginTop: 16, color: "#9ca3af" }}>→</div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#9ca3af", marginBottom: 4 }}>TO</label>
                <input type="text" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="YYYY-MM-DD" style={inputStyle} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                background: exporting ? "#e5e7eb" : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                color: exporting ? "#9ca3af" : "white",
                border: "none", borderRadius: 10,
                padding: "10px 22px", fontFamily: "var(--font-body)", fontWeight: 600,
                fontSize: "0.88rem", cursor: exporting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6
              }}
            >
              {exporting ? "⏳ Generating..." : "⬇️ Download PDF"}
            </button>
            <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
              {fromDate} → {toDate}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
