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
  insulinLogId?: string;
  insulinName?: string;
  insulinUnits?: number;
  insulinTakenAt?: string;
  note: string;
  measuredAt: string;
}

interface InsulinLog {
  _id: string;
  insulinName: string;
  units: number;
  takenAt: string;
  note: string;
}

const timingLabel = (val: string) =>
  SUGAR_TIMINGS.find(t => t.value === val)?.label ?? val;

// Sugar change vs previous reading
const getDelta = (readings: Reading[], index: number) => {
  if (index >= readings.length - 1) return null;
  const diff = readings[index].value - readings[index + 1].value;
  if (diff === 0) return { label: "No change", color: "#6b7280" };
  if (diff > 0)   return { label: `▲ +${diff}`, color: "#e74c3c" };
  return            { label: `▼ ${diff}`,  color: "#27ae60" };
};

// Time gap between insulin taken and sugar measured
const insulinGap = (takenAt: string, measuredAt: string): string => {
  const mins = Math.round((new Date(measuredAt).getTime() - new Date(takenAt).getTime()) / 60000);
  if (mins < 0)  return `${Math.abs(mins)}m before insulin`;
  if (mins < 60) return `${mins}m after insulin`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m after insulin` : `${h}h after insulin`;
};

export default function SugarTab() {
  const [readings, setReadings]     = useState<Reading[]>([]);
  const [recentLogs, setRecentLogs] = useState<InsulinLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showForm, setShowForm]     = useState(false);

  // Add / Edit form state
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [value, setValue]                   = useState("");
  const [timing, setTiming]                 = useState("fasting_morning");
  const [selectedLogId, setSelectedLogId]   = useState("none");
  const [note, setNote]                     = useState("");
  const [measuredAt, setMeasuredAt]         = useState(formatInputDefault());

  const fetchReadings = async () => {
    setLoading(true);
    setReadings(await (await fetch("/api/readings")).json());
    setLoading(false);
  };
  // Fetch insulin logs from last 24 hours for the dropdown
  const fetchRecentLogs = async () => {
    setRecentLogs(await (await fetch("/api/insulin?type=logs&hours=24&limit=20")).json());
  };

  useEffect(() => { fetchReadings(); fetchRecentLogs(); }, []);

  // Open form for ADD
  const openAdd = () => {
    setEditingId(null);
    setValue(""); setTiming("fasting_morning");
    setSelectedLogId("none"); setNote("");
    setMeasuredAt(formatInputDefault());
    fetchRecentLogs(); // refresh 24hr logs
    setShowForm(true);
  };

  // Open form for EDIT
  const openEdit = (r: Reading) => {
    setEditingId(r._id);
    setValue(String(r.value));
    setTiming(r.timing);
    setSelectedLogId(r.insulinLogId ?? "none");
    setNote(r.note);
    setMeasuredAt(r.measuredAt.slice(0, 16));
    fetchRecentLogs();
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!value.trim()) return alert("Please enter sugar level");
    setSaving(true);

    const payload: Record<string, unknown> = {
      value: toNumber(value), timing, note,
      measuredAt: new Date(measuredAt),
      insulinLogId: selectedLogId !== "none" ? selectedLogId : null,
    };

    if (editingId) {
      await fetch("/api/readings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...payload }) });
    } else {
      await fetch("/api/readings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }

    setValue(""); setNote(""); setSelectedLogId("none");
    setMeasuredAt(formatInputDefault()); setShowForm(false); setEditingId(null);
    await fetchReadings(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reading?")) return;
    await fetch("/api/readings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchReadings();
  };

  const buildPdfSections = async (from: dayjs.Dayjs, to: dayjs.Dayjs): Promise<PdfSection[]> => {
    const all: Reading[] = await (await fetch("/api/readings?limit=500")).json();
    const filtered = all.filter(r => { const d = dayjs(r.measuredAt); return d.isAfter(from) && d.isBefore(to); });
    const rows = filtered.map((r, i) => {
      const s = sugarStatus(r.value, r.timing);
      const delta = getDelta(filtered, i);
      const gap = r.insulinTakenAt ? insulinGap(r.insulinTakenAt, r.measuredAt) : "";
      return [formatDisplay(r.measuredAt), `${r.value} mg/dL`, timingLabel(r.timing), s.label, r.insulinName || "—", gap || "—", delta?.label ?? "—", r.note || "—"];
    });
    return [{ title: "🩸 Sugar / Diabetes Readings", headers: ["Date & Time","Sugar","Timing","Status","Insulin","Gap","Change","Note"], rows, accentRgb: [232,86,106] }];
  };

  const latest = readings[0];
  const latestStatus = latest ? sugarStatus(latest.value, latest.timing) : null;

  const sel: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.85rem", fontFamily: "var(--font-body)", color: "#1a1a2e", background: "white", outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" };

  return (
    <div>
      {/* Latest card */}
      {latest && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem 2rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(232,86,106,0.10)", border: "1px solid #fde8ec", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Latest Reading</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 700, color: latestStatus?.color }}>{latest.value}</span>
              <span style={{ color: "#6b7280" }}>mg/dL</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ background: latestStatus?.color + "20", color: latestStatus?.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600 }}>{latestStatus?.label}</span>
              <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>{timingLabel(latest.timing)}</span>
              {latest.insulinName && <span style={{ background: "#f3f0ff", color: "#7c3aed", padding: "3px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600 }}>💉 {latest.insulinName}</span>}
              {latest.insulinTakenAt && <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>{insulinGap(latest.insulinTakenAt, latest.measuredAt)}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>{formatDisplay(latest.measuredAt)}</p>
            {readings.length > 1 && (() => { const d = getDelta(readings, 0); return d ? <p style={{ color: d.color, fontWeight: 700, marginTop: 4 }}>{d.label} mg/dL vs last</p> : null; })()}
            {latest.note && <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: 4, fontStyle: "italic" }}>"{latest.note}"</p>}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={openAdd} style={{ background: "linear-gradient(135deg, #e8566a, #c0394d)", color: "white", border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          + Add Reading
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(232,86,106,0.08)", border: "1px solid #fde8ec" }}>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "1.2rem", color: "#e8566a" }}>
            {editingId ? "✏️ Edit Reading" : "Record Sugar Level"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem" }}>
            <div>
              <label style={lbl}>Sugar Level (mg/dL) *</label>
              <input type="text" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 120" style={inp} />
            </div>
            <div>
              <label style={lbl}>Timing *</label>
              <div style={{ position: "relative" }}>
                <select value={timing} onChange={e => setTiming(e.target.value)} style={sel}>
                  {SUGAR_TIMINGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <span style={chev}>▼</span>
              </div>
            </div>

            {/* Insulin log dropdown — shows last 24hrs */}
            <div>
              <label style={lbl}>
                💉 Insulin Taken (last 24hrs)
                {recentLogs.length === 0 && <span style={{ color: "#f59e0b", fontSize: "0.7rem", marginLeft: 6 }}>⚠ No recent logs</span>}
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedLogId}
                  onChange={e => setSelectedLogId(e.target.value)}
                  style={{ ...sel, borderColor: selectedLogId !== "none" ? "#7c3aed" : "#e5e7eb", color: selectedLogId !== "none" ? "#7c3aed" : "#1a1a2e" }}
                >
                  <option value="none">— None / Not taken —</option>
                  {recentLogs.map(l => {
                    const hoursAgo = Math.round((Date.now() - new Date(l.takenAt).getTime()) / 3600000);
                    return (
                      <option key={l._id} value={l._id}>
                        {l.insulinName} · {formatDisplay(l.takenAt)} ({hoursAgo}h ago)
                      </option>
                    );
                  })}
                </select>
                <span style={chev}>▼</span>
              </div>
              <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 4 }}>
                Log doses first in the 💉 Insulin tab — appears here for 24hrs
              </p>
            </div>

            <DateTimePicker value={measuredAt} onChange={setMeasuredAt} label="Date & Time *" accentColor="#e8566a" />
            <div>
              <label style={lbl}>Note (optional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. After breakfast" style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: "1.2rem" }}>
            <button onClick={handleSubmit} disabled={saving} style={{ background: "linear-gradient(135deg, #e8566a, #c0394d)", color: "white", border: "none", borderRadius: 10, padding: "11px 28px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : editingId ? "Update Reading" : "Save Reading"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ background: "#f5f5f5", color: "#6b7280", border: "none", borderRadius: 10, padding: "11px 22px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
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

      <PdfExportPanel accentColor="#e8566a" accentRgb={[232,86,106]} buildSections={buildPdfSections} tabLabel="Sugar" />

      {/* History table */}
      <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>History</h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{readings.length} records</span>
        </div>
        {loading ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>Loading...</div>
          : readings.length === 0 ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}><div style={{ fontSize: "2rem", marginBottom: 8 }}>🩸</div>No readings yet.</div>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Date & Time","Value","Timing","Status","Insulin Used","Time Gap","Change","Note",""].map(h => <th key={h} style={thSt}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r, i) => {
                    const s = sugarStatus(r.value, r.timing);
                    const delta = getDelta(readings, i);
                    const gap = r.insulinTakenAt ? insulinGap(r.insulinTakenAt, r.measuredAt) : null;
                    return (
                      <tr key={r._id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                        <td style={tdSt}>{formatDisplay(r.measuredAt)}</td>
                        <td style={{ ...tdSt, fontWeight: 700, color: s.color, fontSize: "1rem" }}>{r.value} <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "#9ca3af" }}>mg/dL</span></td>
                        <td style={{ ...tdSt, maxWidth: 160 }}><span style={{ background: "#f5f5f5", padding: "2px 8px", borderRadius: 6, fontSize: "0.75rem", display: "inline-block" }}>{timingLabel(r.timing)}</span></td>
                        <td style={tdSt}><span style={{ background: s.color + "18", color: s.color, padding: "2px 8px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600 }}>{s.label}</span></td>
                        <td style={tdSt}>
                          {r.insulinName
                            ? <div>
                                <span style={{ background: "#f3f0ff", color: "#7c3aed", padding: "2px 8px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600 }}>💉 {r.insulinName}</span>
                                {r.insulinTakenAt && <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 2 }}>at {dayjs(r.insulinTakenAt).format("hh:mm A")}</div>}
                              </div>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={tdSt}>
                          {gap
                            ? <span style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600, whiteSpace: "nowrap" }}>{gap}</span>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={tdSt}>
                          {delta
                            ? <span style={{ fontWeight: 700, fontSize: "0.85rem", color: delta.color, whiteSpace: "nowrap" }}>{delta.label}</span>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ ...tdSt, color: "#6b7280", fontSize: "0.82rem", fontStyle: "italic" }}>{r.note || "—"}</td>
                        <td style={tdSt}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => openEdit(r)} style={{ background: "#f3f0ff", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: "0.85rem" }}>✏️</button>
                            <button onClick={() => handleDelete(r._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db" }}>🗑️</button>
                          </div>
                        </td>
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

const lbl: React.CSSProperties  = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: React.CSSProperties  = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.9rem", fontFamily: "var(--font-body)", color: "#1a1a2e", outline: "none", background: "white" };
const chev: React.CSSProperties = { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 11, color: "#9ca3af" };
const thSt: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 };
const tdSt: React.CSSProperties = { padding: "12px 16px", fontSize: "0.85rem", color: "#1a1a2e" };