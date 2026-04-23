"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { toNumber, formatDisplay, formatInputDefault, sugarStatus, SUGAR_TIMINGS } from "@/lib/helpers";
import DateTimePicker from "./DateTimePicker";
import PdfExportPanel from "./PdfExportPanel";
import { PdfSection } from "@/lib/pdfExport";

interface Reading {
  _id: string;
  value: number;
  timing: string;
  note: string;
  measuredAt: string;
}

const timingLabel = (val: string) =>
  SUGAR_TIMINGS.find(t => t.value === val)?.label ?? val;

export default function SugarTab() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [value, setValue] = useState("");
  const [timing, setTiming] = useState("fasting_morning");
  const [note, setNote] = useState("");
  const [measuredAt, setMeasuredAt] = useState(formatInputDefault());

  const fetchReadings = async () => {
    setLoading(true);
    const res = await fetch("/api/readings");
    setReadings(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchReadings(); }, []);

  const handleSubmit = async () => {
    if (!value.trim()) return alert("Please enter sugar level");
    setSaving(true);
    await fetch("/api/readings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: toNumber(value), timing, note, measuredAt: new Date(measuredAt) }),
    });
    setValue(""); setNote(""); setMeasuredAt(formatInputDefault()); setShowForm(false);
    await fetchReadings();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reading?")) return;
    await fetch("/api/readings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchReadings();
  };

  const buildPdfSections = async (from: dayjs.Dayjs, to: dayjs.Dayjs): Promise<PdfSection[]> => {
    const res = await fetch("/api/readings?limit=500");
    const all: Reading[] = await res.json();
    const filtered = all.filter(r => {
      const d = dayjs(r.measuredAt);
      return d.isAfter(from) && d.isBefore(to);
    });
    const rows = filtered.map(r => {
      const s = sugarStatus(r.value, r.timing);
      return [formatDisplay(r.measuredAt), r.value + " mg/dL", timingLabel(r.timing), s.label, r.note || "—"];
    });
    return [{
      title: "🩸 Sugar / Diabetes Readings",
      headers: ["Date & Time", "Sugar Level", "Timing", "Status", "Note"],
      rows,
      accentRgb: [232, 86, 106],
    }];
  };

  const latest = readings[0];
  const latestStatus = latest ? sugarStatus(latest.value, latest.timing) : null;

  const sel: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1.5px solid #e5e7eb", fontSize: "0.85rem",
    fontFamily: "var(--font-body)", color: "#1a1a2e",
    background: "white", outline: "none", cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
  };

  return (
    <div>
      {/* Latest card */}
      {latest && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem 2rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(232,86,106,0.10)", border: "1px solid #fde8ec", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Latest Reading</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 700, color: latestStatus?.color }}>{latest.value}</span>
              <span style={{ color: "#6b7280", fontSize: "1rem" }}>mg/dL</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ background: latestStatus?.color + "20", color: latestStatus?.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600 }}>{latestStatus?.label}</span>
              <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>{timingLabel(latest.timing)}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>{formatDisplay(latest.measuredAt)}</p>
            {latest.note && <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: 4, fontStyle: "italic" }}>"{latest.note}"</p>}
          </div>
        </div>
      )}

      {/* Add button */}
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? "#fee2e5" : "linear-gradient(135deg, #e8566a, #c0394d)", color: showForm ? "#e8566a" : "white", border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          {showForm ? "✕ Cancel" : "+ Add Reading"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(232,86,106,0.08)", border: "1px solid #fde8ec" }}>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "1.2rem", color: "#e8566a" }}>Record Sugar Level</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem" }}>
            <div>
              <label style={labelSt}>Sugar Level (mg/dL) *</label>
              <input type="text" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 120" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Timing *</label>
              <div style={{ position: "relative" }}>
                <select value={timing} onChange={e => setTiming(e.target.value)} style={sel}>
                  {SUGAR_TIMINGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 11, color: "#9ca3af" }}>▼</span>
              </div>
            </div>
            <DateTimePicker value={measuredAt} onChange={setMeasuredAt} label="Date & Time *" accentColor="#e8566a" />
            <div>
              <label style={labelSt}>Note (optional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. After breakfast, feeling dizzy" style={inputSt} />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{ marginTop: "1.2rem", background: "linear-gradient(135deg, #e8566a, #c0394d)", color: "white", border: "none", borderRadius: 10, padding: "11px 28px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Reading"}
          </button>
        </div>
      )}

      {/* Reference */}
      <div style={{ background: "#fff5f6", borderRadius: 12, padding: "0.8rem 1.2rem", marginBottom: "1.5rem", border: "1px solid #fde8ec" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#e8566a", marginBottom: 6 }}>📊 Reference Ranges</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem" }}>
          {[["Fasting Normal","70–100"],["Post Meal Normal","≤140"],["Pre-diabetic (F)","101–125"],["Diabetic (F)",">125"]].map(([k,v]) => (
            <span key={k} style={{ fontSize: "0.75rem", color: "#6b7280" }}><b style={{ color: "#1a1a2e" }}>{k}:</b> {v} mg/dL</span>
          ))}
        </div>
      </div>

      {/* PDF Export */}
      <PdfExportPanel accentColor="#e8566a" accentRgb={[232,86,106]} buildSections={buildPdfSections} tabLabel="Sugar" />

      {/* History */}
      <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "#1a1a2e" }}>History</h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{readings.length} records</span>
        </div>
        {loading ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>Loading...</div>
          : readings.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🩸</div>No readings yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Date & Time","Value","Timing","Status","Note",""].map(h => (
                      <th key={h} style={thSt}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r, i) => {
                    const s = sugarStatus(r.value, r.timing);
                    return (
                      <tr key={r._id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                        <td style={tdSt}>{formatDisplay(r.measuredAt)}</td>
                        <td style={{ ...tdSt, fontWeight: 700, color: s.color, fontSize: "1rem" }}>{r.value} <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "#9ca3af" }}>mg/dL</span></td>
                        <td style={{ ...tdSt, maxWidth: 180 }}><span style={{ background: "#f5f5f5", padding: "2px 8px", borderRadius: 6, fontSize: "0.75rem", display: "inline-block" }}>{timingLabel(r.timing)}</span></td>
                        <td style={tdSt}><span style={{ background: s.color + "18", color: s.color, padding: "2px 8px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600 }}>{s.label}</span></td>
                        <td style={{ ...tdSt, color: "#6b7280", fontSize: "0.82rem", fontStyle: "italic" }}>{r.note || "—"}</td>
                        <td style={tdSt}><button onClick={() => handleDelete(r._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db" }}>🗑️</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.9rem", fontFamily: "var(--font-body)", color: "#1a1a2e", outline: "none", background: "white" };
const thSt: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 };
const tdSt: React.CSSProperties = { padding: "12px 16px", fontSize: "0.85rem", color: "#1a1a2e" };
