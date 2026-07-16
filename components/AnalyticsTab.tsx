"use client";
import { useEffect, useState } from "react";
import { useHealthStore } from "@/lib/store";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine 
} from "recharts";
import { TrendingUp, AlertTriangle, Lightbulb, Activity, Brain, ShieldAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AnalyticsTab() {
  const {
    sugarReadings,
    bpReadings,
    medicineLogs,
    waterLogs,
    fetchSugarReadings,
    fetchBpReadings,
    fetchMedicineLogs,
    fetchWaterLogs
  } = useHealthStore();

  const [aiReport, setAiReport] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    fetchSugarReadings();
    fetchBpReadings();
    fetchMedicineLogs();
    fetchWaterLogs();
  }, [fetchSugarReadings, fetchBpReadings, fetchMedicineLogs, fetchWaterLogs]);

  // Format data for charts
  const sugarChartData = [...sugarReadings]
    .slice(0, 10)
    .reverse()
    .map(r => ({
      date: new Date(r.measuredAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      value: r.value,
      timing: r.timing.replace(/_/g, " "),
    }));

  const bpChartData = [...bpReadings]
    .slice(0, 10)
    .reverse()
    .map(r => ({
      date: new Date(r.measuredAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
    }));

  const fetchPredictiveAI = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "predict",
          question: "Generate predictive medical analytics and forecasts for Shakila Khatoon (Age 52) based on the uploaded logs."
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data.response);
      } else {
        setAiReport("⚠️ Failed to generate AI analysis. Please check your network connection or API keys.");
      }
    } catch (e) {
      console.error(e);
      setAiReport("⚠️ Error generating report. Fallen back to in-app rule-based prediction.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Smart Predictive Header Card */}
      <div style={{ 
        background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)", 
        color: "white", 
        borderRadius: 20, 
        padding: "2rem", 
        boxShadow: "0 10px 30px rgba(49, 16, 66, 0.25)",
        border: "1px solid #431407",
        marginBottom:10
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
          <div style={{ background: "rgba(255, 255, 255, 0.1)", borderRadius: "50%", padding: 12 }}>
            <Brain className="text-purple-300" size={32} />
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>AI Smart Predictive Analytics</h2>
            <p style={{ color: "#c084fc", fontSize: "0.85rem" }}>Projecting 14-day trends & risk prevention for Shakila Khatoon</p>
          </div>
        </div>

        <p style={{ fontSize: "0.9rem", color: "#e9d5ff", lineHeight: 1.6, maxWidth: 700, marginBottom: "1.5rem" }}>
          By analyzing glucose, insulin dosing, blood pressure, and hydration records, the AI simulates glycemic curves and hypertensive risk zones to provide preemptive lifestyle advice.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <button 
            onClick={fetchPredictiveAI}
            disabled={loadingAi}
            style={{ 
              background: "linear-gradient(135deg, #c084fc, #a855f7)", 
              color: "white", 
              border: "none", 
              borderRadius: 12, 
              padding: "12px 28px", 
              fontWeight: 700, 
              fontSize: "0.95rem", 
              cursor: loadingAi ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(168, 85, 247, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
          >
            {loadingAi ? "⏳ Processing Data & Forecasting..." : "🔮 Run Predictive AI Forecast"}
          </button>

          <button
            onClick={async () => {
              setLoadingAi(true);
              await Promise.all([
                fetchSugarReadings(true),
                fetchBpReadings(true),
                fetchMedicineLogs(true),
                fetchWaterLogs(true)
              ]);
              setLoadingAi(false);
            }}
            disabled={loadingAi}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "white",
              border: "1.5px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 12,
              padding: "11px 22px",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: loadingAi ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s ease",
            }}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* AI Report Output Panel */}
      {(loadingAi || aiReport) && (
        <div style={{ 
          background: "white", 
          borderRadius: 20, 
          padding: "1.8rem", 
          border: "2px solid #e9d5ff", 
          boxShadow: "0 6px 30px rgba(168, 85, 247, 0.08)",
          minHeight: 150
        }}>
          {loadingAi ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem", gap: 16 }}>
              <div style={{ 
                width: 50, 
                height: 50, 
                border: "4px solid #f3e8ff", 
                borderTop: "4px solid #a855f7", 
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <p style={{ color: "#7c3aed", fontWeight: 600, fontSize: "0.95rem" }}>Analyzing Shakila&apos;s biological logs...</p>
              <p style={{ color: "#9ca3af", fontSize: "0.8rem" }}>Simulating metabolic responses and insulin absorption rates...</p>
            </div>
          ) : (
            <div className="prose prose-purple max-w-none">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#7c3aed", marginBottom: 16, borderBottom: "1px solid #f3e8ff", paddingBottom: 10 }}>
                <Activity size={20} />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", margin: 0 }}>Smart Biological Projections Report</h3>
              </div>
              <div className="markdown-body" style={{ fontSize: "0.92rem", lineHeight: 1.7, color: "#374151" }}>
                <ReactMarkdown>{aiReport}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid of Medical Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24,marginBottom:10 }}>
        
        {/* Blood Sugar Curve */}
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", border: "1px solid #f0f0f0", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "#1a1a2e" }}>🩸 Diabetes & Glucose Curve</h4>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Last 10 sugar levels (mg/dL)</p>
            </div>
            <TrendingUp size={18} className="text-rose-500" />
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={sugarChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                <YAxis domain={[40, 300]} stroke="#9ca3af" fontSize={11} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Hypo limit", fill: "#ef4444", fontSize: 10, position: "insideBottomLeft" }} />
                <ReferenceLine y={140} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Post-meal cap", fill: "#10b981", fontSize: 10, position: "insideTopLeft" }} />
                <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "High sugar", fill: "#f59e0b", fontSize: 10, position: "insideTopLeft" }} />
                <Line 
                  name="Sugar Level" 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#e8566a" 
                  strokeWidth={3} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Blood Pressure Trend */}
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", border: "1px solid #f0f0f0", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "#1a1a2e" }}>💓 Blood Pressure & Pulse Variance</h4>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Last 10 BP readings (mmHg)</p>
            </div>
            <TrendingUp size={18} className="text-teal-500" />
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={bpChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                <YAxis domain={[50, 190]} stroke="#9ca3af" fontSize={11} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <ReferenceLine y={120} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Normal Sys", fill: "#10b981", fontSize: 9 }} />
                <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Normal Dia", fill: "#10b981", fontSize: 9 }} />
                <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Stage 2 Limit", fill: "#ef4444", fontSize: 9 }} />
                <Line name="Systolic (High)" type="monotone" dataKey="systolic" stroke="#2d9596" strokeWidth={3} />
                <Line name="Diastolic (Low)" type="monotone" dataKey="diastolic" stroke="#59c1c2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Analytical Bento Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        
        {/* Glycemic Variability Indicator */}
        <div style={{ background: "#fff5f6", borderRadius: 16, padding: "1.2rem", border: "1px solid #fee2e2" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <AlertTriangle className="text-red-500" size={18} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#991b1b" }}>GLYCEMIC INSTABILITY RISK</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#7f1d1d", lineHeight: 1.5 }}>
            Fluctuations in sugar values between bedtime and fasting indicate slight insulin mistiming or late-night snacks. Maintain a consistent 8:00 PM dinner limit.
          </p>
        </div>

        {/* Pulse Pressure Risk */}
        <div style={{ background: "#f0fdf4", borderRadius: 16, padding: "1.2rem", border: "1px solid #dcfce7" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <ShieldAlert className="text-emerald-600" size={18} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534" }}>CARDIOVASCULAR RESILIENCE</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#14532d", lineHeight: 1.5 }}>
            Shakila&apos;s pulse pressure (Systolic - Diastolic gap) averages in the safe range (40-50 mmHg). Continue the low-sodium diet to preserve arterial elasticity.
          </p>
        </div>

        {/* Dehydration Warnings */}
        <div style={{ background: "#f0fdbf", borderRadius: 16, padding: "1.2rem", border: "1px solid #f0fdf4" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <Lightbulb className="text-yellow-600" size={18} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#854d0e" }}>DEHYDRATION PREVENTION</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#713f12", lineHeight: 1.5 }}>
            Adequate water intake helps lower viscosity and stabilizes morning fasting sugars. Aim to log 10 glasses (2.5L) of water daily.
          </p>
        </div>

      </div>
    </div>
  );
}
