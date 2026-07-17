"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useHealthStore } from "@/lib/store";
import { formatDisplay, formatInputDefault } from "@/lib/helpers";
import DateTimePicker from "./DateTimePicker";

const TIMING_MAP: Record<string, { hour: number; min: number }> = {
  "Before Breakfast": { hour: 8, min: 0 },
  "After Breakfast": { hour: 9, min: 30 },
  "After Lunch": { hour: 14, min: 0 },
  "Before Dinner": { hour: 20, min: 0 },
  "After Dinner": { hour: 21, min: 30 },
  "Bedtime": { hour: 22, min: 30 }
};

export default function MedicinesTab() {
  const {
    medicines,
    medicineLogs,
    medicinesLoading,
    fetchMedicines,
    fetchMedicineLogs,
    addMedicine,
    addMedicineLog,
    deleteMedicine,
    deleteMedicineLog,
    toggleMedicine
  } = useHealthStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add Medicine Form state
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timing, setTiming] = useState("Before Breakfast");
  const [notes, setNotes] = useState("");
  const [savingMed, setSavingMed] = useState(false);

  // Log Intake Form state
  const [selectedMedId, setSelectedMedId] = useState("");
  const [customMedName, setCustomMedName] = useState("");
  const [customDosage, setCustomDosage] = useState("");
  const [logNote, setLogNote] = useState("");
  const [takenAt, setTakenAt] = useState(formatInputDefault());
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    fetchMedicines();
    fetchMedicineLogs();
  }, [fetchMedicines, fetchMedicineLogs]);

  const playGentleChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const playOverdueAlert = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.15); // F4
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const todayDate = dayjs().format("YYYY-MM-DD");

      const alertedToday = localStorage.getItem("momcare_alerted_today") || "{}";
      let alertedObj: any = { date: todayDate, triggers: {} };
      try {
        const parsed = JSON.parse(alertedToday);
        if (parsed && parsed.date === todayDate) {
          alertedObj = parsed;
        }
      } catch {}

      medicines.forEach(med => {
        if (!med.active) return;
        const sched = TIMING_MAP[med.timing];
        if (!sched) return;

        const schedMins = sched.hour * 60 + sched.min;
        const currentMins = currentHour * 60 + currentMin;

        // 1. Pre-alert (15 minutes before)
        const preMins = schedMins - 15;
        if (currentMins === preMins) {
          const key = `${med._id}_pre_${todayDate}`;
          if (!alertedObj.triggers[key]) {
            alertedObj.triggers[key] = true;
            triggerPwaNotification(
              `🔔 Prep Dose: ${med.name}`,
              `In 15 minutes (at ${med.timing}), Shakila needs her dose of ${med.name} (${med.dosage}).`
            );
            playGentleChime();
          }
        }

        // 2. Main-alert (Exactly on time)
        if (currentMins === schedMins) {
          const key = `${med._id}_main_${todayDate}`;
          if (!alertedObj.triggers[key]) {
            alertedObj.triggers[key] = true;
            triggerPwaNotification(
              `💊 Medication Time: ${med.name}`,
              `It is now time for Shakila to take ${med.name} (${med.dosage}) - ${med.timing}!`
            );
            playGentleChime();
          }
        }

        // 3. Post-alert (15 minutes after - ONLY if NOT logged today)
        const postMins = schedMins + 15;
        if (currentMins === postMins) {
          const key = `${med._id}_post_${todayDate}`;
          if (!alertedObj.triggers[key]) {
            // Check if logged today
            const logged = medicineLogs.some(log => 
              log.medicineId === med._id && 
              dayjs(log.takenAt).isAfter(dayjs().startOf("day"))
            );
            if (!logged) {
              alertedObj.triggers[key] = true;
              triggerPwaNotification(
                `⚠️ Overdue Alert: ${med.name}`,
                `Shakila's scheduled ${med.name} (${med.dosage}) was due 15 mins ago. Please make sure Mom takes her medicine!`
              );
              playOverdueAlert();
            }
          }
        }
      });

      localStorage.setItem("momcare_alerted_today", JSON.stringify(alertedObj));
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [medicines, medicineLogs]);

  const handleAddMedicineSubmit = async () => {
    if (!name || !dosage) return alert("Please enter medicine name and dosage");
    setSavingMed(true);
    await addMedicine({ name, dosage, timing, notes });
    setName("");
    setDosage("");
    setTiming("Before Breakfast");
    setNotes("");
    setShowAddForm(false);
    setSavingMed(false);
  };

  const handleLogIntakeSubmit = async () => {
    setSavingLog(true);
    try {
      if (selectedMedId && selectedMedId !== "custom") {
        const med = medicines.find(m => m._id === selectedMedId);
        if (med) {
          await addMedicineLog({
            medicineId: med._id,
            medicineName: med.name,
            dosage: med.dosage,
            takenAt: new Date(takenAt),
            note: logNote || "Taken"
          });
        }
      } else {
        if (!customMedName || !customDosage) {
          alert("Please enter custom medicine name and dosage");
          setSavingLog(false);
          return;
        }
        await addMedicineLog({
          medicineId: null,
          medicineName: customMedName,
          dosage: customDosage,
          takenAt: new Date(takenAt),
          note: logNote || "Custom taken"
        });
      }
      setSelectedMedId("");
      setCustomMedName("");
      setCustomDosage("");
      setLogNote("");
      setTakenAt(formatInputDefault());
      setShowLogForm(false);
    } finally {
      setSavingLog(false);
    }
  };

  const handleQuickLog = async (med: any) => {
    await addMedicineLog({
      medicineId: med._id,
      medicineName: med.name,
      dosage: med.dosage,
      takenAt: new Date(),
      note: "Quick logged"
    });
    
    // Play a gentle notification sound using Web Audio API synthesis
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}

    // Show native browser notification if allowed
    triggerPwaNotification(`Dose Logged!`, `You logged ${med.name} (${med.dosage}) successfully.`);
  };

  const triggerPwaNotification = (title: string, body: string) => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification(title, { body, icon: "/favicon.ico" });
          }
        });
      }
    }
  };

  const testReminderNotification = (medName: string, dosage: string) => {
    triggerPwaNotification(
      `💊 Medicine Reminder: ${medName}`,
      `It's time to take your dose of ${medName} ${dosage}! Stay healthy 💕`
    );
    alert(`🔔 Visual PWA Reminder Sent!\n\n"It's time to take your dose of ${medName} ${dosage}! Stay healthy 💕"`);
  };

  // Calculate today's adherence stats
  const activeMeds = medicines.filter(m => m.active);
  const todayLogs = medicineLogs.filter(l => 
    dayjs(l.takenAt).isAfter(dayjs().startOf("day"))
  );

  const loggedActiveIds = new Set(
    todayLogs.map(l => l.medicineId).filter(Boolean)
  );

  const adherencePercent = activeMeds.length > 0 
    ? Math.round((loggedActiveIds.size / activeMeds.length) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Adherence Header Card */}
      <div style={{ 
        background: "white", 
        borderRadius: 20, 
        padding: "1.5rem 2rem", 
        boxShadow: "0 4px 24px rgba(124, 58, 237, 0.10)", 
        border: "1px solid #ede9fe",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        marginBottom:10
      }}>
        <div className="space-y-1">
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Daily Medication Adherence</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 700, color: "#7c3aed" }}>
              {adherencePercent}%
            </span>
            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              ({loggedActiveIds.size} of {activeMeds.length} taken)
            </span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            {adherencePercent === 100 
              ? "Wonderful job! Shakila has taken all scheduled medicines today. 🎉" 
              : "Keep up the great care! Make sure Mom takes all scheduled doses."}
          </p>
        </div>

        {/* Circular Progress Indicator */}
        <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg style={{ transform: "rotate(-90deg)", width: 80, height: 80 }}>
            <circle cx="40" cy="40" r="34" stroke="#f3e8ff" strokeWidth="8" fill="transparent" />
            <circle cx="40" cy="40" r="34" stroke="#7c3aed" strokeWidth="8" fill="transparent" 
              strokeDasharray="213.6" 
              strokeDashoffset={213.6 - (213.6 * adherencePercent) / 100}
              style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
            />
          </svg>
          <span style={{ position: "absolute", fontSize: "0.85rem", fontWeight: 700, color: "#7c3aed" }}>
            {loggedActiveIds.size}/{activeMeds.length}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",marginBottom:10 }}>
        <button onClick={() => { setShowAddForm(!showAddForm); setShowLogForm(false); }} style={{ 
          background: showAddForm ? "#f5f3ff" : "linear-gradient(135deg, #7c3aed, #6d28d9)", 
          color: showAddForm ? "#7c3aed" : "white", 
          border: "none", borderRadius: 12, padding: "12px 24px", 
          fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" 
        }}>
          {showAddForm ? "✕ Cancel" : "➕ Add Prescribed Medicine"}
        </button>

        <button onClick={() => { setShowLogForm(!showLogForm); setShowAddForm(false); }} style={{ 
          background: showLogForm ? "#f5f3ff" : "linear-gradient(135deg, #10b981, #059669)", 
          color: showLogForm ? "#10b981" : "white", 
          border: "none", borderRadius: 12, padding: "12px 24px", 
          fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" 
        }}>
          {showLogForm ? "✕ Cancel" : "📝 Log Dose Taken"}
        </button>

        <button
          onClick={async () => {
            setRefreshing(true);
            await Promise.all([fetchMedicines(true), fetchMedicineLogs(true)]);
            setRefreshing(false);
          }}
          disabled={refreshing || medicinesLoading}
          style={{
            background: "white",
            color: "#7c3aed",
            border: "1.5px solid #ede9fe",
            borderRadius: 12,
            padding: "11px 18px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.9rem",
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

      {/* Add Medicine Form */}
      {showAddForm && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", border: "1px solid #ede9fe", boxShadow: "0 4px 24px rgba(124, 58, 237, 0.08)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", color: "#7c3aed", marginBottom: "1.2rem", fontSize: "1.1rem" }}>Add Prescribed Medicine</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem" }}>
            <div>
              <label style={labelSt}>Medicine Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Metformin, Thyronorm" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Dosage *</label>
              <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 500 mg, 75 mcg" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Intake Schedule / Timing *</label>
              <select value={timing} onChange={e => setTiming(e.target.value)} style={inputSt}>
                <option value="Before Breakfast">Before Breakfast (Fasting)</option>
                <option value="After Breakfast">After Breakfast</option>
                <option value="After Lunch">After Lunch</option>
                <option value="Before Dinner">Before Dinner</option>
                <option value="After Dinner">After Dinner</option>
                <option value="Bedtime">Bedtime</option>
                <option value="As Needed">As Needed (SOS)</option>
              </select>
            </div>
            <div>
              <label style={labelSt}>Instruction Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Dr. Verma's advice, avoid dairy" style={inputSt} />
            </div>
          </div>
          <button onClick={handleAddMedicineSubmit} disabled={savingMed} style={{ 
            marginTop: "1.2rem", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", 
            border: "none", borderRadius: 10, padding: "11px 28px", fontFamily: "var(--font-body)", 
            fontWeight: 600, fontSize: "0.9rem", cursor: savingMed ? "not-allowed" : "pointer", opacity: savingMed ? 0.7 : 1 
          }}>
            {savingMed ? "Adding..." : "Save Medicine"}
          </button>
        </div>
      )}

      {/* Log Dose Form */}
      {showLogForm && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", border: "1px solid #d1fae5", boxShadow: "0 4px 24px rgba(16, 185, 129, 0.08)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", color: "#10b981", marginBottom: "1.2rem", fontSize: "1.1rem" }}>Log Medicine Dose</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem" }}>
            <div>
              <label style={labelSt}>Select Prescribed Medicine *</label>
              <select value={selectedMedId} onChange={e => setSelectedMedId(e.target.value)} style={inputSt}>
                <option value="">-- Choose Medication --</option>
                {activeMeds.map(m => (
                  <option key={m._id} value={m._id}>{m.name} ({m.dosage}) - {m.timing}</option>
                ))}
                <option value="custom">-- Custom/Other Medicine --</option>
              </select>
            </div>

            {selectedMedId === "custom" && (
              <>
                <div>
                  <label style={labelSt}>Custom Medicine Name *</label>
                  <input type="text" value={customMedName} onChange={e => setCustomMedName(e.target.value)} placeholder="e.g. Paracetamol" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Custom Dosage *</label>
                  <input type="text" value={customDosage} onChange={e => setCustomDosage(e.target.value)} placeholder="e.g. 650 mg" style={inputSt} />
                </div>
              </>
            )}

            <DateTimePicker value={takenAt} onChange={setTakenAt} label="Taken Date & Time *" accentColor="#10b981" />
            <div>
              <label style={labelSt}>Note / Side-effect / Reading</label>
              <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="e.g. Taken with water, feeling good" style={inputSt} />
            </div>
          </div>
          <button onClick={handleLogIntakeSubmit} disabled={savingLog} style={{ 
            marginTop: "1.2rem", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", 
            border: "none", borderRadius: 10, padding: "11px 28px", fontFamily: "var(--font-body)", 
            fontWeight: 600, fontSize: "0.9rem", cursor: savingLog ? "not-allowed" : "pointer", opacity: savingLog ? 0.7 : 1 
          }}>
            {savingLog ? "Logging..." : "Log Dose"}
          </button>
        </div>
      )}

      {/* Prescribed Medications Section */}
      <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", boxShadow: "0 2px 16px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0",marginBottom:10 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>📋 Prescribed Medication Schedule</h3>
        {medicinesLoading && medicines.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>Loading medications...</div>
        ) : medicines.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            No prescribed medications recorded yet. Use the add button above to define her treatment schedule.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {medicines.map(med => {
              const takenToday = loggedActiveIds.has(med._id);
              return (
                <div key={med._id} style={{ 
                  borderRadius: 16, 
                  border: `1.5px solid ${med.active ? (takenToday ? "#d1fae5" : "#ede9fe") : "#e5e7eb"}`, 
                  background: med.active ? "white" : "#f9fafb",
                  padding: "1rem 1.2rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: med.active ? 1 : 0.6,
                  transition: "all 0.2s"
                }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: med.active ? "#1a1a2e" : "#6b7280" }}>
                        {med.name}
                      </span>
                      <span style={{ 
                        background: med.active ? (takenToday ? "#d1fae5" : "#f5f3ff") : "#f3f4f6", 
                        color: med.active ? (takenToday ? "#065f46" : "#7c3aed") : "#9ca3af", 
                        fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20 
                      }}>
                        {med.active ? (takenToday ? "✅ TAKEN TODAY" : "⏳ DUE TODAY") : "INACTIVE"}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#6b7280" }}>
                      Dosage: <span style={{ color: "#1a1a2e" }}>{med.dosage}</span>
                    </p>
                    <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#6b7280", marginTop: 2 }}>
                      Timing: <span style={{ color: "#7c3aed" }}>🕒 {med.timing}</span>
                    </p>
                    {med.notes && (
                      <p style={{ fontSize: "0.76rem", color: "#9ca3af", fontStyle: "italic", marginTop: 6 }}>
                        &quot;{med.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => toggleMedicine(med._id, !med.active)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "#6b7280", fontWeight: 600 }}>
                        {med.active ? "⏸️ Inactive" : "▶️ Active"}
                      </button>
                      <button onClick={() => { if (confirm("Delete prescription?")) deleteMedicine(med._id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "#ef4444", fontWeight: 600 }}>
                        🗑️ Delete
                      </button>
                    </div>

                    {med.active && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button 
                          onClick={() => testReminderNotification(med.name, med.dosage)} 
                          title="Send a push reminder"
                          style={{ background: "#f3e8ff", border: "none", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: "0.8rem" }}
                        >
                          🔔
                        </button>
                        <button 
                          onClick={() => handleQuickLog(med)} 
                          disabled={takenToday}
                          style={{ 
                            background: takenToday ? "#e5e7eb" : "linear-gradient(135deg, #10b981, #059669)", 
                            color: takenToday ? "#9ca3af" : "white", 
                            border: "none", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, cursor: takenToday ? "not-allowed" : "pointer" 
                          }}
                        >
                          {takenToday ? "Logged" : "⚡ Take Now"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dose Intake logs table */}
      <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0",marginBottom:10 }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>Medication Logs & Adherence History</h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{medicineLogs.length} doses recorded</span>
        </div>

        {medicinesLoading && medicineLogs.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>Loading dose history...</div>
        ) : medicineLogs.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
            No medication doses recorded yet. Track when Mom takes her medicines to monitor adherence.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Date & Time", "Medicine", "Dosage", "Note", ""].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medicineLogs.map((l, idx) => (
                  <tr key={l._id} style={{ borderTop: "1px solid #f5f5f5", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={tdSt}>{formatDisplay(l.takenAt)}</td>
                    <td style={{ ...tdSt, fontWeight: 700, color: "#1a1a2e" }}>
                      💊 {l.medicineName}
                    </td>
                    <td style={tdSt}>
                      <span style={{ background: "#ede9fe", color: "#7c3aed", padding: "2px 8px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600 }}>
                        {l.dosage}
                      </span>
                    </td>
                    <td style={{ ...tdSt, color: "#6b7280", fontStyle: "italic", fontSize: "0.82rem" }}>
                      {l.note || "—"}
                    </td>
                    <td style={tdSt}>
                      <button onClick={async () => { if (confirm("Delete this log?")) await deleteMedicineLog(l._id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db" }}>
                        🗑️
                      </button>
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

const labelSt: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.88rem", color: "#1a1a2e", outline: "none", fontFamily: "var(--font-body)" };
const thSt: React.CSSProperties = { padding: "12px 16px", fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textAlign: "left", textTransform: "uppercase", letterSpacing: 0.5 };
const tdSt: React.CSSProperties = { padding: "14px 16px", fontSize: "0.85rem", color: "#1a1a2e" };
