"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  accentColor?: string;
}

export default function MultiSelectDropdown({
  options,
  selectedValues,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  accentColor = "#7c3aed",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const removeValue = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== value));
  };

  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          minHeight: 44,
          border: `1.5px solid ${open ? accentColor : "#e5e7eb"}`,
          borderRadius: 10,
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          cursor: "pointer",
          background: "#fff",
        }}
      >
        {selectedOptions.length === 0 && (
          <span style={{ color: "#9ca3af", fontSize: "0.88rem", padding: "4px 2px" }}>
            {placeholder}
          </span>
        )}
        {selectedOptions.map((opt) => (
          <span
            key={opt.value}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: `${accentColor}15`,
              color: accentColor,
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            {opt.label}
            <span onClick={(e) => removeValue(opt.value, e)} style={{ cursor: "pointer", fontWeight: 700 }}>
              ✕
            </span>
          </span>
        ))}
        <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: "0.75rem" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            zIndex: 50,
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>
          <div style={{ overflowY: "auto", padding: 6 }}>
            {filteredOptions.length === 0 && (
              <div style={{ padding: "10px 12px", color: "#9ca3af", fontSize: "0.85rem" }}>No matches found</div>
            )}
            {filteredOptions.map((opt) => {
              const checked = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleValue(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: checked ? `${accentColor}10` : "transparent",
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => {}} style={{ width: 15, height: 15, accentColor }} />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>{opt.label}</div>
                    {opt.sublabel && <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{opt.sublabel}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}