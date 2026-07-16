"use client";

import { useEffect, useState } from "react";
import { useBluetoothSensor } from "@/hooks/useBluetoothSensor";
import dayjs from "dayjs";

const ACCENT = "#3b82f6"; // Blue/Indigo accent for wearable telemetry
const AL = "#f0f6ff";
const AB = "#dbeafe";

export default function ConnectTab() {
  const {
    heartRate,
    spo2,
    steps,
    connected,
    deviceName,
    systemLogs,
    connectBluetooth,
    disconnectBluetooth,
    manualSync,
  } = useBluetoothSensor();

  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [loadingDbLogs, setLoadingDbLogs] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch Sync History from API
  const fetchDbLogs = async () => {
    setLoadingDbLogs(true);
    try {
      const res = await fetch("/api/sync-sensor-data");
      const data = await res.json();
      if (data.success) {
        setDbLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load historical sensor logs:", err);
    } finally {
      setLoadingDbLogs(false);
    }
  };

  useEffect(() => {
    fetchDbLogs();
  }, [connected]); // Refresh history table when connection status toggles

  // Steps Target Progress Calculation
  const stepTarget = 5000;
  const stepProgress = Math.min(100, Math.round(((steps || 0) / stepTarget) * 100));

  // Physiological health thresholds for alerts
  const getHrCategory = (bpm: number) => {
    if (bpm === 0) return { text: "No Streaming Signal", color: "#6b7280" };
    if (bpm < 60) return { text: "Bradycardia (Low BPM) ⚠️", color: "#d4870a" };
    if (bpm <= 100) return { text: "Normal Resting BPM", color: "#16a34a" };
    return { text: "Tachycardia (Elevated) ⚠️", color: "#e8566a" };
  };

  const getSpo2Category = (percentage: number) => {
    if (percentage === 0) return { text: "No Streaming Signal", color: "#6b7280" };
    if (percentage >= 95) return { text: "Optimal Oxygenation 🎉", color: "#16a34a" };
    if (percentage >= 90) return { text: "Mild Hypoxia (Caution) ⚠️", color: "#d4870a" };
    return { text: "Severe Hypoxia (Urgent) 🚨", color: "#e8566a" };
  };

  const hrStatus = getHrCategory(heartRate);
  const spo2Status = getSpo2Category(spo2);

  const handleManualSyncClick = async () => {
    setRefreshing(true);
    await manualSync();
    await fetchDbLogs();
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. DEVICE STATE CARD */}
      <div style={cardSt}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
              Smart Watch Integration System
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "#1a1a2e", marginTop: 4, fontWeight: 700 }}>
              {connected ? `⌚ Connected to Wearable` : `⌚ Device Disconnected`}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 2 }}>
              {connected 
                ? `Active Session: ${deviceName}` 
                : "Continuous bio-telemetry stream for Shakila Khatoon. Connect smart watch via GATT services or run the high-fidelity emulator."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {connected ? (
              <>
                <button
                  onClick={handleManualSyncClick}
                  disabled={refreshing}
                  style={outlineBtn(ACCENT)}
                >
                  {refreshing ? "🔄 Syncing..." : "🔄 Sync Now"}
                </button>
                <button
                  onClick={disconnectBluetooth}
                  style={primaryBtn("#ef4444")}
                >
                  Disconnect Watch
                </button>
              </>
            ) : (
              <button
                onClick={connectBluetooth}
                style={primaryBtn(ACCENT)}
              >
                🔍 Scan &amp; Connect Smart Watch
              </button>
            )}
          </div>
        </div>

        {connected && (
          <div style={{ 
            background: "#f0fdf4", 
            color: "#16a34a", 
            borderRadius: 12, 
            padding: "8px 14px", 
            fontSize: "0.82rem", 
            fontWeight: 600,
            border: "1px solid rgba(22, 163, 74, 0.2)",
            marginTop: 16
          }}>
            ✔️ Standard continuous GATT synchronization initialized. Bio-telemetry is securely syncing to your database every 5 minutes in the background.
          </div>
        )}
      </div>

      {/* 2. REAL-TIME DISPLAY GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom:10 }}>
        {/* Heart Rate Display Card */}
        <div style={{ ...cardSt, borderColor: connected ? "#fecdd3" : "#f0f0f0", boxShadow: connected ? "0 4px 20px rgba(244, 63, 94, 0.08)" : "0 4px 12px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Live Heart Rate</span>
            <span style={{ fontSize: "1.4rem", animation: connected ? "pulse 1.2s infinite ease-in-out" : "none" }}>❤️</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "3.2rem", fontWeight: 800, color: connected ? "#e11d48" : "#9ca3af" }}>
              {connected && heartRate > 0 ? heartRate : "--"}
            </span>
            <span style={{ fontSize: "0.88rem", color: "#6b7280", fontWeight: 600 }}>BPM</span>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected && heartRate > 0 ? hrStatus.color : "#9ca3af" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: connected && heartRate > 0 ? hrStatus.color : "#6b7280" }}>
              {hrStatus.text}
            </span>
          </div>
        </div>

        {/* SpO2 Oxygen Saturation Card */}
        <div style={{ ...cardSt, borderColor: connected ? "#a5f3fc" : "#f0f0f0", boxShadow: connected ? "0 4px 20px rgba(6, 182, 212, 0.08)" : "0 4px 12px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Oxygen Saturation</span>
            <span style={{ fontSize: "1.4rem" }}>🩸</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "3.2rem", fontWeight: 800, color: connected ? "#0891b2" : "#9ca3af" }}>
              {connected && spo2 > 0 ? spo2 : "--"}
            </span>
            <span style={{ fontSize: "0.88rem", color: "#6b7280", fontWeight: 600 }}>% SpO₂</span>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected && spo2 > 0 ? spo2Status.color : "#9ca3af" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: connected && spo2 > 0 ? spo2Status.color : "#6b7280" }}>
              {spo2Status.text}
            </span>
          </div>
        </div>

        {/* Daily Steps Tracker Card */}
        <div style={{ ...cardSt, borderColor: connected ? "#c7d2fe" : "#f0f0f0", boxShadow: connected ? "0 4px 20px rgba(99, 102, 241, 0.08)" : "0 4px 12px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Daily Steps Tracker</span>
            <span style={{ fontSize: "1.4rem" }}>👣</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "3.2rem", fontWeight: 800, color: connected ? "#4f46e5" : "#9ca3af" }}>
              {connected && steps > 0 ? steps.toLocaleString() : "--"}
            </span>
            <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>/ {stepTarget.toLocaleString()} steps</span>
          </div>
          
          <div style={{ marginTop: 12 }}>
            <div style={{ width: "100%", height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${connected ? stepProgress : 0}%`, height: "100%", background: "linear-gradient(90deg, #4f46e5, #818cf8)", transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#6b7280", marginTop: 4, fontWeight: 500 }}>
              <span>PWA Step Goal</span>
              <span style={{ fontWeight: 700, color: "#4f46e5" }}>{connected ? stepProgress : 0}% met</span>
            </div>
          </div>
        </div>
      </div>

      

      {/* 4. HISTORICAL TELEMETRY SYNC LOGS TABLE */}
      <div style={tableSt}>
        <div style={tHead}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700 }}>Historical Sync Data</h3>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>Wearable telemetry database logs</p>
          </div>
          <button
            onClick={fetchDbLogs}
            disabled={loadingDbLogs}
            style={{ ...outlineBtn(ACCENT), padding: "6px 14px", fontSize: "0.78rem" }}
          >
            {loadingDbLogs ? "Reloading..." : "Reload logs"}
          </button>
        </div>

        {loadingDbLogs && dbLogs.length === 0 ? (
          <div style={empty}>Querying database records...</div>
        ) : dbLogs.length === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📡</div>
            No historical logs detected. Connect and sync watch to persist telemetry.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Logged Date", "Steps Tracked", "Avg Heart Rate", "Avg SpO₂ Status", "Sync Source"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dbLogs.map((log: any, idx: number) => (
                  <tr key={log._id || idx} style={{ borderTop: "1px solid #f5f5f5", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#1a1a2e" }}>
                      {dayjs(log.loggedDate).format("DD MMM YYYY (ddd)")}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: ACCENT }}>
                      👣 {log.steps.toLocaleString()} / 5,000 steps
                    </td>
                    <td style={td}>
                      <span style={{ color: "#e11d48", fontWeight: 700 }}>{log.heartRateAverage}</span> BPM
                    </td>
                    <td style={td}>
                      <span style={{ color: "#0891b2", fontWeight: 700 }}>{log.spo2Average}</span>% SpO₂
                    </td>
                    <td style={{ ...td, color: "#6b7280", fontStyle: "italic", fontSize: "0.82rem" }}>
                      {log.syncSource || "Unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Styles reused from existing tabs
const primaryBtn = (c: string): React.CSSProperties => ({
  background: c.startsWith("linear") ? c : `linear-gradient(135deg, ${c}, ${c}dd)`,
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "11px 22px",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: "0.88rem",
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  display: "inline-flex",
  alignItems: "center",
  gap: 6
});

const outlineBtn = (c: string): React.CSSProperties => ({
  background: "white",
  color: c,
  border: `1.5px solid ${c}`,
  borderRadius: 12,
  padding: "10px 20px",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: "0.88rem",
  cursor: "pointer"
});

const cardSt: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  padding: "1.5rem",
  boxShadow: "0 4px 24px rgba(59, 130, 246, 0.05)",
  border: "1px solid #e0f0f0",
  marginBottom:10
};

const tableSt: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  overflow: "hidden",
  boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
  border: "1px solid #f0f0f0",
  marginBottom: "1.5rem"
};

const tHead: React.CSSProperties = {
  padding: "1rem 1.5rem",
  borderBottom: "1px solid #f0f0f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const th: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: "0.75rem",
  color: "#9ca3af",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5
};

const td: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.85rem",
  color: "#1a1a2e"
};

const empty: React.CSSProperties = {
  padding: "3rem",
  textAlign: "center",
  color: "#9ca3af"
};
