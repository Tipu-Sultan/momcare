"use client";
import { useEffect, useState } from "react";
import { useHealthStore } from "@/lib/store";
import { AlertCircle, ShieldCheck, PhoneCall, Send, Volume2, ShieldAlert } from "lucide-react";

export default function CriticalAlertSystem() {
  const { sugarReadings, bpReadings, fetchSugarReadings, fetchBpReadings } = useHealthStore();
  const [showSosModal, setShowSosModal] = useState(false);
  const [smsStatus, setSmsStatus] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    fetchSugarReadings();
    fetchBpReadings();
  }, [fetchSugarReadings, fetchBpReadings]);

  const latestSugar = sugarReadings[0];
  const latestBp = bpReadings[0];

  // Evaluate clinical safety ranges
  let isCritical = false;
  let isWarning = false;
  let alertTitle = "All Health Vitals Stable";
  let alertMessage = "Shakila's health indicators are within safe thresholds. Keep up the great care! 💕";
  let alertColor = "#10b981"; // green
  let alertBg = "#f0fdf4";
  let alertBorder = "#dcfce7";
  const issues: string[] = [];

  // Check Sugar limits
  if (latestSugar) {
    if (latestSugar.value < 70) {
      isCritical = true;
      issues.push(`Hypoglycemia Alert: Blood sugar is extremely low (${latestSugar.value} mg/dL). Mom needs glucose/fruit juice immediately!`);
    } else if (latestSugar.value > 250) {
      isCritical = true;
      issues.push(`Hyperglycemia Alert: Blood sugar is extremely high (${latestSugar.value} mg/dL). Check her insulin log.`);
    } else if (latestSugar.value > 140) {
      isWarning = true;
      issues.push(`Elevated Sugar Level (${latestSugar.value} mg/dL). Limit carbohydrates and monitor next meal.`);
    }
  }

  // Check BP limits
  if (latestBp) {
    if (latestBp.systolic >= 180 || latestBp.diastolic >= 120) {
      isCritical = true;
      issues.push(`Hypertensive Crisis: Blood pressure is dangerously high (${latestBp.systolic}/${latestBp.diastolic} mmHg). Seek emergency care.`);
    } else if (latestBp.systolic >= 140 || latestBp.diastolic >= 90) {
      isWarning = true;
      issues.push(`Stage 2 Hypertension: Blood pressure is elevated (${latestBp.systolic}/${latestBp.diastolic} mmHg). Inform doctor.`);
    }
  }

  if (isCritical) {
    alertTitle = "🚨 CRITICAL HEALTH ALERT DETECTED";
    alertMessage = issues.join(" | ");
    alertColor = "#ef4444"; // red
    alertBg = "#fef2f2";
    alertBorder = "#fee2e2";
  } else if (isWarning) {
    alertTitle = "⚠️ HEALTH ADVISORY WARNING";
    alertMessage = issues.join(" | ");
    alertColor = "#f59e0b"; // yellow
    alertBg = "#fffbeb";
    alertBorder = "#fef3c7";
  }

  // Simulate SOS alarm beep using Web Audio API
  const playAlertSiren = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sawtooth";

      osc1.frequency.setValueAtTime(600, ctx.currentTime);
      osc2.frequency.setValueAtTime(604, ctx.currentTime);

      osc1.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.5);
      osc1.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.0);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn(e);
    }
  };

  const triggerSmsSimulation = () => {
    setSmsStatus("sending");
    playAlertSiren();
    setTimeout(() => {
      setSmsStatus("sent");
    }, 1500);
  };

  return (
    <div>
      {/* Alert Banner */}
      <div style={{
        background: alertBg,
        borderColor: alertBorder,
        borderWidth: 1.5,
        borderStyle: "solid",
        borderRadius: 20,
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        boxShadow: isCritical ? "0 4px 20px rgba(239, 68, 68, 0.15)" : "0 2px 10px rgba(0,0,0,0.02)",
        animation: isCritical ? "pulse-siren 1.5s infinite" : "none"
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 280 }}>
          {isCritical ? (
            <ShieldAlert style={{ color: alertColor, minWidth: 24 }} size={24} className="animate-bounce" />
          ) : isWarning ? (
            <AlertCircle style={{ color: alertColor, minWidth: 24 }} size={24} />
          ) : (
            <ShieldCheck style={{ color: alertColor, minWidth: 24 }} size={24} />
          )}

          <div>
            <h4 style={{ color: alertColor, fontWeight: 700, fontSize: "0.95rem", fontFamily: "var(--font-display)" }}>
              {alertTitle}
            </h4>
            <p style={{ color: "#4b5563", fontSize: "0.82rem", marginTop: 2, lineHeight: 1.4 }}>
              {alertMessage}
            </p>
          </div>
        </div>

        {/* SOS Action Trigger */}
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            onClick={() => { setShowSosModal(true); playAlertSiren(); }} 
            style={{
              background: isCritical ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "linear-gradient(135deg, #e5e7eb, #d1d5db)",
              color: isCritical ? "white" : "#4b5563",
              border: "none",
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: isCritical ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "none",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            🚨 {isCritical ? "TRIGGER SOS" : "SOS CONTACTS"}
          </button>
        </div>
      </div>

      {/* SOS Modal Dialog */}
      {showSosModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(15, 23, 42, 0.6)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: 24,
            maxWidth: 500,
            width: "100%",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            overflow: "hidden",
            border: "2px solid #ef4444"
          }}>
            {/* Modal Header */}
            <div style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "white", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldAlert size={28} />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem" }}>SOS Emergency Control Panel</h3>
              </div>
              <button 
                onClick={() => { setShowSosModal(false); setSmsStatus("idle"); }} 
                style={{ background: "rgba(0,0,0,0.15)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem" }} className="space-y-6">
              
              {/* Emergency Contacts Quick Dial */}
              <div>
                <p style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>📞 Emergency Medical Contacts</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <a href="tel:102" style={{
                    textDecoration: "none",
                    background: "#fef2f2",
                    border: "1.5px solid #fee2e2",
                    borderRadius: 16,
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6
                  }}>
                    <PhoneCall className="text-red-500" size={20} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#991b1b" }}>Call Ambulance</span>
                    <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>102 / 108</span>
                  </a>

                  <a href="tel:+919876543210" style={{
                    textDecoration: "none",
                    background: "#f0fdf4",
                    border: "1.5px solid #dcfce7",
                    borderRadius: 16,
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6
                  }}>
                    <PhoneCall className="text-emerald-600" size={20} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534" }}>Dr. Verma (GP)</span>
                    <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>+91 98765 43210</span>
                  </a>
                </div>
              </div>

              {/* Family WhatsApp Broadcast */}
              <div>
                <p style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>🟢 Real WhatsApp SOS Broadcast</p>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, padding: "1rem" }}>
                  <p style={{ fontSize: "0.78rem", color: "#166534", fontWeight: 600 }}>Message preview to broadcast:</p>
                  <p style={{ fontSize: "0.8rem", color: "#1e3a1e", fontStyle: "italic", marginTop: 4, background: "white", padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                    &quot;MOMCARE SOS ALERT: Shakila Khatoon (Age 52) has critical vitals. Sugar: {latestSugar?.value ?? "N/A"} mg/dL. BP: {latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : "N/A"} mmHg. Check on her!&quot;
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    <button 
                      onClick={() => {
                        const msg = `MOMCARE SOS ALERT: Shakila Khatoon (Age 52) has critical vitals. Sugar: ${latestSugar?.value ?? "N/A"} mg/dL. BP: ${latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : "N/A"} mmHg. Check on her!`;
                        window.open(`https://api.whatsapp.com/send?phone=919919408817&text=${encodeURIComponent(msg)}`, "_blank");
                        playAlertSiren();
                      }}
                      style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #25D366, #128C7E)",
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        padding: "11px",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 4px 12px rgba(37, 211, 102, 0.25)"
                      }}
                    >
                      💬 Send WhatsApp SOS to +91 99194 08817
                    </button>

                    <button 
                      onClick={() => {
                        const msg = `MOMCARE SOS ALERT: Shakila Khatoon (Age 52) has critical vitals. Sugar: ${latestSugar?.value ?? "N/A"} mg/dL. BP: ${latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : "N/A"} mmHg. Check on her!`;
                        window.open(`https://api.whatsapp.com/send?phone=916386704488&text=${encodeURIComponent(msg)}`, "_blank");
                        playAlertSiren();
                      }}
                      style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #25D366, #128C7E)",
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        padding: "11px",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 4px 12px rgba(37, 211, 102, 0.25)"
                      }}
                    >
                      💬 Send WhatsApp SOS to +91 63867 04488
                    </button>
                  </div>
                </div>
              </div>

              {/* Immediate Clinical Stabilization Advice */}
              <div>
                <p style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>🩺 In-App Vitals First-Aid Advice</p>
                <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 16, padding: "1rem", fontSize: "0.8rem", color: "#713f12", lineHeight: 1.5 }}>
                  {latestSugar && latestSugar.value < 70 ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      <li>Give her 15g of fast-acting sugar immediately (1/2 cup fruit juice, 3 spoonfuls of honey, or sugar candy).</li>
                      <li>Let her rest completely. Do not inject insulin.</li>
                      <li>Re-test sugar level in exactly 15 minutes.</li>
                    </ul>
                  ) : latestBp && (latestBp.systolic >= 180 || latestBp.diastolic >= 120) ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      <li>Make her sit upright comfortably. Do not let her lie flat.</li>
                      <li>Avoid panic. Maintain calm silence around her.</li>
                      <li>Ask her to take slow, deep diaphragmatic breaths.</li>
                      <li>Administer her prescribed rapid BP medication if instructed by Dr. Verma.</li>
                    </ul>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      <li>Ensure she is hydrated with a warm glass of water.</li>
                      <li>Allow her 15-20 minutes of horizontal rest.</li>
                      <li>Monitor vitals again to establish if trends stabilize.</li>
                    </ul>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
