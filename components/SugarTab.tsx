"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useHealthStore } from "@/lib/store";
import {
  toNumber,
  formatDisplay,
  formatInputDefault,
  sugarStatus,
  SUGAR_TIMINGS,
} from "@/lib/helpers";
import DateTimePicker from "./DateTimePicker";
import PdfExportPanel from "./PdfExportPanel";
import { PdfSection } from "@/lib/pdfExport";

interface InsulinType {
  _id: string;
  name: string;
  units: number;
}

interface InsulinLog {
  _id: string;
  insulinTypeId: InsulinType | string; // populated or raw id
  insulinName: string; // snapshot fallback
  units: number;
  takenAt: string;
  note: string;
}

interface Reading {
  _id: string;
  value: number;
  timing: string;
  insulinLogId?: InsulinLog | string | null; // populated or raw id
  insulinName?: string; // snapshot
  insulinUnits?: number;
  insulinTakenAt?: string;
  note: string;
  measuredAt: string;
}

// Get live insulin label from a populated InsulinLog
const getLogLabel = (log: InsulinLog): string => {
  if (log.insulinTypeId && typeof log.insulinTypeId === "object") {
    const t = log.insulinTypeId as InsulinType;
    return `${t.name} ${t.units}u`;
  }
  return log.insulinName; // snapshot fallback
};

// Get insulin info from a reading (populated insulinLogId)
const getReadingInsulinLabel = (r: Reading): string | null => {
  if (!r.insulinLogId) return null;
  if (typeof r.insulinLogId === "object")
    return getLogLabel(r.insulinLogId as InsulinLog);
  return r.insulinName || null; // fallback snapshot
};

const getReadingInsulinTakenAt = (r: Reading): string | null => {
  if (r.insulinLogId && typeof r.insulinLogId === "object") {
    return (r.insulinLogId as InsulinLog).takenAt;
  }
  return r.insulinTakenAt || null;
};

const timingLabel = (val: string) =>
  SUGAR_TIMINGS.find((t) => t.value === val)?.label ?? val;

const getDelta = (readings: Reading[], index: number) => {
  if (index >= readings.length - 1) return null;
  const diff = readings[index].value - readings[index + 1].value;
  if (diff === 0) return { label: "No change", color: "#6b7280" };
  if (diff > 0) return { label: `▲ +${diff}`, color: "#e74c3c" };
  return { label: `▼ ${diff}`, color: "#27ae60" };
};

const insulinGap = (takenAt: string, measuredAt: string): string => {
  const mins = Math.round(
    (new Date(measuredAt).getTime() - new Date(takenAt).getTime()) / 60000,
  );
  if (mins < 0) return `${Math.abs(mins)}m before insulin`;
  if (mins < 60) return `${mins}m after insulin`;
  const h = Math.floor(mins / 60),
    m = mins % 60;
  return m > 0 ? `${h}h ${m}m after insulin` : `${h}h after insulin`;
};

export default function SugarTab() {
  const { fetchSugarReadings, fetchRecentInsulinLogs, sugarLoaded } = useHealthStore();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [recentLogs, setRecentLogs] = useState<InsulinLog[]>([]);
  const [loading, setLoading] = useState(!sugarLoaded);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number>(0);

  const [value, setValue] = useState("");
  const [timing, setTiming] = useState("fasting_morning");
  const [selectedLogId, setSelectedLogId] = useState("none");
  const [note, setNote] = useState("");
  const [measuredAt, setMeasuredAt] = useState(formatInputDefault());

  const fetchReadings = async (force = false) => {
    await fetchSugarReadings(force);
    setReadings(useHealthStore.getState().sugarReadings as unknown as Reading[]);
    setLoading(false);
  };
  const fetchRecentLogs = async (force = false) => {
    await fetchRecentInsulinLogs(force);
    setRecentLogs(useHealthStore.getState().recentInsulinLogs as unknown as InsulinLog[]);
  };

  useEffect(() => {
    const load = async () => {
      await fetchReadings();
      await fetchRecentLogs();
      setNow(Date.now());
    };
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Dono functions ko parallel fetch karega fast reload ke liye
      await Promise.all([fetchReadings(), fetchRecentLogs()]);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setValue("");
    setTiming("fasting_morning");
    setSelectedLogId("none");
    setNote("");
    setMeasuredAt(formatInputDefault());
    fetchRecentLogs();
    setShowForm(true);
  };

  const openEdit = (r: Reading) => {
    setEditingId(r._id);
    setValue(String(r.value));
    setTiming(r.timing);
    // resolve insulinLogId to string id for the select
    let logId = "none";
    if (r.insulinLogId) {
      logId = typeof r.insulinLogId === "object"
        ? (r.insulinLogId as InsulinLog)._id
        : r.insulinLogId;
    }
    setSelectedLogId(logId);
    setNote(r.note);

    // 👇 FIX: Isko dayjs local format mein set karein taaki timezone shift na ho (-5.30 hrs fix)
    if (r.measuredAt) {
      setMeasuredAt(dayjs(r.measuredAt).format("YYYY-MM-DDTHH:mm"));
    } else {
      setMeasuredAt(formatInputDefault());
    }

    fetchRecentLogs();
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!value.trim()) return alert("Please enter sugar level");
    setSaving(true);
    const payload: Record<string, unknown> = {
      value: toNumber(value),
      timing,
      note,
      measuredAt: new Date(measuredAt),
      insulinLogId: selectedLogId !== "none" ? selectedLogId : null,
    };
    if (editingId) {
      await fetch("/api/readings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...payload }),
      });
    } else {
      await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setValue("");
    setNote("");
    setSelectedLogId("none");
    setMeasuredAt(formatInputDefault());
    setShowForm(false);
    setEditingId(null);
    setLoading(true);
    await fetchReadings(true);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reading?")) return;
    await fetch("/api/readings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLoading(true);
    fetchReadings(true);
  };

  const buildPdfSections = async (
    from: dayjs.Dayjs,
    to: dayjs.Dayjs,
  ): Promise<PdfSection[]> => {
    const all: Reading[] = await (
      await fetch("/api/readings?limit=500")
    ).json();
    const filtered = all.filter((r) => {
      const d = dayjs(r.measuredAt);
      return d.isAfter(from) && d.isBefore(to);
    });
    const rows = filtered.map((r, i) => {
      const s = sugarStatus(r.value, r.timing);
      const delta = getDelta(filtered, i);
      const insulinLabel = getReadingInsulinLabel(r);
      const takenAt = getReadingInsulinTakenAt(r);
      const gap = takenAt ? insulinGap(takenAt, r.measuredAt) : "";
      return [
        formatDisplay(r.measuredAt),
        `${r.value} mg/dL`,
        timingLabel(r.timing),
        s.label,
        insulinLabel || "—",
        gap || "—",
        delta?.label ?? "—",
        r.note || "—",
      ];
    });
    return [
      {
        title: "🩸 Sugar / Diabetes Readings",
        headers: [
          "Date & Time",
          "Sugar",
          "Timing",
          "Status",
          "Insulin",
          "Gap",
          "Change",
          "Note",
        ],
        rows,
        accentRgb: [232, 86, 106],
      },
    ];
  };

  const latest = readings[0];
  const latestStatus = latest ? sugarStatus(latest.value, latest.timing) : null;
  const latestInsulinLabel = latest ? getReadingInsulinLabel(latest) : null;
  const latestTakenAt = latest ? getReadingInsulinTakenAt(latest) : null;

  const avgValue = readings.length > 0 
    ? Math.round(readings.reduce((sum, r) => sum + r.value, 0) / readings.length) 
    : 0;

  const sel: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    fontSize: "0.85rem",
    fontFamily: "var(--font-body)",
    color: "#1a1a2e",
    background: "white",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
  };

  return (
    <div>
      {/* Latest card */}
      {latest && (
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: "1.5rem 2rem",
            marginBottom: "1.5rem",
            boxShadow: "0 4px 24px rgba(232,86,106,0.10)",
            border: "1px solid #fde8ec",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.78rem",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Latest Reading
              {avgValue > 0 && (
                <span
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  AVG: {avgValue} mg/dL
                </span>
              )}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginTop: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "3rem",
                  fontWeight: 700,
                  color: latestStatus?.color,
                }}
              >
                {latest.value}
              </span>
              <span style={{ color: "#6b7280" }}>mg/dL</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  background: latestStatus?.color + "20",
                  color: latestStatus?.color,
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                }}
              >
                {latestStatus?.label}
              </span>
              <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>
                {timingLabel(latest.timing)}
              </span>
              {latestInsulinLabel && (
                <span
                  style={{
                    background: "#f3f0ff",
                    color: "#7c3aed",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  💉 {latestInsulinLabel}
                </span>
              )}
              {latestTakenAt && latestInsulinLabel && (
                <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                  {insulinGap(latestTakenAt, latest.measuredAt)}
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#6b7280", fontSize: "0.82rem" }}>
              {formatDisplay(latest.measuredAt)}
            </p>
            {readings.length > 1 &&
              (() => {
                const d = getDelta(readings, 0);
                return d ? (
                  <p style={{ color: d.color, fontWeight: 700, marginTop: 4 }}>
                    {d.label} mg/dL vs last
                  </p>
                ) : null;
              })()}
            {latest.note && (
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "0.78rem",
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                &quot;{latest.note}&quot;
              </p>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <button
          onClick={openAdd}
          style={{
            background: "linear-gradient(135deg, #e8566a, #c0394d)",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          + Add Reading
        </button>

        {/* 👇 Added Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: "white",
            color: "#e8566a",
            border: "1.5px solid #fde8ec",
            borderRadius: 12,
            padding: "11px 18px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: refreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(232,86,106,0.05)",
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

      {/* Add/Edit form */}
      {showForm && (
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 4px 24px rgba(232,86,106,0.08)",
            border: "1px solid #fde8ec",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              marginBottom: "1.2rem",
              color: "#e8566a",
            }}
          >
            {editingId ? "✏️ Edit Reading" : "Record Sugar Level"}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.2rem",
            }}
          >
            <div>
              <label style={lbl}>Sugar Level (mg/dL) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 120"
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Timing *</label>
              <div style={{ position: "relative" }}>
                <select
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  style={sel}
                >
                  {SUGAR_TIMINGS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <span style={chev}>▼</span>
              </div>
            </div>

            {/* Insulin log dropdown — last 24hrs, populated with live name */}
            <div>
              <label style={lbl}>
                💉 Insulin Log (last 24hrs)
                {recentLogs.length === 0 && (
                  <span
                    style={{
                      color: "#f59e0b",
                      fontSize: "0.7rem",
                      marginLeft: 6,
                    }}
                  >
                    ⚠ No recent logs
                  </span>
                )}
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedLogId}
                  onChange={(e) => setSelectedLogId(e.target.value)}
                  style={{
                    ...sel,
                    borderColor:
                      selectedLogId !== "none" ? "#7c3aed" : "#e5e7eb",
                    color: selectedLogId !== "none" ? "#7c3aed" : "#1a1a2e",
                  }}
                >
                  <option value="none">— None / Not taken —</option>
                  {recentLogs.map((l) => {
                    const hoursAgo = now
                      ? Math.round(
                          (now - new Date(l.takenAt).getTime()) / 3600000,
                        )
                      : 0;
                    const liveName = getLogLabel(l);
                    return (
                      <option key={l._id} value={l._id}>
                        {liveName} · {dayjs(l.takenAt).format("hh:mm A")} (
                        {hoursAgo}h ago)
                      </option>
                    );
                  })}
                </select>
                <span style={chev}>▼</span>
              </div>
              <p
                style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 4 }}
              >
                Log doses in 💉 Insulin tab — they appear here for 24hrs
              </p>
            </div>

            <DateTimePicker
              value={measuredAt}
              onChange={setMeasuredAt}
              label="Date & Time *"
              accentColor="#e8566a"
            />
            <div>
              <label style={lbl}>Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. After breakfast"
                style={inp}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: "1.2rem" }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                background: "linear-gradient(135deg, #e8566a, #c0394d)",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "11px 28px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Reading"
                  : "Save Reading"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              style={{
                background: "#f5f5f5",
                color: "#6b7280",
                border: "none",
                borderRadius: 10,
                padding: "11px 22px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reference */}
      <div
        style={{
          background: "#fff5f6",
          borderRadius: 12,
          padding: "0.8rem 1.2rem",
          marginBottom: "1.5rem",
          border: "1px solid #fde8ec",
        }}
      >
        <p
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "#e8566a",
            marginBottom: 6,
          }}
        >
          📊 Reference Ranges
        </p>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem" }}
        >
          {[
            ["Fasting Normal", "70–100"],
            ["Post Meal Normal", "≤140"],
            ["Pre-diabetic (F)", "101–125"],
            ["Diabetic (F)", ">125"],
          ].map(([k, v]) => (
            <span key={k} style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              <b style={{ color: "#1a1a2e" }}>{k}:</b> {v} mg/dL
            </span>
          ))}
        </div>
      </div>

      <PdfExportPanel
        accentColor="#e8566a"
        accentRgb={[232, 86, 106]}
        buildSections={buildPdfSections}
        tabLabel="Sugar"
      />

      {/* History */}
      <div
        style={{
          background: "white",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
          border: "1px solid #f0f0f0",
        }}
      >
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
            History
          </h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
            {readings.length} records
          </span>
        </div>
        {loading ? (
          <div
            style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}
          >
            Loading...
          </div>
        ) : readings.length === 0 ? (
          <div
            style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>🩸</div>No
            readings yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {[
                    "Date & Time",
                    "Value",
                    "Timing",
                    "Status",
                    "Insulin (live)",
                    "Time Gap",
                    "Change",
                    "Note",
                    "",
                  ].map((h) => (
                    <th key={h} style={thSt}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readings.map((r, i) => {
                  const s = sugarStatus(r.value, r.timing);
                  const delta = getDelta(readings, i);
                  const iLabel = getReadingInsulinLabel(r);
                  const iTakenAt = getReadingInsulinTakenAt(r);
                  const gap =
                    iLabel && iTakenAt
                      ? insulinGap(iTakenAt, r.measuredAt)
                      : null;
                  return (
                    <tr
                      key={r._id}
                      style={{
                        borderTop: "1px solid #f5f5f5",
                        background: i % 2 === 0 ? "white" : "#fafafa",
                      }}
                    >
                      <td style={tdSt}>{formatDisplay(r.measuredAt)}</td>
                      <td
                        style={{
                          ...tdSt,
                          fontWeight: 700,
                          color: s.color,
                          fontSize: "1rem",
                        }}
                      >
                        {r.value}{" "}
                        <span
                          style={{
                            fontWeight: 400,
                            fontSize: "0.75rem",
                            color: "#9ca3af",
                          }}
                        >
                          mg/dL
                        </span>
                      </td>
                      <td style={{ ...tdSt, maxWidth: 160 }}>
                        <span
                          style={{
                            background: "#f5f5f5",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: "0.75rem",
                            display: "inline-block",
                          }}
                        >
                          {timingLabel(r.timing)}
                        </span>
                      </td>
                      <td style={tdSt}>
                        <span
                          style={{
                            background: s.color + "18",
                            color: s.color,
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                          }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td style={tdSt}>
                        {iLabel ? (
                          <div>
                            <span
                              style={{
                                background: "#f3f0ff",
                                color: "#7c3aed",
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: "0.78rem",
                                fontWeight: 600,
                              }}
                            >
                              💉 {iLabel}
                            </span>
                            {iTakenAt && (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#9ca3af",
                                  marginTop: 2,
                                }}
                              >
                                at {dayjs(iTakenAt).format("hh:mm A")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                      <td style={tdSt}>
                        {gap ? (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#7c3aed",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {gap}
                          </span>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                      <td style={tdSt}>
                        {delta ? (
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              color: delta.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {delta.label}
                          </span>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          ...tdSt,
                          color: "#6b7280",
                          fontSize: "0.82rem",
                          fontStyle: "italic",
                        }}
                      >
                        {r.note || "—"}
                      </td>
                      <td style={tdSt}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openEdit(r)}
                            style={{
                              background: "#f3f0ff",
                              border: "none",
                              borderRadius: 8,
                              padding: "4px 8px",
                              cursor: "pointer",
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(r._id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#d1d5db",
                            }}
                          >
                            🗑️
                          </button>
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

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#6b7280",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};
const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1.5px solid #e5e7eb",
  fontSize: "0.9rem",
  fontFamily: "var(--font-body)",
  color: "#1a1a2e",
  outline: "none",
  background: "white",
};
const chev: React.CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  fontSize: 11,
  color: "#9ca3af",
};
const thSt: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: "0.75rem",
  color: "#9ca3af",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};
const tdSt: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.85rem",
  color: "#1a1a2e",
};
