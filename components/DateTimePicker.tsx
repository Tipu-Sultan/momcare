"use client";
import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";

interface Props {
  value: string;           // "YYYY-MM-DDTHH:mm"
  onChange: (val: string) => void;
  label?: string;
  accentColor?: string;
}

const MONTHS       = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_OF_WEEK = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MINUTES      = Array.from({ length: 60 }, (_, i) => i);

export default function DateTimePicker({ value, onChange, label = "Date & Time", accentColor = "#e8566a" }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear,  setViewYear]  = useState(() => { const d = dayjs(value); return d.isValid() ? d.year()  : dayjs().year();  });
  const [viewMonth, setViewMonth] = useState(() => { const d = dayjs(value); return d.isValid() ? d.month() : dayjs().month(); });

  const [selYear,  setSelYear]  = useState(() => { const d = dayjs(value); return d.isValid() ? d.year()   : dayjs().year();   });
  const [selMonth, setSelMonth] = useState(() => { const d = dayjs(value); return d.isValid() ? d.month()  : dayjs().month();  });
  const [selDay,   setSelDay]   = useState(() => { const d = dayjs(value); return d.isValid() ? d.date()   : dayjs().date();   });
  const [selHour,  setSelHour]  = useState(() => { const d = dayjs(value); return d.isValid() ? d.hour()   : dayjs().hour();   }); // 0-23
  const [selMin,   setSelMin]   = useState(() => { const d = dayjs(value); return d.isValid() ? d.minute() : dayjs().minute(); }); // exact 0-59

  const popRef = useRef<HTMLDivElement>(null);

  // KEY FIX: whenever the `value` prop changes from outside (e.g. edit opens),
  // re-sync ALL internal state to the new value
  useEffect(() => {
    const d = dayjs(value);
    if (!d.isValid()) return;
    setViewYear(d.year());   setViewMonth(d.month());
    setSelYear(d.year());    setSelMonth(d.month());
    setSelDay(d.date());
    setSelHour(d.hour());    // exact hour, no rounding
    setSelMin(d.minute());   // exact minute, no rounding
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => setOpen(true);

  const handleConfirm = () => {
    const d = dayjs(
      `${selYear}-${String(selMonth + 1).padStart(2,"0")}-${String(selDay).padStart(2,"0")}` +
      `T${String(selHour).padStart(2,"0")}:${String(selMin).padStart(2,"0")}`
    );
    if (d.isValid()) onChange(d.format("YYYY-MM-DDTHH:mm"));
    setOpen(false);
  };

  const firstDayOfMonth = dayjs(`${viewYear}-${viewMonth + 1}-01`).day();
  const daysInMonth     = dayjs(`${viewYear}-${viewMonth + 1}-01`).daysInMonth();
  const prevMonthDays   = dayjs(`${viewYear}-${viewMonth + 1}-01`).subtract(1, "month").daysInMonth();
  const totalCells      = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0);  setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const displayVal = dayjs(value).isValid()
    ? dayjs(value).format("DD MMM YYYY, hh:mm A")
    : "Pick date & time";

  const hour12 = selHour === 0 ? 12 : selHour > 12 ? selHour - 12 : selHour;
  const ampm   = selHour < 12 ? "AM" : "PM";

  const years = Array.from({ length: 6 }, (_, i) => dayjs().year() - i);

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.8rem",
    fontFamily: "var(--font-body)", fontWeight: active ? 700 : 500,
    background: active ? accentColor : "transparent",
    color: active ? "white" : "#1a1a2e",
    transition: "all 0.15s",
  });

  const dayBtn = (inMonth: boolean, isSelected: boolean, isToday: boolean): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: "50%", border: "none",
    cursor: inMonth ? "pointer" : "default", fontSize: "0.82rem",
    fontFamily: "var(--font-body)", fontWeight: isSelected ? 700 : 400,
    background: isSelected ? accentColor : isToday ? accentColor + "20" : "transparent",
    color: isSelected ? "white" : inMonth ? (isToday ? accentColor : "#1a1a2e") : "#d1d5db",
    transition: "all 0.1s",
  });

  return (
    <div style={{ position: "relative" }}>
      {label && (
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </label>
      )}

      {/* Trigger */}
      <button type="button" onClick={handleOpen} style={{
        width: "100%", padding: "10px 14px", borderRadius: 10,
        border: `1.5px solid ${open ? accentColor : "#e5e7eb"}`,
        background: "white", cursor: "pointer", textAlign: "left",
        fontFamily: "var(--font-body)", fontSize: "0.88rem", color: "#1a1a2e",
        display: "flex", alignItems: "center", gap: 8, transition: "border 0.2s",
      }}>
        <span>📅</span>
        <span style={{ flex: 1 }}>{displayVal}</span>
        <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>▼</span>
      </button>

      {/* Modal */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div ref={popRef} style={{ background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: "1.5rem", width: "100%", maxWidth: 340, fontFamily: "var(--font-body)" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "#1a1a2e" }}>Pick Date & Time</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#9ca3af" }}>✕</button>
            </div>

            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
              <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280", padding: "4px 8px" }}>‹</button>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a2e" }}>{MONTHS[viewMonth]}</span>
                <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}
                  style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 6px", fontSize: "0.85rem", fontFamily: "var(--font-body)", color: "#1a1a2e", background: "white" }}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280", padding: "4px 8px" }}>›</button>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {DAYS_OF_WEEK.map(d => <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", padding: "4px 0" }}>{d}</div>)}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: "1rem" }}>
              {Array.from({ length: totalCells }, (_, i) => {
                const dayNum  = i - firstDayOfMonth + 1;
                const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                const displayDay = inMonth ? dayNum : (dayNum < 1 ? prevMonthDays + dayNum : dayNum - daysInMonth);
                const isSelected = inMonth && dayNum === selDay && viewMonth === selMonth && viewYear === selYear;
                const isToday    = inMonth && dayjs().date() === dayNum && dayjs().month() === viewMonth && dayjs().year() === viewYear;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                    <button type="button"
                      onClick={() => { if (inMonth) { setSelDay(dayNum); setSelMonth(viewMonth); setSelYear(viewYear); } }}
                      style={dayBtn(inMonth, isSelected, isToday)}
                    >{displayDay}</button>
                  </div>
                );
              })}
            </div>

            {/* Time section */}
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "1rem", marginBottom: "0.8rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Time</p>

              {/* Hour */}
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 6 }}>Hour</p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
                    const h24 = ampm === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
                    return (
                      <button key={h} type="button" onClick={() => setSelHour(h24)}
                        style={{ ...btn(selHour === h24), minWidth: 36 }}>
                        {String(h).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minute — 00-59, scrollable 10-column grid */}
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 6 }}>Minute</p>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(10, 1fr)",
                  gap: 3, maxHeight: 96, overflowY: "auto",
                  padding: "4px 2px", border: "1px solid #f0f0f0", borderRadius: 8,
                }}>
                  {MINUTES.map(m => (
                    <button key={m} type="button" onClick={() => setSelMin(m)}
                      style={{ ...btn(selMin === m), padding: "5px 2px", fontSize: "0.75rem", minWidth: "unset", borderRadius: 6 }}>
                      {String(m).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>

              {/* AM / PM */}
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                {(["AM","PM"] as const).map(ap => (
                  <button key={ap} type="button"
                    onClick={() => {
                      if (ap === "AM" && selHour >= 12) setSelHour(h => h - 12);
                      if (ap === "PM" && selHour < 12)  setSelHour(h => h + 12);
                    }}
                    style={{ ...btn(ampm === ap), flex: 1, padding: "7px" }}
                  >{ap}</button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: accentColor + "12", borderRadius: 10, padding: "8px 12px", marginBottom: 12, textAlign: "center" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: accentColor }}>
                {SHORT_MONTHS[selMonth]} {String(selDay).padStart(2,"0")}, {selYear} — {String(hour12).padStart(2,"0")}:{String(selMin).padStart(2,"0")} {ampm}
              </span>
            </div>

            <button type="button" onClick={handleConfirm} style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
              color: "white", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            }}>✓ Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}