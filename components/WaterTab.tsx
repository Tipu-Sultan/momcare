"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useHealthStore } from "@/lib/store";
import { formatDisplay, formatInputDefault } from "@/lib/helpers";
import DateTimePicker from "./DateTimePicker";

export default function WaterTab() {
  const {
    waterLogs,
    waterLoading,
    fetchWaterLogs,
    addWaterLog,
    deleteWaterLog
  } = useHealthStore();

  const [amount, setAmount] = useState("250");
  const [note, setNote] = useState("");
  const [measuredAt, setMeasuredAt] = useState(formatInputDefault());
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWaterLogs();
  }, [fetchWaterLogs]);

  const DAILY_TARGET = 2500; // in ml

  // Filter logs for today
  const todayLogs = waterLogs.filter(l => 
    dayjs(l.measuredAt).isAfter(dayjs().startOf("day"))
  );

  const todayTotal = todayLogs.reduce((sum, log) => sum + log.amount, 0);
  const progressPercent = Math.min(Math.round((todayTotal / DAILY_TARGET) * 100), 100);

  const handleQuickAdd = async (ml: number) => {
    await addWaterLog({
      amount: ml,
      note: "Quick Add",
      measuredAt: new Date()
    });

    // Play a gentle water ripple droplet sound
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  const handleSubmit = async () => {
    const ml = parseInt(amount);
    if (isNaN(ml) || ml <= 0) return alert("Please enter a valid amount");
    setSaving(true);
    await addWaterLog({
      amount: ml,
      note,
      measuredAt: new Date(measuredAt)
    });
    setAmount("250");
    setNote("");
    setMeasuredAt(formatInputDefault());
    setShowForm(false);
    setSaving(false);
  };

  // Determine Hydration alert levels
  let hydrationAlert = {
    text: "Dehydrated ⚠️ Shakila needs water. Let's record her intake!",
    color: "#e8566a", // red
    bg: "#fff5f6"
  };
  if (todayTotal >= DAILY_TARGET) {
    hydrationAlert = {
      text: "Excellent Hydration 🎉 Shakila has met her daily water goal!",
      color: "#10b981", // green
      bg: "#f0fdf4"
    };
  } else if (todayTotal >= 1500) {
    hydrationAlert = {
      text: "Healthy Level 👍 Over 1.5L logged. Keep it up!",
      color: "#2d9596", // teal
      bg: "#f0fafa"
    };
  } else if (todayTotal >= 750) {
    hydrationAlert = {
      text: "Moderate Hydration 💧 Getting there. Offer Mom another glass!",
      color: "#d4870a", // warning/orange
      bg: "#fffbf0"
    };
  }

  return (
    <div className="space-y-6">
      {/* Hydration Circular Progress & Flask Graphic */}
      <div style={{ 
        background: "white", 
        borderRadius: 20, 
        padding: "1.5rem 2rem", 
        boxShadow: "0 4px 24px rgba(45, 149, 150, 0.10)", 
        border: "1px solid #e0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 24,
        marginBottom:10
      }}>
        <div style={{ flex: 1, minWidth: 280 }} className="space-y-2">
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Water Intake Tracker</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 700, color: "#2d9596" }}>
              {todayTotal}
            </span>
            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              / {DAILY_TARGET} ml today
            </span>
          </div>

          {/* Hydration Banner Status Alert */}
          <div style={{ 
            background: hydrationAlert.bg, 
            color: hydrationAlert.color, 
            borderRadius: 12, 
            padding: "8px 14px", 
            fontSize: "0.82rem", 
            fontWeight: 600,
            border: `1px solid ${hydrationAlert.color}20` 
          }}>
            {hydrationAlert.text}
          </div>
        </div>

        {/* Dynamic Water Cup Graphic */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ 
            position: "relative", 
            width: 70, 
            height: 90, 
            border: "3px solid #2d9596", 
            borderTop: "none",
            borderRadius: "0 0 16px 16px",
            overflow: "hidden",
            background: "#f3fbfb"
          }}>
            {/* Water content fill */}
            <div style={{ 
              position: "absolute", 
              bottom: 0, 
              left: 0, 
              width: "100%", 
              height: `${progressPercent}%`, 
              background: "linear-gradient(to top, #2d9596, #59c1c2)",
              transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              opacity: 0.85
            }}>
              {/* Ripple wave animation effect */}
              <div style={{
                position: "absolute",
                top: -4,
                left: 0,
                width: "200%",
                height: 8,
                background: "rgba(255,255,255,0.3)",
                borderRadius: "40%",
                animation: "wave 4s infinite linear"
              }} />
            </div>
            {/* Percentage text */}
            <div style={{ 
              position: "absolute", 
              top: 0, 
              left: 0, 
              width: "100%", 
              height: "100%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.95rem",
              color: progressPercent > 50 ? "white" : "#2d9596",
              zIndex: 10
            }}>
              {progressPercent}%
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280" }}>Today&apos;s Target</span>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", boxShadow: "0 2px 16px rgba(0,0,0,0.03)", border: "1px solid #f0f0f0",marginBottom:10 }}>
        <h4 style={{ fontSize: "0.82rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>⚡ Quick Log Glass or Bottle</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          {[
            { ml: 250, label: "🥛 Small Glass", color: "#e0f2fe", textColor: "#0369a1" },
            { ml: 500, label: "🥤 Regular Bottle", color: "#bae6fd", textColor: "#0369a1" },
            { ml: 750, label: "🏺 Copper Flask", color: "#7dd3fc", textColor: "#0369a1" },
            { ml: 1000, label: "🫙 Large Jug", color: "#38bdf8", textColor: "#0369a1" },
          ].map(btn => (
            <button 
              key={btn.ml}
              onClick={() => handleQuickAdd(btn.ml)}
              style={{
                background: btn.color,
                color: btn.textColor,
                border: "none",
                borderRadius: 12,
                padding: "12px 10px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                transition: "transform 0.1s"
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <span>{btn.label}</span>
              <span style={{ fontSize: "0.72rem", opacity: 0.85 }}>+{btn.ml} ml</span>
            </button>
          ))}
        </div>
      </div>

      {/* Add Custom Entry */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? "#f0fdf4" : "linear-gradient(135deg, #2d9596, #227c7d)", color: showForm ? "#2d9596" : "white", border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          {showForm ? "✕ Cancel Custom Log" : "➕ Log Custom Water Amount"}
        </button>
        <button
          onClick={async () => {
            setRefreshing(true);
            await fetchWaterLogs(true);
            setRefreshing(false);
          }}
          disabled={refreshing || waterLoading}
          style={{
            background: "white",
            color: "#2d9596",
            border: "1.5px solid #e0f0f0",
            borderRadius: 12,
            padding: "11px 18px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: refreshing ? "not-allowed" : "pointer",
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
              transform: refreshing ? "rotate(360deg)" : "none",
              transition: refreshing ? "transform 1s linear infinite" : "none",
            }}
          >
            🔄
          </span>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", border: "1px solid #e0f0f0", boxShadow: "0 4px 24px rgba(45,149,150,0.08)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "1.2rem", color: "#2d9596", fontSize: "1.1rem" }}>Record Custom Water Intake</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem" }}>
            <div>
              <label style={labelSt}>Water Amount (ml) *</label>
              <input type="text" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 300" style={inputSt} />
            </div>
            <DateTimePicker value={measuredAt} onChange={setMeasuredAt} label="Intake Date & Time *" accentColor="#2d9596" />
            <div>
              <label style={labelSt}>Notes / Water Type</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Warm water, coconut water" style={inputSt} />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{ marginTop: "1.2rem", background: "linear-gradient(135deg, #2d9596, #227c7d)", color: "white", border: "none", borderRadius: 10, padding: "11px 28px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Log Intake"}
          </button>
        </div>
      )}

      {/* History table */}
      <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>Water Logs History</h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{waterLogs.length} records</span>
        </div>

        {waterLoading && waterLogs.length === 0 ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>Loading...</div>
          : waterLogs.length === 0 ? <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}><div style={{ fontSize: "2.5rem", marginBottom: 8 }}>💧</div>No water records today. Let&apos;s start hydrating!</div>
          : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Date & Time", "Water Amount", "Note", ""].map(h => <th key={h} style={thSt}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {waterLogs.map((l, i) => (
                    <tr key={l._id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={tdSt}>{formatDisplay(l.measuredAt)}</td>
                      <td style={{ ...tdSt, fontWeight: 700, color: "#2d9596" }}>
                        💧 {l.amount} ml
                      </td>
                      <td style={{ ...tdSt, color: "#6b7280", fontStyle: "italic", fontSize: "0.82rem" }}>{l.note || "—"}</td>
                      <td style={tdSt}>
                        <button onClick={async () => { if (confirm("Delete?")) await deleteWaterLog(l._id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db" }}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.88rem", color: "#1a1a2e", outline: "none", fontFamily: "var(--font-body)" };
const thSt: React.CSSProperties = { padding: "12px 16px", fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textAlign: "left", textTransform: "uppercase", letterSpacing: 0.5 };
const tdSt: React.CSSProperties = { padding: "14px 16px", fontSize: "0.85rem", color: "#1a1a2e" };
