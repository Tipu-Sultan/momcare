"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { formatDisplay } from "@/lib/helpers"; // Dynamic text date formatting utility pipeline
import DateTimePicker from "./DateTimePicker";

export default function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form Reactive Core State Variables
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("Prescription");
  const [reportDate, setReportDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [notes, setNotes] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health-reports");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed executing storage document sync fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reportDate || !file) {
      alert("Please enter a title, document date, and select an authentic file asset.");
      return;
    }

    setSubmitting(true);
    setSuccessMsg("");

    try {
      const base64String = await convertToBase64(file);

      const res = await fetch("/api/health-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          reportDate,
          notes,
          fileBase64: base64String,
          fileName: file.name,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("🎉 Document uploaded and secure locker sync finalized!");
        setTitle("");
        setNotes("");
        setFile(null);
        const fileInput = document.getElementById("file-uploader-dom") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        setShowAddForm(false);
        await fetchReports();
      } else {
        alert("Server storage update rejection: " + data.error);
      }
    } catch (err) {
      console.error("Critical component validation process failure:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document from the vault?")) return;
    try {
      const res = await fetch(`/api/health-reports/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchReports();
      } else {
        alert("Failed to delete report: " + data.error);
      }
    } catch (err) {
      console.error("Delete report request error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Adherence / Vault Header Status Card */}
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
        marginBottom: 10
      }}>
        <div className="space-y-1">
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>
            Clinical Vault System Integrity
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 700, color: "#7c3aed" }}>
              {reports.length}
            </span>
            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Secure Records Active
            </span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            All medical scan reports, lab test results, and diagnostic files of Shakila Khatoon are securely stored in the Cloudinary repository.
          </p>
        </div>

        {/* Sync Icon Matrix Graphic */}
        <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", background: "#f5f3ff", borderRadius: "50%" }}>
          🛡️
        </div>
      </div>

      {/* Action Trigger Buttons Bar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          style={{ 
            background: showAddForm ? "#f5f3ff" : "linear-gradient(135deg, #7c3aed, #6d28d9)", 
            color: showAddForm ? "#7c3aed" : "white", 
            border: "none", borderRadius: 12, padding: "12px 24px", 
            fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" 
          }}
        >
          {showAddForm ? "✕ Cancel Upload" : "➕ Upload Health Report"}
        </button>

        <button
          onClick={async () => {
            setRefreshing(true);
            await fetchReports();
            setRefreshing(false);
          }}
          disabled={refreshing || loading}
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
          {refreshing ? "Refreshing Vault..." : "Refresh"}
        </button>
      </div>

      {/* Add Document Locker Form Module */}
      {showAddForm && (
        <div style={{ background: "white", borderRadius: 20, padding: "1.5rem", border: "1px solid #ede9fe", boxShadow: "0 4px 24px rgba(124, 58, 237, 0.08)",marginBottom: 10 }}>
          <h3 style={{ fontFamily: "var(--font-display)", color: "#7c3aed", marginBottom: "1.2rem", fontSize: "1.1rem" }}>
            Upload Secure Medical Document
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.2rem" }}>
              <div>
                <label style={labelSt}>Document Title / Name *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. CBC Blood Report, Jan Prescription" 
                  style={inputSt} 
                />
              </div>

              <div>
                <label style={labelSt}>Locker Type Category *</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={inputSt}>
                  <option value="Prescription">Prescription</option>
                  <option value="Blood Test">Blood Test</option>
                  <option value="Lab Report">Lab Report</option>
                  <option value="Scan/X-Ray">Scan/X-Ray</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
              <DateTimePicker value={reportDate} onChange={setReportDate} label="Report/Checkup Date *" accentColor="#10b981" />
              </div>

              <div>
                <label style={labelSt}>Clinical Notes / Summary</label>
                <input 
                  type="text" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="e.g. Dr. Verma prescribed, high glucose" 
                  style={inputSt} 
                />
              </div>
            </div>

            <div style={{ marginTop: "1.2rem" }}>
              <label style={labelSt}>Select Document File (PDF, JPEG, JPG, PNG) *</label>
              <input
                id="file-uploader-dom"
                type="file"
                accept=".pdf,image/jpeg,image/jpg,image/png"
                onChange={handleFileChange}
                style={{ ...inputSt, padding: "8px" }}
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting} 
              style={{ 
                marginTop: "1.4rem", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", 
                border: "none", borderRadius: 10, padding: "11px 28px", fontFamily: "var(--font-body)", 
                fontWeight: 600, fontSize: "0.9rem", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 
              }}
            >
              {submitting ? "Uploading to Cloudinary Vault..." : "💾 Save to Repository Locker"}
            </button>
          </form>

          {successMsg && (
            <div style={{ marginTop: 12, color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
              {successMsg}
            </div>
          )}
        </div>
      )}

      {/* Document History Logs Display Layer Table Container */}
      <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0", marginBottom: 10 }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
            Locker Vault Storage Documents
          </h3>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
            {reports.length} records mapped securely
          </span>
        </div>

        {loading && reports.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>Loading secure clinical history logs...</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
            No medical documents archived yet. Track Mom's test files to centralize history records.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Date Mapped", "Report Parameters Title", "Category Type", "Clinical Observation Notes", "Vault Target File", ""].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((report: any, idx: number) => (
                  <tr key={report._id || idx} style={{ borderTop: "1px solid #f5f5f5", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={tdSt}>
                      {dayjs(report.reportDate).format("DD MMM YYYY")}
                    </td>
                    <td style={{ ...tdSt, fontWeight: 700, color: "#1a1a2e" }}>
                      📂 {report.title}
                    </td>
                    <td style={tdSt}>
                      <span style={{ 
                        background: report.category === "Prescription" ? "#f5f3ff" : "#f3f4f6", 
                        color: report.category === "Prescription" ? "#7c3aed" : "#4b5563", 
                        padding: "2px 8px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600 
                      }}>
                        {report.category}
                      </span>
                    </td>
                    <td style={{ ...tdSt, color: "#6b7280", fontStyle: "italic", fontSize: "0.82rem" }}>
                      {report.notes || "—"}
                    </td>
                    <td style={tdSt}>
                      <a
                        href={report.cloudinaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          background: "linear-gradient(135deg, #10b981, #059669)", 
                          color: "white", padding: "4px 10px", borderRadius: 8,
                          fontSize: "0.76rem", fontWeight: 700, textDecoration: "none", display: "inline-block"
                        }}
                      >
                        👁️ View {report.fileType ? report.fileType.toUpperCase() : "FILE"}
                      </a>
                    </td>
                    <td style={tdSt}>
                      <button 
                        onClick={() => handleDeleteReport(report._id)} 
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db" }}
                      >
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

// Layout Global Parameters Definitions Matrix
const labelSt: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.88rem", color: "#1a1a2e", outline: "none", fontFamily: "var(--font-body)" };
const thSt: React.CSSProperties = { padding: "12px 16px", fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textAlign: "left", textTransform: "uppercase", letterSpacing: 0.5 };
const tdSt: React.CSSProperties = { padding: "14px 16px", fontSize: "0.85rem", color: "#1a1a2e" };