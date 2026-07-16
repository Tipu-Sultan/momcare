"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { toInt, formatDisplay, formatInputDefault, bpStatus } from "@/lib/helpers";
import DateTimePicker from "./DateTimePicker";
import PdfExportPanel from "./PdfExportPanel";
import { PdfSection } from "@/lib/pdfExport";

import { useHealthStore } from "@/lib/store";

interface Reading {
  _id: string; systolic: number; diastolic: number; pulse: number; note: string; measuredAt: string;
}

export default function BPTab() {
  const { bpReadings, fetchBpReadings, bpLoaded } = useHealthStore();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(!bpLoaded);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [note, setNote] = useState("");
  const [measuredAt, setMeasuredAt] = useState(formatInputDefault());

  const fetchReadings = async (force = false) => {
    await fetchBpReadings(force);
    setReadings(useHealthStore.getState().bpReadings as unknown as Reading[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const handleSubmit = async () => {
    if (!sys || !dia) return alert("Please enter Systolic and Diastolic");
    setSaving(true);
    await fetch("/api/bp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systolic: toInt(sys), diastolic: toInt(dia), pulse: toInt(pulse), note, measuredAt: new Date(measuredAt) }) });
    setSys(""); setDia(""); setPulse(""); setNote(""); setMeasuredAt(formatInputDefault()); setShowForm(false);
    setLoading(true);
    await fetchReadings(true); setSaving(false);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await fetch("/api/bp", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setLoading(true);
    fetchReadings(true);
  };

  const buildPdfSections = async (from: dayjs.Dayjs, to: dayjs.Dayjs): Promise<PdfSection[]> => {
    const res = await fetch("/api/bp?limit=500");
    const all: Reading[] = await res.json();
    const filtered = all.filter(r => { const d = dayjs(r.measuredAt); return d.isAfter(from) && d.isBefore(to); });
    const rows = filtered.map(r => {
      const s = bpStatus(r.systolic, r.diastolic);
      return [formatDisplay(r.measuredAt), `${r.systolic}/${r.diastolic} mmHg`, r.pulse > 0 ? `${r.pulse} bpm` : "—", s.label, r.note || "—"];
    });
    return [{ title: "💓 Blood Pressure Readings", headers: ["Date & Time","BP (Sys/Dia)","Pulse","Status","Note"], rows, accentRgb: [45,149,150] }];
  };

  const latest = readings[0];
  const latestStatus = latest ? bpStatus(latest.systolic, latest.diastolic) : null;

  const avgSys = readings.length > 0
    ? Math.round(readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length)
    : 0;
  const avgDia = readings.length > 0
    ? Math.round(readings.reduce((sum, r) => sum + r.diastolic, 0) / readings.length)
    : 0;

  return (
    <div>
      {latest && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem 2rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(45,149,150,0.10)", border: "1px solid #e0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
              Latest Reading
              {avgSys > 0 && (
                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>
                  AVG: {avgSys}/{avgDia} mmHg
                </span>
              )}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 700, color: latestStatus?.color }}>{latest.systolic}</span>
              <span style={{ color: "#9ca3af", fontSize: "1.5rem" }}>/</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: latestStatus?.color }}>{latest.diastolic}</span>
              <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>mmHg</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <span style={{ background: latestStatus?.color + "20", color: latestStatus?.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600 }}>{latestStatus?.label}</span>
              {latest.pulse > 0 && <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>❤️ {latest.pulse} bpm</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>{formatDisplay(latest.measuredAt)}</p>
            {latest.note && <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: 4, fontStyle: "italic" }}>&quot;{latest.note}&quot;</p>}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1rem", display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? "#e0f5f5" : "linear-gradient(135deg, #2d9596, #1e6e6e)", color: showForm ? "#2d9596" : "white", border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          {showForm ? "✕ Cancel" : "+ Add Reading"}
        </button>
        <button
          onClick={async () => {
            setLoading(true);
            await fetchReadings(true);
          }}
          disabled={loading}
          style={{
            background: "white",
            color: "#2d9596",
            border: "1.5px solid #e0f0f0",
            borderRadius: 12,
            padding: "11px 18px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(45,149,150,0.05)",
            transition: "all 0.2s ease",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: loading ? "rotate(360deg)" : "none",
              transition: loading ? "transform 1s linear infinite" : "none",
            }}
          >
            🔄
          </span>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(45,149,150,0.08)", border: "1px solid #e0f0f0" }}>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "1.2rem", color: "#2d9596" }}>Record Blood Pressure</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem" }}>
            {[{ label: "Systolic (mmHg) *", val: sys, set: setSys, ph: "e.g. 120" }, { label: "Diastolic (mmHg) *", val: dia, set: setDia, ph: "e.g. 80" }, { label: "Pulse (bpm)", val: pulse, set: setPulse, ph: "e.g. 72" }].map(f => (
              <div key={f.label}>
                <label style={labelSt}>{f.label}</label>
                <input type="text" inputMode="numeric" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={inputSt} />
              </div>
            ))}
            <DateTimePicker value={measuredAt} onChange={setMeasuredAt} label="Date & Time *" accentColor="#2d9596" />
            <div>
              <label style={labelSt}>Note</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. After rest" style={inputSt} />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{ marginTop: "1.2rem", background: "linear-gradient(135deg, #2d9596, #1e6e6e)", color: "white", border: "none", borderRadius: 10, padding: "11px 28px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Reading"}
          </button>
        </div>
      )}

      <div style={{ background: "#f0fafa", borderRadius: 12, padding: "0.8rem 1.2rem", marginBottom: "1.5rem", border: "1px solid #e0f0f0" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#2d9596", marginBottom: 6 }}>📊 Reference Ranges</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem" }}>
          {[["Normal","<120/80"],["Elevated","120–129/<80"],["High Stage 1","130–139/80–89"],["High Stage 2","≥140/≥90"]].map(([k,v]) => (
            <span key={k} style={{ fontSize: "0.75rem", color: "#6b7280" }}><b style={{ color: "#1a1a2e" }}>{k}:</b> {v}</span>
          ))}
        </div>
      </div>

      <PdfExportPanel accentColor="#2d9596" accentRgb={[45,149,150]} buildSections={buildPdfSections} tabLabel="BP" />

      <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>History</h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{readings.length} records</span>
        </div>
        {loading ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>Loading...</div>
          : readings.length === 0 ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}><div style={{ fontSize: "2rem", marginBottom: 8 }}>💓</div>No readings yet.</div>
          : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#fafafa" }}>{["Date & Time","BP","Pulse","Status","Note",""].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                <tbody>
                  {readings.map((r, i) => {
                    const s = bpStatus(r.systolic, r.diastolic);
                    return (
                      <tr key={r._id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                        <td style={tdSt}>{formatDisplay(r.measuredAt)}</td>
                        <td style={{ ...tdSt, fontWeight: 700, color: s.color }}>{r.systolic}/{r.diastolic} <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "#9ca3af" }}>mmHg</span></td>
                        <td style={tdSt}>{r.pulse > 0 ? `${r.pulse} bpm` : "—"}</td>
                        <td style={tdSt}><span style={{ background: s.color + "18", color: s.color, padding: "2px 8px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600 }}>{s.label}</span></td>
                        <td style={{ ...tdSt, color: "#6b7280", fontStyle: "italic", fontSize: "0.82rem" }}>{r.note || "—"}</td>
                        <td style={tdSt}><button onClick={() => handleDelete(r._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db" }}>🗑️</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.9rem", fontFamily: "var(--font-body)", color: "#1a1a2e", outline: "none", background: "white" };
const thSt: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 };
const tdSt: React.CSSProperties = { padding: "12px 16px", fontSize: "0.85rem", color: "#1a1a2e" };
