"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { formatDisplay, formatInputDefault } from "@/lib/helpers";
import DateTimePicker from "./DateTimePicker";
import MultiSelectDropdown from "./MultiSelectDropdown";

const CLINIC_SPECIALTIES = [
  "General Physician",
  "General OPD Checkup",

  // Medicine
  "Internal Medicine",
  "Family Medicine",
  "Diabetologist (Sugar)",
  "Endocrinologist (Thyroid & Hormones)",
  "Cardiologist (Heart)",
  "Pulmonologist (Lungs)",
  "Gastroenterologist (Stomach & Liver)",
  "Nephrologist (Kidney)",
  "Hepatologist (Liver)",
  "Neurologist (Brain & Nerves)",
  "Psychiatrist",
  "Psychologist",
  "Dermatologist (Skin)",
  "Allergy Specialist",
  "Infectious Disease Specialist",
  "Rheumatologist",

  // Surgery
  "General Surgeon",
  "Orthopedic (Bone & Joint)",
  "Neurosurgeon",
  "Plastic Surgeon",
  "Vascular Surgeon",
  "Urologist",

  // Women's Health
  "Gynecologist",
  "Obstetrician (Pregnancy)",
  "Fertility Specialist (IVF)",

  // Children's Health
  "Pediatrician",
  "Pediatric Surgeon",

  // Cancer
  "Oncologist",
  "Radiation Oncologist",

  // ENT & Eye
  "ENT Specialist (Ear, Nose & Throat)",
  "Ophthalmologist (Eye)",
  "Audiologist",

  // Dental
  "Dentist",
  "Orthodontist",
  "Oral Surgeon",

  // Rehabilitation
  "Physiotherapist",
  "Occupational Therapist",
  "Speech Therapist",

  // Emergency & Critical Care
  "Emergency Medicine",
  "Critical Care Specialist",

  // Diagnostics
  "Radiologist",
  "Pathologist",

  // Nutrition
  "Dietitian / Nutritionist",

  // Others
  "Pain Management",
  "Geriatric Specialist (Senior Citizen)",
  "Sleep Medicine",
  "Lifestyle Medicine",
  "Preventive Health Checkup",
  "Vaccination / Immunization",
  "Follow-up Consultation",
  "Teleconsultation",
  "Other"
];

export default function AppointmentsTab() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [masterDoctors, setMasterDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAppForm, setShowAppForm] = useState<boolean>(false);
  const [showDocForm, setShowDocForm] = useState<boolean>(false);
  const [isGoogleLinked, setIsGoogleLinked] = useState<boolean>(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // Appointment Form States
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>(CLINIC_SPECIALTIES[0]);
  const [appointmentDate, setAppointmentDate] = useState<string>(formatInputDefault());
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [syncToGoogle, setSyncToGoogle] = useState<boolean>(true);
  const [savingApp, setSavingApp] = useState<boolean>(false);

  // Doctor Form States
  const [newDocName, setNewDocName] = useState<string>("");
  const [newDocPhone, setNewDocPhone] = useState<string>("");
  const [newDocAddress, setNewDocAddress] = useState<string>("");
  const [newDocSpecialties, setNewDocSpecialties] = useState<string[]>([]);
  const [savingDoc, setSavingDoc] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const appRes = await fetch("/api/appointments");
      const appData = await appRes.json();
      if (appData.success) {
        setAppointments(appData.appointments || []);
        setIsGoogleLinked(appData.isGoogleLinked || false);
      }

      const docRes = await fetch("/api/doctors");
      const docData = await docRes.json();
      if (docData.success) setMasterDoctors(docData.doctors || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // DOCTOR ACTIONS HANDLERS
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) return;
    setSavingDoc(true);
    try {
      const url = editingDocId ? `/api/doctors/${editingDocId}` : "/api/doctors";
      const method = editingDocId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDocName,
          phone: newDocPhone,
          address: newDocAddress,
          specialties: newDocSpecialties,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDocName(""); setNewDocPhone(""); setNewDocAddress(""); setNewDocSpecialties([]);
        setEditingDocId(null);
        setShowDocForm(false);
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setSavingDoc(false); }
  };

  const handleEditDocClick = (doc: any) => {
    setEditingDocId(doc._id);
    setNewDocName(doc.name);
    setNewDocPhone(doc.phone || "");
    setNewDocAddress(doc.address || "");
    setNewDocSpecialties(doc.specialties || []);
    setShowDocForm(true);
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Remove this doctor from registry?")) return;
    try {
      const res = await fetch(`/api/doctors/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (err) { console.error(err); }
  };

  // APPOINTMENT ACTION HANDLERS
  const handleEditAppClick = (app: any) => {
    setEditingAppId(app._id);
    setSelectedDocIds(app.doctorIds?.map((d: any) => d._id) || []);
    setCustomTitle(app.customTitle || "");
    setSpecialty(app.specialty || CLINIC_SPECIALTIES[0]);
    setAppointmentDate(dayjs(app.appointmentDate).format("YYYY-MM-DDTHH:mm"));
    setLocation(app.location || "");
    setNotes(app.notes || "");
    setShowAppForm(true);
  };

  const handleCancelAppForm = () => {
    setEditingAppId(null); setSelectedDocIds([]); setCustomTitle("");
    setSpecialty(CLINIC_SPECIALTIES[0]); setAppointmentDate(formatInputDefault());
    setLocation(""); setNotes(""); setShowAppForm(false);
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingApp(true);
    try {
      const url = editingAppId ? `/api/appointments/${editingAppId}` : "/api/appointments";
      const method = editingAppId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorIds: selectedDocIds,
          customTitle,
          specialty,
          appointmentDate: new Date(appointmentDate),
          location,
          notes,
          syncToGoogle: !editingAppId && syncToGoogle && isGoogleLinked
        })
      });
      if ((await res.json()).success) {
        handleCancelAppForm();
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setSavingApp(false); }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm("Remove appointment sequence?")) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if ((await res.json()).success) fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Top Controls Board */}
      <div style={{ background: "white", borderRadius: 20, padding: "1.5rem 2rem", boxShadow: "0 4px 24px rgba(124, 58, 237, 0.08)", border: "1px solid #ede9fe", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: "24px" }}>
        <div>
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase" }}>Global Schedule Pipeline</p>
          <span style={{ fontSize: "2.3rem", fontWeight: 700, color: "#7c3aed" }}>
            {appointments.length} Consultations Loaded
          </span>
        </div>
        {isGoogleLinked ? (
          <div style={{ background: "#d1fae5", color: "#065f46", padding: "8px 14px", borderRadius: 30, fontSize: "0.82rem", fontWeight: 700 }}>🟢 Google Sync Live</div>
        ) : (
          <button onClick={() => window.location.href = "/api/auth/google-calendar"} style={{ background: "#fff", border: "1.5px solid #e5e7eb", padding: "8px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 600 }}>🗓️ Enable Sync Channel</button>
        )}
      </div>

      {/* Spaced Control Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: "24px" }}>
        <button onClick={() => setShowAppForm(!showAppForm)} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 12, padding: "12px 22px", fontWeight: 600, cursor: "pointer" }}>
          {showAppForm ? "✕ Close Form" : "➕ Book Appointment"}
        </button>
        <button onClick={() => { setShowDocForm(!showDocForm); setEditingDocId(null); }} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 22px", fontWeight: 600, cursor: "pointer" }}>
          {showDocForm ? "✕ Close Registry" : "🏥 Add New Doctor/Center"}
        </button>
      </div>

      {/* 1. MASTER DOCTOR DRAWER PANEL */}
      {showDocForm && (
        <div style={{ background: "#fafafa", borderRadius: 20, padding: "1.5rem", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
          <h4 style={{ color: "#374151", marginBottom: "1.2rem", fontWeight: 700 }}>
            {editingDocId ? "✏️ Edit Doctor Parameters" : "🏥 Register Doctor Node Specialty"}
          </h4>
          <form onSubmit={handleAddDoctorSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem" }}>
              <div>
                <label style={lblSt}>Physician Name *</label>
                <input type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} style={inpSt} required />
              </div>
              <div>
                <label style={lblSt}>Phone Interface</label>
                <input type="text" value={newDocPhone} onChange={e => setNewDocPhone(e.target.value)} style={inpSt} />
              </div>
              <div>
                <label style={lblSt}>Clinic Room / Address</label>
                <input type="text" value={newDocAddress} onChange={e => setNewDocAddress(e.target.value)} style={inpSt} />
              </div>
              <div>
                <label style={lblSt}>Specialties</label>
                <MultiSelectDropdown
                  options={CLINIC_SPECIALTIES.map((s) => ({ value: s, label: s }))}
                  selectedValues={newDocSpecialties}
                  onChange={setNewDocSpecialties}
                  placeholder="Select specialties..."
                  searchPlaceholder="Search specialty..."
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1.2rem" }}>
              <button type="submit" disabled={savingDoc} style={{ background: "#10b981", color: "white", border: "none", padding: "11px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>
                {savingDoc ? "Updating..." : "💾 Commit Doctor Record"}
              </button>
              {editingDocId && <button type="button" onClick={() => { setShowDocForm(false); setEditingDocId(null); }} style={{ background: "#e5e7eb", border: "none", padding: "11px 20px", borderRadius: 10 }}>Cancel</button>}
            </div>
          </form>

          {/* Inline Registry Directory List */}
          <div style={{ marginTop: "1.5rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
            <p style={{ ...lblSt, marginBottom: 10 }}>Currently Registered Providers Matrix</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {masterDoctors.map(doc => (
                <div key={doc._id} style={{ display: "flex", justifyContent: "space-between", background: "#fff", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                  <div>
                    <strong style={{ fontSize: "0.88rem" }}>{doc.name}</strong>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280", marginLeft: 8 }}>
                      [{doc.specialties?.join(", ") || "No Specialty Specified"}]
                    </span>
                  </div>
                  <div>
                    <button onClick={() => handleEditDocClick(doc)} style={{ background: "none", border: "none", cursor: "pointer", marginRight: 10 }}>📝</button>
                    <button onClick={() => handleDeleteDoc(doc._id)} style={{ background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. APPOINTMENT BOOKING PANEL */}
      {showAppForm && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", border: "1px solid #ede9fe", marginBottom: "24px" }}>
          <h3 style={{ color: "#7c3aed", marginBottom: "1.2rem" }}>💾 Process Consultation Data</h3>
          <form onSubmit={handleAppointmentSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem" }}>
              <div>
                <label style={lblSt}>Select Doctor(s)</label>
                <MultiSelectDropdown
                  options={masterDoctors.map((doc) => ({
                    value: doc._id,
                    label: doc.name,
                    sublabel: doc.specialties?.length > 0 ? doc.specialties.join(", ") : "No specialty set",
                  }))}
                  selectedValues={selectedDocIds}
                  onChange={setSelectedDocIds}
                  placeholder="Choose one or more doctors..."
                  searchPlaceholder="Search doctor by name..."
                />
              </div>
              <div>
                <label style={lblSt}>Custom Title Context</label>
                <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="For OPD" style={inpSt} />
              </div>
              <div>
                <label style={lblSt}>Specialty (for this visit)</label>
                <select value={specialty} onChange={e => setSpecialty(e.target.value)} style={inpSt}>
                  {CLINIC_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <DateTimePicker value={appointmentDate} onChange={setAppointmentDate} label="Date & Time Parameters *" accentColor="#7c3aed" />
              <div>
                <label style={lblSt}>Destination Venue</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} style={inpSt} />
              </div>
            </div>

            <div style={{ marginTop: "1.2rem" }}>
              <label style={lblSt}>Clinical Instruction Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={inpSt} />
            </div>

            {/* Restored Google Sync Checkbox Framework */}
            {!editingAppId && isGoogleLinked && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "1.2rem" }}>
                <input type="checkbox" id="syncGoogle" checked={syncToGoogle} onChange={e => setSyncToGoogle(e.target.checked)} style={{ width: 16, height: 16 }} />
                <label htmlFor="syncGoogle" style={{ fontSize: "0.85rem", color: "#4b5563", cursor: "pointer" }}>Sync this entry with live Google Calendar Account</label>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: "1.4rem" }}>
              <button type="submit" disabled={savingApp} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 10, padding: "11px 28px", fontWeight: 600, cursor: "pointer" }}>
                {savingApp ? "Processing Transaction..." : "💾 Confirm Log"}
              </button>
              <button type="button" onClick={handleCancelAppForm} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "11px 20px", cursor: "pointer" }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* APPOINTMENT GRID TABLE VIEW */}
      <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["Timeline Timestamp", "Mapped Practitioner", "Specialty Setup", "Venue", "Notes", "Controls"].map(h => <th key={h} style={thSt}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {appointments.map((app, idx) => {
              const names = app.doctorIds?.map((d: any) => d.name).join(", ");
              return (
                <tr key={app._id} style={{ borderTop: "1px solid #f5f5f5", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={tdSt}>{formatDisplay(app.appointmentDate)}</td>
                  <td style={{ ...tdSt, fontWeight: 700 }}>
                    🏥 {names || "General Duty Office"} {app.customTitle && `[${app.customTitle}]`}
                  </td>
                  <td style={tdSt}>
                    {app.doctorIds?.map((doc: any, idx: number) => (
                      <div key={idx} style={{ fontSize: "0.75rem", color: "#4b5563" }}>
                        {doc.name}: {doc.specialties?.join(", ") || "—"}
                      </div>
                    ))}
                  </td>
                  <td style={tdSt}>📍 {app.location || "—"}</td>
                  <td style={tdSt}>{app.notes || "—"}</td>
                  <td style={tdSt}>
                    <button onClick={() => handleEditAppClick(app)} style={{ background: "none", border: "none", cursor: "pointer", marginRight: 12 }}>📝</button>
                    <button onClick={() => handleDeleteApp(app._id)} style={{ background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const lblSt = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" as const };
const inpSt = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.88rem", background: "#fff" };
const thSt = { padding: "12px 16px", fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textAlign: "left" as const };
const tdSt = { padding: "14px 16px", fontSize: "0.85rem" };