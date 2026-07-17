"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { toNumber, formatDisplay, formatInputDefault, thyroidStatus } from "@/lib/helpers";
import DateTimePicker from "./DateTimePicker";
import PdfExportPanel from "./PdfExportPanel";
import { PdfSection } from "@/lib/pdfExport";

import { useHealthStore } from "@/lib/store";

interface Reading {
  _id: string; tsh: number; t3: number; t4: number; note: string; testedAt: string;
}

export default function ThyroidTab() {
  const { thyroidReadings, fetchThyroidReadings, thyroidLoaded } = useHealthStore();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(!thyroidLoaded);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tsh, setTsh] = useState("");
  const [t3, setT3] = useState("");
  const [t4, setT4] = useState("");
  const [note, setNote] = useState("");
  const [testedAt, setTestedAt] = useState(formatInputDefault());

  const fetchReadings = async (force = false) => {
    await fetchThyroidReadings(force);
    setReadings(useHealthStore.getState().thyroidReadings as unknown as Reading[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const handleSubmit = async () => {
    if (!tsh) return alert("TSH value is required");
    setSaving(true);
    await fetch("/api/thyroid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tsh: toNumber(tsh), t3: toNumber(t3), t4: toNumber(t4), note, testedAt: new Date(testedAt) }) });
    setTsh(""); setT3(""); setT4(""); setNote(""); setTestedAt(formatInputDefault()); setShowForm(false);
    setLoading(true);
    await fetchReadings(true); setSaving(false);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await fetch("/api/thyroid", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setLoading(true);
    fetchReadings(true);
  };

  const buildPdfSections = async (from: dayjs.Dayjs, to: dayjs.Dayjs): Promise<PdfSection[]> => {
    const res = await fetch("/api/thyroid?limit=200");
    const all: Reading[] = await res.json();
    const filtered = all.filter(r => { const d = dayjs(r.testedAt); return d.isAfter(from) && d.isBefore(to); });
    const rows = filtered.map(r => {
      const s = thyroidStatus(r.tsh);
      return [formatDisplay(r.testedAt), `${r.tsh} mIU/L`, r.t3 > 0 ? `${r.t3}` : "—", r.t4 > 0 ? `${r.t4}` : "—", s.label, r.note || "—"];
    });
    return [{ title: "🧬 Thyroid Test Results", headers: ["Test Date","TSH","T3","T4","Status","Note"], rows, accentRgb: [212,135,10] }];
  };

  const latest = readings[0];
  const latestStatus = latest ? thyroidStatus(latest.tsh) : null;

  const avgTsh = readings.length > 0
    ? (readings.reduce((sum, r) => sum + r.tsh, 0) / readings.length).toFixed(2)
    : "0";

  return (
    <div>
      {latest && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem 2rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(212,135,10,0.10)", border: "1px solid #fdedc8", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
              Latest TSH
              {Number(avgTsh) > 0 && (
                <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>
                  AVG: {avgTsh} mIU/L
                </span>
              )}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 700, color: latestStatus?.color }}>{latest.tsh}</span>
              <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>mIU/L</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <span style={{ background: latestStatus?.color + "20", color: latestStatus?.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600 }}>{latestStatus?.label}</span>
              {latest.t3 > 0 && <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>T3: {latest.t3}</span>}
              {latest.t4 > 0 && <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>T4: {latest.t4}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>{formatDisplay(latest.testedAt)}</p>
            {latest.note && <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: 4, fontStyle: "italic" }}>&quot;{latest.note}&quot;</p>}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1rem", display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? "#fdf3e0" : "linear-gradient(135deg, #d4870a, #a86408)", color: showForm ? "#d4870a" : "white", border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          {showForm ? "✕ Cancel" : "+ Add Test Result"}
        </button>
        <button
          onClick={async () => {
            setLoading(true);
            await fetchReadings(true);
          }}
          disabled={loading}
          style={{
            background: "white",
            color: "#d4870a",
            border: "1.5px solid #fdedc8",
            borderRadius: 12,
            padding: "11px 18px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(212,135,10,0.05)",
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
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(212,135,10,0.08)", border: "1px solid #fdedc8" }}>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "1.2rem", color: "#d4870a" }}>Record Thyroid Test</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem" }}>
            {[{ label: "TSH (mIU/L) *", val: tsh, set: setTsh, ph: "e.g. 2.5" }, { label: "T3 (pg/mL)", val: t3, set: setT3, ph: "e.g. 3.1" }, { label: "T4 (ng/dL)", val: t4, set: setT4, ph: "e.g. 1.2" }].map(f => (
              <div key={f.label}>
                <label style={labelSt}>{f.label}</label>
                <input type="text" inputMode="decimal" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={inputSt} />
              </div>
            ))}
            <DateTimePicker value={testedAt} onChange={setTestedAt} label="Test Date & Time *" accentColor="#d4870a" />
            <div>
              <label style={labelSt}>Note</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Lab name, doctor" style={inputSt} />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{ marginTop: "1.2rem", background: "linear-gradient(135deg, #d4870a, #a86408)", color: "white", border: "none", borderRadius: 10, padding: "11px 28px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Result"}
          </button>
        </div>
      )}

      <div style={{ background: "#fffbf0", borderRadius: 12, padding: "0.8rem 1.2rem", marginBottom: "1.5rem", border: "1px solid #fdedc8" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#d4870a", marginBottom: 6 }}>📊 TSH Reference</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem" }}>
          {[["Normal","0.4–4.0 mIU/L"],["Low (Hyper)","<0.4"],["Mildly High","4.1–10"],["High (Hypo)",">10"]].map(([k,v]) => (
            <span key={k} style={{ fontSize: "0.75rem", color: "#6b7280" }}><b style={{ color: "#1a1a2e" }}>{k}:</b> {v}</span>
          ))}
        </div>
      </div>

      <PdfExportPanel accentColor="#d4870a" accentRgb={[212,135,10]} buildSections={buildPdfSections} tabLabel="Thyroid" />

      <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>History</h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{readings.length} records</span>
        </div>
        {loading ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>Loading...</div>
          : readings.length === 0 ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}><div style={{ fontSize: "2rem", marginBottom: 8 }}>🧬</div>No records yet.</div>
          : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#fafafa" }}>{["Test Date","TSH","T3","T4","Status","Note",""].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                <tbody>
                  {readings.map((r, i) => {
                    const s = thyroidStatus(r.tsh);
                    return (
                      <tr key={r._id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                        <td style={tdSt}>{formatDisplay(r.testedAt)}</td>
                        <td style={{ ...tdSt, fontWeight: 700, color: s.color }}>{r.tsh} <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "#9ca3af" }}>mIU/L</span></td>
                        <td style={tdSt}>{r.t3 > 0 ? r.t3 : "—"}</td>
                        <td style={tdSt}>{r.t4 > 0 ? r.t4 : "—"}</td>
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
