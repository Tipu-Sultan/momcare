'use client';

const HeartLoader = () => {
  return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center", 
        background: "#fff5f6", 
        gap: "1rem" 
      }}>
        {/* CSS Keyframes Injection for smooth heartbeat */}
        <style>{`
          @keyframes heartbeat {
            0% { transform: scale(1); }
            14% { transform: scale(1.2); }
            28% { transform: scale(1); }
            42% { transform: scale(1.2); }
            70% { transform: scale(1); }
          }
        `}</style>
        
        {/* Pulsing Heart Icon */}
        <div style={{ 
          fontSize: "3.5rem", 
          animation: "heartbeat 1.4s infinite ease-in-out",
          filter: "drop-shadow(0 4px 6px rgba(232, 86, 106, 0.2))"
        }}>
          ❤️
        </div>
        
        {/* Subtitle text */}
        <div style={{ 
          fontFamily: "var(--font-body)", 
          fontSize: "0.9rem", 
          fontWeight: 500, 
          color: "#e8566a",
          letterSpacing: "0.5px",
          opacity: 0.8
        }}>
          Syncing Health Dashboard...
        </div>
      </div>
    );
}

export default HeartLoader