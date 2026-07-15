"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "ai";
  text: string;
  mode?: string;
}

interface DataSummary {
  totalSugarReadings: number;
  avgSugar: number | null;
  latestSugar: number | null;
  latestBP: string | null;
  latestTSH: number | null;
  highSugarCount: number;
  lowSugarCount: number;
}

const QUICK_ACTIONS = [
  { mode: "analyse",  icon: "📊", label: "Full Analysis",      desc: "Complete health overview" },
  { mode: "suggest",  icon: "💡", label: "Get Suggestions",    desc: "Diet & lifestyle tips" },
  { mode: "insulin",  icon: "💉", label: "Insulin Insights",   desc: "Insulin effectiveness" },
];

const QUICK_QUESTIONS = [
  "Is Mom's sugar control getting better or worse?",
  "What time of day is her sugar highest?",
  "How is her blood pressure trending?",
  "Is her insulin dose effective?",
  "What foods should she avoid?",
  "Should we be worried about any readings?",
];

// Render markdown-like text with basic formatting
function renderText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    // Bold: **text**
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const formatted = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    // Heading lines (start with emoji or #)
    const isHeading = /^#{1,3}\s/.test(line) || /^[📊💓🧬💉⚠️✅🥗🚶💊😴🍽️📅🔄📈⏰]/.test(line.trim());
    return (
      <p key={i} style={{
        margin: "6px 0",
        fontWeight: isHeading ? 600 : 400,
        fontSize: isHeading ? "0.92rem" : "0.87rem",
        color: isHeading ? "#1a1a2e" : "#374151",
        lineHeight: 1.6,
      }}>
        {formatted}
      </p>
    );
  });
}

export default function AiPanel() {
  const [open,       setOpen]       = useState(false);
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [summary,    setSummary]    = useState<DataSummary | null>(null);
  const [showQuick,  setShowQuick]  = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      // Load summary on first open
      fetchAI("Give me a quick 2-line health status summary.", "chat", true);
    }
  }, [open]);

  useEffect(() => {
  if (chatContainerRef.current) {
    chatContainerRef.current.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }
}, [messages, loading]);

  const fetchAI = async (question: string, mode = "chat", silent = false) => {
    if (!silent) {
      setMessages(prev => [...prev, { role: "user", text: question, mode }]);
      setShowQuick(false);
    }
    setLoading(true);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Automated backoff query call
    const makeRequest = async (retries = 3, waitTime = 4000): Promise<any> => {
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, mode }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          const errorText = data.detail || data.error || "";
          const isRateLimit = res.status === 429 || res.status === 503 || errorText.includes("limit") || errorText.includes("quota") || errorText.includes("demand");
          
          if (isRateLimit && retries > 0) {
            console.warn(`Rate limit hit on AI service. Retrying in ${waitTime / 1000}s... (${retries} retries remaining)`);
            await delay(waitTime);
            return makeRequest(retries - 1, waitTime + 2000); // Har attempt par thoda aur extra wait time badhein
          }
          throw new Error(errorText || "Unknown server response issue.");
        }
        return data;
      } catch (err: any) {
        throw err;
      }
    };

    try {
      const data = await makeRequest();
      if (data.dataUsed) setSummary(data.dataUsed);
      setMessages(prev => [...prev, { role: "ai", text: data.response, mode }]);
    } catch (err: any) {
      console.error("Error connecting to backend route:", err);
      
      let friendlyError = `⚠️ Connection Error: ${err.message}`;
      if (err.message.toLowerCase().includes("limit") || err.message.toLowerCase().includes("quota")) {
        friendlyError = "⏳ MomCare AI is currently cooling down from a brief rate limit. Let's wait a few more seconds and try sending again!";
      } else if (err.message.toLowerCase().includes("demand") || err.message.includes("503")) {
        friendlyError = "☕ Groq servers are experiencing high demand right now. Please wait a quick moment and tap send again!";
      }

      setMessages(prev => [...prev, { role: "ai", text: friendlyError, mode }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    fetchAI(input.trim(), "chat");
    setInput("");
  };

  const handleQuickAction = (mode: string, label: string) => {
    fetchAI(`Please ${label.toLowerCase()} for Mom's health data.`, mode);
  };

  const handleQuickQuestion = (q: string) => {
    fetchAI(q, "chat");
  };

  const clearChat = () => {
    setMessages([]);
    setShowQuick(true);
  };

  return (
    <>
      {/* ── Collapsed summary bar ── */}
      {!open && (
        <div
          onClick={() => setOpen(true)}
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
            borderRadius: 20,
            padding: "1.2rem 1.5rem",
            marginBottom: "1.5rem",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(124,58,237,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>
              🤖
            </div>
            <div>
              <div style={{ color: "white", fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700 }}>
                MomCare AI Assistant
              </div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem", marginTop: 2 }}>
                Powered by Groq · Tap to analyse Mom's health data
              </div>
            </div>
          </div>

          {/* Mini stats */}
          {summary && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Avg Sugar", value: summary.avgSugar ? `${summary.avgSugar} mg/dL` : "—" },
                { label: "Latest BP", value: summary.latestBP ?? "—" },
                { label: "TSH", value: summary.latestTSH ? `${summary.latestTSH}` : "—" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "6px 12px", textAlign: "center" }}>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: "0.88rem", marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ color: "white", opacity: 0.8, fontSize: "1.2rem" }}>→</div>
        </div>
      )}

      {/* ── Expanded AI Panel ── */}
      {open && (
        <div style={{
          background: "white",
          borderRadius: 20,
          marginBottom: "1.5rem",
          boxShadow: "0 8px 40px rgba(124,58,237,0.15)",
          border: "1px solid #e0d9ff",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7)",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.4rem" }}>🤖</span>
              <div>
                <div style={{ color: "white", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>MomCare AI</div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.72rem" }}>Analysing from your health records</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={clearChat} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 12px", color: "white", cursor: "pointer", fontSize: "0.78rem", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                🔄 Clear
              </button>
              <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 12px", color: "white", cursor: "pointer", fontSize: "0.78rem", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* Quick action buttons */}
          <div style={{ display: "flex", gap: 8, padding: "0.8rem 1.2rem", borderBottom: "1px solid #f3f0ff", flexWrap: "wrap" }}>
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.mode}
                onClick={() => handleQuickAction(a.mode, a.label)}
                disabled={loading}
                style={{
                  background: loading ? "#f5f5f5" : "#f3f0ff",
                  color: loading ? "#9ca3af" : "#7c3aed",
                  border: "1.5px solid #e0d9ff",
                  borderRadius: 10, padding: "7px 14px",
                  fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.82rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>

          {/* Chat messages area */}
          <div style={{ height: 380, overflowY: "auto", padding: "1rem 1.2rem", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Welcome + quick questions */}
            {showQuick && messages.length === 0 && !loading && (
              <div>
                <div style={{ background: "linear-gradient(135deg, #f3f0ff, #fdf4ff)", borderRadius: 14, padding: "1rem 1.2rem", marginBottom: 12, border: "1px solid #e0d9ff" }}>
                  <p style={{ fontSize: "0.9rem", color: "#4f46e5", fontWeight: 600, marginBottom: 4 }}>👋 Hello! I'm MomCare AI</p>
                  <p style={{ fontSize: "0.83rem", color: "#6b7280", lineHeight: 1.5 }}>
                    I can analyse Mom's sugar, blood pressure, thyroid, and insulin data. Ask me anything or tap a quick question below.
                  </p>
                </div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Quick questions</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      style={{
                        background: "white", border: "1.5px solid #e5e7eb", borderRadius: 10,
                        padding: "8px 14px", textAlign: "left", cursor: "pointer",
                        fontSize: "0.83rem", color: "#374151", fontFamily: "var(--font-body)",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.color = "#7c3aed"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}
                    >
                      💬 {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%",
                  background: m.role === "user"
                    ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                    : "#f9f9ff",
                  color: m.role === "user" ? "white" : "#1a1a2e",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "10px 14px",
                  border: m.role === "ai" ? "1px solid #e0d9ff" : "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}>
                  {m.role === "user"
                    ? <p style={{ fontSize: "0.87rem", lineHeight: 1.5, margin: 0 }}>{m.text}</p>
                    : <div>{renderText(m.text)}</div>
                  }
                </div>
              </div>
            ))}

            {/* Loading bubble */}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: "#f3f0ff", borderRadius: "18px 18px 18px 4px", padding: "12px 18px", border: "1px solid #e0d9ff" }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: "50%", background: "#7c3aed",
                        animation: "bounce 1.2s infinite",
                        animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                    <span style={{ fontSize: "0.78rem", color: "#7c3aed", marginLeft: 6 }}>Analysing health data…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatContainerRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: "0.8rem 1.2rem", borderTop: "1px solid #f3f0ff", display: "flex", gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask about Mom's health… e.g. 'Is her sugar improving?'"
              disabled={loading}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12,
                border: "1.5px solid #e0d9ff", fontSize: "0.88rem",
                fontFamily: "var(--font-body)", color: "#1a1a2e",
                outline: "none", background: loading ? "#fafafa" : "white",
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? "#e5e7eb" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: loading || !input.trim() ? "#9ca3af" : "white",
                border: "none", borderRadius: 12, padding: "10px 18px",
                fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.9rem",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              ➤
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{ padding: "0.5rem 1.2rem 0.8rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.68rem", color: "#9ca3af" }}>
              ⚕️ AI insights are for informational purposes only. Always consult a doctor for medical decisions.
            </p>
          </div>
        </div>
      )}

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}