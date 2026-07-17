"use client";
import { useEffect, useState } from "react";
import { toInt, formatDisplay, formatInputDefault } from "@/lib/helpers";
import DateTimePicker from "./DateTimePicker";
import { useHealthStore } from "@/lib/store";

interface InsulinType {
  _id: string;
  name: string;
  units: number;
  timing: string;
  notes?: string;
  active: boolean;
}

// Populated log — insulinTypeId is an object (from .populate())
interface InsulinLog {
  _id: string;
  insulinTypeId: InsulinType | string; // populated object or raw id
  insulinName: string;  // snapshot fallback
  units: number;
  takenAt: string;
  note: string;
}

// Helper: get live name from populated log (falls back to snapshot)
const getLogLabel = (log: InsulinLog): string => {
  if (log.insulinTypeId && typeof log.insulinTypeId === "object") {
    const t = log.insulinTypeId as InsulinType;
    return `${t.name} ${t.units}u`;
  }
  return log.insulinName; // snapshot fallback
};

const TIMING_OPTIONS = [
  { value: "morning_1", label: "🌅 Morning (Before Breakfast)" },
  { value: "morning_2", label: "🌅 Morning (After Breakfast)" },
  { value: "noon_1",    label: "☀️ Noon (Before Lunch)" },
  { value: "noon_2",    label: "☀️ Noon (After Lunch)" },
  { value: "evening_1", label: "🌇 Evening (Before Dinner)" },
  { value: "evening_2", label: "🌇 Evening (After Dinner)" },
  { value: "night_1",   label: "🌙 Night (Before Bed)" },
  { value: "night_2",   label: "🌙 Night (After Bed)" },
  { value: "as_needed", label: "⚡ As Needed" },
];

const timingLabel = (val: string) =>
  TIMING_OPTIONS.find(o => o.value === val)?.label ?? val;

const ACCENT = "#7c3aed";
const AL = "#f3f0ff";
const AB = "#e0d9ff";

export default function InsulinTab() {
  const [types, setTypes] = useState<InsulinType[]>([]);
  const [logs,  setLogs]  = useState<InsulinLog[]>([]);
  const [loadT, setLoadT] = useState(true);
  const [loadL, setLoadL] = useState(true);
  const [now,   setNow]   = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  // Type form
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType,  setEditingType]  = useState<InsulinType | null>(null);
  const [typeName,     setTypeName]     = useState("");
  const [typeUnits,    setTypeUnits]    = useState("");
  const [typeTiming,   setTypeTiming]   = useState("morning_1");
  const [typeNotes,    setTypeNotes]    = useState("");
  const [savingType,   setSavingType]   = useState(false);

  // Log form
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog,  setEditingLog]  = useState<InsulinLog | null>(null);
  const [logTypeId,   setLogTypeId]   = useState("");
  const [logTakenAt,  setLogTakenAt]  = useState(formatInputDefault());
  const [logNote,     setLogNote]     = useState("");
  const [savingLog,   setSavingLog]   = useState(false);

  const fetchTypes = async (force = false) => {
    if (force) {
      await useHealthStore.getState().fetchInsulinTypes(true);
      setTypes(useHealthStore.getState().insulinTypes);
    } else {
      setTypes(await (await fetch("/api/insulin?type=types")).json());
    }
    setLoadT(false);
  };
  const fetchLogs = async (force = false) => {
    if (force) {
      await useHealthStore.getState().fetchInsulinLogs(true);
      setLogs(useHealthStore.getState().insulinLogs as unknown as InsulinLog[]);
    } else {
      setLogs(await (await fetch("/api/insulin?type=logs&limit=50")).json());
    }
    setLoadL(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTypes(true), fetchLogs(true)]);
    setNow(Date.now());
    setRefreshing(false);
  };

  useEffect(() => {
    const load = async () => {
      await fetchTypes();
      await fetchLogs();
      setNow(Date.now());
    };
    load();
  }, []);

  // ── Type form actions ──
  const openAddType = () => {
    setEditingType(null);
    setTypeName(""); setTypeUnits(""); setTypeTiming("morning_1"); setTypeNotes("");
    setShowTypeForm(true); setShowLogForm(false);
  };
  const openEditType = (t: InsulinType) => {
    setEditingType(t);
    setTypeName(t.name); setTypeUnits(String(t.units));
    setTypeTiming(t.timing); setTypeNotes(t.notes ?? "");
    setShowTypeForm(true); setShowLogForm(false);
  };

  // ── Log form actions ──
  const openAddLog = () => {
    setEditingLog(null);
    const first = types.find(t => t.active);
    setLogTypeId(first?._id ?? "");
    setLogTakenAt(formatInputDefault()); setLogNote("");
    setShowLogForm(true); setShowTypeForm(false);
  };
  const openEditLog = (l: InsulinLog) => {
    setEditingLog(l);
    // insulinTypeId may be populated object or string
    const typeId = typeof l.insulinTypeId === "object"
      ? (l.insulinTypeId as InsulinType)._id
      : l.insulinTypeId;
    setLogTypeId(typeId);
    // Use exact ISO string so DateTimePicker syncs correctly
    setLogTakenAt(l.takenAt.slice(0, 16));
    setLogNote(l.note);
    setShowLogForm(true); setShowTypeForm(false);
  };

  const handleSaveType = async () => {
    if (!typeName.trim() || !typeUnits) return alert("Name and units required");
    setSavingType(true);
    const payload = { name: typeName.trim(), units: toInt(typeUnits), timing: typeTiming, notes: typeNotes };
    if (editingType) {
      await fetch("/api/insulin?type=types", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingType._id, ...payload }) });
    } else {
      await fetch("/api/insulin?type=types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, active: true }) });
    }
    setShowTypeForm(false); setEditingType(null);
    setLoadT(true);
    await fetchTypes(); setSavingType(false);
  };

  const handleSaveLog = async () => {
    if (!logTypeId) return alert("Please select an insulin");
    setSavingLog(true);
    if (editingLog) {
      await fetch("/api/insulin?type=log", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingLog._id, insulinTypeId: logTypeId, takenAt: new Date(logTakenAt), note: logNote }) });
    } else {
      await fetch("/api/insulin?type=log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ insulinTypeId: logTypeId, takenAt: new Date(logTakenAt), note: logNote }) });
    }
    setShowLogForm(false); setEditingLog(null);
    setLoadL(true);
    await fetchLogs(); setSavingLog(false);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await fetch("/api/insulin?type=types", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: !active }) });
    setLoadT(true);
    fetchTypes();
  };
  const handleDeleteType = async (id: string) => {
    if (!confirm("Delete this insulin type? Past logs keep their data.")) return;
    await fetch("/api/insulin?type=types", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setLoadT(true);
    fetchTypes();
  };
  const handleDeleteLog = async (id: string) => {
    if (!confirm("Delete this dose log?")) return;
    await fetch("/api/insulin?type=log", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setLoadL(true);
    fetchLogs();
  };

  const activeTypes = types.filter(t => t.active);

  return (
    <div>
      {/* Active summary cards */}
      {activeTypes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
          {activeTypes.map(t => (
            <div key={t._id} style={{ background: "white", borderRadius: 16, padding: "1rem 1.2rem", border: `1px solid ${AB}`, boxShadow: "0 2px 12px rgba(124,58,237,0.08)" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>💉</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, color: ACCENT }}>{t.name}</div>
              <div style={{ fontSize: "0.88rem", color: "#6b7280", fontWeight: 600, marginTop: 2 }}>{t.units} units</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ background: AL, color: ACCENT, padding: "2px 8px", borderRadius: 10, fontSize: "0.75rem", fontWeight: 600 }}>
                  {timingLabel(t.timing)}
                </span>
              </div>
              {t.notes && <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4, fontStyle: "italic" }}>{t.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
        <button onClick={openAddLog}  style={primaryBtn(ACCENT)}>💉 Log Dose Taken</button>
        <button onClick={openAddType} style={outlineBtn(ACCENT)}>+ Add Insulin Type</button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: "white",
            color: ACCENT,
            border: `1.5px solid ${AB}`,
            borderRadius: 12,
            padding: "10px 18px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.88rem",
            cursor: refreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(124,58,237,0.05)",
            transition: "all 0.2s ease",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: refreshing ? "rotate(360deg)" : "none",
              transition: refreshing ? "transform 1s linear infinite" : "none",
            }}
          >
            🔄
          </span>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Log dose form */}
      {showLogForm && (
        <div style={cardSt}>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "1.2rem", color: ACCENT }}>
            {editingLog ? "✏️ Edit Dose Log" : "💉 Log Insulin Dose"}
          </h3>
          {activeTypes.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "0.88rem" }}>No active insulin types. Add one first.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem" }}>
                <div>
                  <label style={lbl}>Select Insulin *</label>
                  <div style={{ position: "relative" }}>
                    <select value={logTypeId} onChange={e => setLogTypeId(e.target.value)} style={selSt}>
                      <option value="">-- Choose --</option>
                      {activeTypes.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.name} — {t.units}u · {timingLabel(t.timing)}
                        </option>
                      ))}
                    </select>
                    <span style={chev}>▼</span>
                  </div>
                </div>
                <DateTimePicker value={logTakenAt} onChange={setLogTakenAt} label="Taken At *" accentColor={ACCENT} />
                <div>
                  <label style={lbl}>Note (optional)</label>
                  <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="e.g. Before breakfast" style={inpSt} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: "1.2rem" }}>
                <button onClick={handleSaveLog} disabled={savingLog} style={{ ...primaryBtn(ACCENT), opacity: savingLog ? 0.7 : 1 }}>
                  {savingLog ? "Saving..." : editingLog ? "Update Log" : "Save Dose Log"}
                </button>
                <button onClick={() => { setShowLogForm(false); setEditingLog(null); }} style={outlineBtn("#6b7280")}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add/Edit type form */}
      {showTypeForm && (
        <div style={cardSt}>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "1.2rem", color: ACCENT }}>
            {editingType ? "✏️ Edit Insulin Type" : "Add Insulin Type"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem" }}>
            <div>
              <label style={lbl}>Insulin Name *</label>
              <input type="text" value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="e.g. Huma Device, Lantus" style={inpSt} />
            </div>
            <div>
              <label style={lbl}>Units per Dose *</label>
              <input type="text" inputMode="numeric" value={typeUnits} onChange={e => setTypeUnits(e.target.value)} placeholder="e.g. 10" style={inpSt} />
            </div>
            <div>
              <label style={lbl}>Typical Timing</label>
              <div style={{ position: "relative" }}>
                <select value={typeTiming} onChange={e => setTypeTiming(e.target.value)} style={selSt}>
                  {TIMING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span style={chev}>▼</span>
              </div>
            </div>
            <div>
              <label style={lbl}>Notes</label>
              <input type="text" value={typeNotes} onChange={e => setTypeNotes(e.target.value)} placeholder="e.g. Long-acting, before bed" style={inpSt} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: "1.2rem" }}>
            <button onClick={handleSaveType} disabled={savingType} style={{ ...primaryBtn(ACCENT), opacity: savingType ? 0.7 : 1 }}>
              {savingType ? "Saving..." : editingType ? "Update Type" : "Save Insulin Type"}
            </button>
            <button onClick={() => { setShowTypeForm(false); setEditingType(null); }} style={outlineBtn("#6b7280")}>Cancel</button>
          </div>
        </div>
      )}

      {/* Insulin types table */}
      <div style={tableSt}>
        <div style={tHead}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>My Insulins</h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{types.length} defined</span>
        </div>
        {loadT ? <div style={empty}>Loading...</div>
          : types.length === 0 ? <div style={empty}><div style={{ fontSize: "2rem", marginBottom: 8 }}>💉</div>No insulins yet.</div>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Name","Units","Timing","Notes","Status","Actions"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {types.map((t, i) => (
                    <tr key={t._id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ ...td, fontWeight: 700, color: ACCENT }}>{t.name}</td>
                      <td style={td}><span style={{ background: AL, color: ACCENT, padding: "2px 10px", borderRadius: 8, fontWeight: 700 }}>{t.units}u</span></td>
                      <td style={td}><span style={{ fontSize: "0.82rem" }}>{timingLabel(t.timing)}</span></td>
                      <td style={{ ...td, color: "#6b7280", fontStyle: "italic", fontSize: "0.82rem" }}>{t.notes || "—"}</td>
                      <td style={td}>
                        <button onClick={() => handleToggleActive(t._id, t.active)} style={{ padding: "3px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem", background: t.active ? "#dcfce7" : "#f3f4f6", color: t.active ? "#16a34a" : "#9ca3af" }}>
                          {t.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openEditType(t)} style={iconBtn("#7c3aed")}>✏️</button>
                          <button onClick={() => handleDeleteType(t._id)} style={iconBtn("#ef4444")}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Dose log table */}
      <div style={tableSt}>
        <div style={tHead}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>Dose History</h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{logs.length} logs</span>
        </div>
        {loadL ? <div style={empty}>Loading...</div>
          : logs.length === 0 ? <div style={empty}><div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>No doses logged yet.</div>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Taken At","Insulin (live name)","Units","Note","Actions"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => {
                    const hoursAgo = now ? Math.round((now - new Date(l.takenAt).getTime()) / 3600000) : 0;
                    const isRecent = hoursAgo <= 24;
                    // Live name from populated ref, fallback to snapshot
                    const liveName = getLogLabel(l);
                    return (
                      <tr key={l._id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                        <td style={td}>
                          <div>{formatDisplay(l.takenAt)}</div>
                          {isRecent && (
                            <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#16a34a", padding: "1px 6px", borderRadius: 8, fontWeight: 600, marginTop: 2, display: "inline-block" }}>
                              ⚡ {hoursAgo}h ago — shows in sugar log
                            </span>
                          )}
                        </td>
                        <td style={{ ...td, fontWeight: 600, color: ACCENT }}>
                          {liveName}
                          {/* Show if name differs from snapshot (means it was renamed) */}
                          {liveName !== l.insulinName && (
                            <div style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 400 }}>was: {l.insulinName}</div>
                          )}
                        </td>
                        <td style={td}><span style={{ background: AL, color: ACCENT, padding: "2px 10px", borderRadius: 8, fontWeight: 700 }}>{l.units}u</span></td>
                        <td style={{ ...td, color: "#6b7280", fontStyle: "italic", fontSize: "0.82rem" }}>{l.note || "—"}</td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => openEditLog(l)} style={iconBtn("#7c3aed")}>✏️</button>
                            <button onClick={() => handleDeleteLog(l._id)} style={iconBtn("#ef4444")}>🗑️</button>
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

// ── Shared styles ──────────────────────────────────────────────────────────
const primaryBtn = (c: string): React.CSSProperties => ({ background: `linear-gradient(135deg, ${c}, ${c}bb)`, color: "white", border: "none", borderRadius: 12, padding: "11px 22px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" });
const outlineBtn = (c: string): React.CSSProperties => ({ background: "white", color: c, border: `1.5px solid ${c}`, borderRadius: 12, padding: "10px 20px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" });
const iconBtn   = (c: string): React.CSSProperties => ({ background: c + "18", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: "0.9rem" });
const cardSt: React.CSSProperties  = { background: "white", borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(124,58,237,0.07)", border: `1px solid ${AB}` };
const tableSt: React.CSSProperties = { background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0", marginBottom: "1.5rem" };
const tHead: React.CSSProperties   = { padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" };
const lbl:  React.CSSProperties    = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const inpSt: React.CSSProperties   = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.9rem", fontFamily: "var(--font-body)", color: "#1a1a2e", outline: "none", background: "white" };
const selSt: React.CSSProperties   = { ...inpSt, cursor: "pointer", appearance: "none", WebkitAppearance: "none", paddingRight: 32 };
const chev: React.CSSProperties    = { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 11, color: "#9ca3af" };
const th:   React.CSSProperties    = { padding: "10px 16px", textAlign: "left", fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 };
const td:   React.CSSProperties    = { padding: "12px 16px", fontSize: "0.85rem", color: "#1a1a2e" };
const empty: React.CSSProperties   = { padding: "3rem", textAlign: "center", color: "#9ca3af" };