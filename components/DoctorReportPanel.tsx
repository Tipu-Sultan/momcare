"use client";
import { useState } from "react";
import dayjs from "dayjs";
import { useHealthStore } from "@/lib/store";
import { exportToPdf, PdfSection } from "@/lib/pdfExport";
import { FileDown, Calendar, CheckSquare, Square } from "lucide-react";

export default function DoctorReportPanel() {
  const [open, setOpen] = useState(false);
  const [daysPreset, setDaysPreset] = useState(7);
  const [customRange, setCustomRange] = useState(false);
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [exporting, setExporting] = useState(false);

  // Checked section toggles
  const [includeSugar, setIncludeSugar] = useState(true);
  const [includeBp, setIncludeBp] = useState(true);
  const [includeInsulin, setIncludeInsulin] = useState(true);
  const [includeThyroid, setIncludeThyroid] = useState(true);
  const [includeMeds, setIncludeMeds] = useState(true);
  const [includeWater, setIncludeWater] = useState(true);

  const { sugarReadings, bpReadings, insulinLogs, thyroidReadings, medicineLogs, waterLogs } = useHealthStore();

  const handlePreset = (days: number) => {
    if (days === 0) {
      setCustomRange(true);
      return;
    }
    setCustomRange(false);
    setDaysPreset(days);
    setFromDate(dayjs().subtract(days, "day").format("YYYY-MM-DD"));
    setToDate(dayjs().format("YYYY-MM-DD"));
  };

  const generateReport = async () => {
    setExporting(true);
    try {
      const from = dayjs(fromDate).startOf("day");
      const to = dayjs(toDate).endOf("day");
      const sections: PdfSection[] = [];

      // Filter and format Sugar Readings
      if (includeSugar) {
        const filtered = sugarReadings.filter(r => {
          const m = dayjs(r.measuredAt);
          return m.isAfter(from) && m.isBefore(to);
        });
        const rows = filtered.map(r => [
          dayjs(r.measuredAt).format("DD-MMM-YYYY, hh:mm A"),
          `${r.value} mg/dL`,
          r.timing,
          r.insulinName || "None",
          r.note || ""
        ]);
        sections.push({
          title: "BLOOD SUGAR / GLUCOSE LOGS",
          headers: ["Date & Time", "Reading (mg/dL)", "Timing", "Insulin Active", "Note"],
          rows,
          accentRgb: [232, 86, 106] // rose
        });
      }

      // Filter and format Insulin Logs
      if (includeInsulin) {
        const filtered = insulinLogs.filter(l => {
          const m = dayjs(l.takenAt);
          return m.isAfter(from) && m.isBefore(to);
        });
        const rows = filtered.map(l => [
          dayjs(l.takenAt).format("DD-MMM-YYYY, hh:mm A"),
          l.insulinName,
          `${l.units} Units`,
          l.note || ""
        ]);
        sections.push({
          title: "INSULIN ADMINISTRATION LOGS",
          headers: ["Date & Time", "Insulin Type", "Dosage (Units)", "Note"],
          rows,
          accentRgb: [124, 58, 237] // violet
        });
      }

      // Filter and format Blood Pressure
      if (includeBp) {
        const filtered = bpReadings.filter(r => {
          const m = dayjs(r.measuredAt);
          return m.isAfter(from) && m.isBefore(to);
        });
        const rows = filtered.map(r => [
          dayjs(r.measuredAt).format("DD-MMM-YYYY, hh:mm A"),
          `${r.systolic}/${r.diastolic} mmHg`,
          r.pulse ? `${r.pulse} bpm` : "—",
          r.note || ""
        ]);
        sections.push({
          title: "BLOOD PRESSURE & PULSE TRENDS",
          headers: ["Date & Time", "Reading (Systolic/Diastolic)", "Pulse Rate", "Note"],
          rows,
          accentRgb: [45, 149, 150] // teal
        });
      }

      // Filter and format Thyroid Tested Vitals
      if (includeThyroid) {
        const filtered = thyroidReadings.filter(r => {
          const m = dayjs(r.testedAt);
          return m.isAfter(from) && m.isBefore(to);
        });
        const rows = filtered.map(r => [
          dayjs(r.testedAt).format("DD-MMM-YYYY"),
          `${r.tsh} mIU/L`,
          r.t3 ? `${r.t3} pg/mL` : "—",
          r.t4 ? `${r.t4} ng/dL` : "—",
          r.note || ""
        ]);
        sections.push({
          title: "THYROID HORMONE LEVEL RECORDINGS",
          headers: ["Test Date", "TSH Level", "T3 Level", "T4 Level", "Note"],
          rows,
          accentRgb: [245, 158, 11] // amber
        });
      }

      // Filter and format Medicine Dosage Logs
      if (includeMeds) {
        const filtered = medicineLogs.filter(l => {
          const m = dayjs(l.takenAt);
          return m.isAfter(from) && m.isBefore(to);
        });
        const rows = filtered.map(l => [
          dayjs(l.takenAt).format("DD-MMM-YYYY, hh:mm A"),
          l.medicineName,
          l.dosage,
          l.note || ""
        ]);
        sections.push({
          title: "MEDICATION ADHERENCE INTAKE LOGS",
          headers: ["Logged At", "Medicine Name", "Dosage Taken", "Note"],
          rows,
          accentRgb: [79, 70, 229] // indigo
        });
      }

      // Filter and format Water logs
      if (includeWater) {
        const filtered = waterLogs.filter(l => {
          const m = dayjs(l.measuredAt);
          return m.isAfter(from) && m.isBefore(to);
        });
        const rows = filtered.map(l => [
          dayjs(l.measuredAt).format("DD-MMM-YYYY, hh:mm A"),
          `${l.amount} ml`,
          l.note || ""
        ]);
        sections.push({
          title: "HYDRATION & WATER INTAKE TRACKER",
          headers: ["Intake Timestamp", "Amount Logged", "Note"],
          rows,
          accentRgb: [14, 165, 233] // sky
        });
      }

      const formattedLabel = `${from.format("DDMMM")}_to_${to.format("DDMMM")}`;
      await exportToPdf(
        sections,
        from.format("DD MMM YYYY"),
        to.format("DD MMM YYYY"),
        `MomCare_DoctorReport_${formattedLabel}.pdf`
      );

    } finally {
      setExporting(false);
    }
  };

  const checkboxSt: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "8px 12px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    color: "#334155",
    userSelect: "none"
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          color: "white",
          border: "none",
          borderRadius: 14,
          padding: "12px 24px",
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: "0.9rem",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.2)"
        }}
      >
        <FileDown size={18} />
        {open ? "Close Comprehensive Report Panel" : "Export Comprehensive Doctor Report"}
      </button>

      {open && (
        <div style={{
          marginTop: 12,
          background: "white",
          borderRadius: 20,
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }} className="space-y-6">
          
          {/* Section Selector */}
          <div>
            <p style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 10 }}>
              1. Select Vitals & Logs to Include in Report
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              <div style={checkboxSt} onClick={() => setIncludeSugar(!includeSugar)}>
                {includeSugar ? <CheckSquare size={16} className="text-red-500" /> : <Square size={16} />}
                <span>Glucose Readings</span>
              </div>
              <div style={checkboxSt} onClick={() => setIncludeInsulin(!includeInsulin)}>
                {includeInsulin ? <CheckSquare size={16} className="text-purple-600" /> : <Square size={16} />}
                <span>Insulin Administration</span>
              </div>
              <div style={checkboxSt} onClick={() => setIncludeBp(!includeBp)}>
                {includeBp ? <CheckSquare size={16} className="text-teal-600" /> : <Square size={16} />}
                <span>Blood Pressure</span>
              </div>
              <div style={checkboxSt} onClick={() => setIncludeThyroid(!includeThyroid)}>
                {includeThyroid ? <CheckSquare size={16} className="text-amber-500" /> : <Square size={16} />}
                <span>Thyroid Tested Vitals</span>
              </div>
              <div style={checkboxSt} onClick={() => setIncludeMeds(!includeMeds)}>
                {includeMeds ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                <span>Medication Intake Logs</span>
              </div>
              <div style={checkboxSt} onClick={() => setIncludeWater(!includeWater)}>
                {includeWater ? <CheckSquare size={16} className="text-sky-500" /> : <Square size={16} />}
                <span>Hydration Tracking</span>
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <p style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 10 }}>
              2. Select Report Timeframe
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { label: "Today", days: 1 },
                { label: "Last 7 Days", days: 7 },
                { label: "Last 14 Days", days: 14 },
                { label: "Last 30 Days", days: 30 },
                { label: "Custom Range", days: 0 }
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p.days)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1.5px solid ${(!customRange && daysPreset === p.days) || (customRange && p.days === 0) ? "#0f172a" : "#cbd5e1"}`,
                    background: (!customRange && daysPreset === p.days) || (customRange && p.days === 0) ? "#0f172a" : "white",
                    color: (!customRange && daysPreset === p.days) || (customRange && p.days === 0) ? "white" : "#64748b",
                    transition: "all 0.15s"
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {customRange && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>FROM</label>
                  <input 
                    type="text" 
                    value={fromDate} 
                    onChange={e => setFromDate(e.target.value)} 
                    placeholder="YYYY-MM-DD" 
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontSize: "0.85rem", color: "#0f172a" }} 
                  />
                </div>
                <div style={{ marginTop: 16, color: "#94a3b8" }}>→</div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>TO</label>
                  <input 
                    type="text" 
                    value={toDate} 
                    onChange={e => setToDate(e.target.value)} 
                    placeholder="YYYY-MM-DD" 
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontSize: "0.85rem", color: "#0f172a" }} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Trigger */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
            <button
              onClick={generateReport}
              disabled={exporting}
              style={{
                background: exporting ? "#e2e8f0" : "linear-gradient(135deg, #10b981, #059669)",
                color: exporting ? "#94a3b8" : "white",
                border: "none",
                borderRadius: 12,
                padding: "10px 22px",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: exporting ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Calendar size={16} />
              {exporting ? "⏳ Compiling Sections..." : "⬇️ Download Combined PDF Report"}
            </button>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Selected timeframe: {fromDate} → {toDate}
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
