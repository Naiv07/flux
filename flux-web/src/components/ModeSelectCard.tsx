import { ArrowUp, ArrowDown, Lightning } from "@phosphor-icons/react";

interface Props {
  setMode: (mode: "send" | "receive") => void;
}

export function ModeSelectCard({ setMode }: Props) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        animation: "msCardIn 0.4s ease both",
      }}
    >
      <style>{`
        @keyframes msCardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ms-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          width: 100%;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }
        .ms-btn:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-1px);
        }
        .ms-btn:active { transform: scale(0.98); }
      `}</style>

      {/* Brand header */}
      <div style={{ paddingLeft: "4px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
        }}>
          <Lightning size={22} weight="fill" color="#6c63ff" />
          <span style={{
            fontSize: "26px",
            fontWeight: "800",
            background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.5px",
          }}>
            Flux
          </span>
        </div>
        <p style={{ fontSize: "14px", color: "#4b5563" }}>
          Direct device-to-device file transfer
        </p>
      </div>

      {/* Role buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button className="ms-btn" onClick={() => setMode("send")}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 6px 20px rgba(108,99,255,0.35)",
          }}>
            <ArrowUp size={24} weight="bold" color="white" />
          </div>
          <div>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "#f0f0f8" }}>
              Send Files
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "3px" }}>
              Share files to a nearby device
            </p>
          </div>
        </button>

        <button className="ms-btn" onClick={() => setMode("receive")}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #00d4ff, #0099cc)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 6px 20px rgba(0,212,255,0.3)",
          }}>
            <ArrowDown size={24} weight="bold" color="white" />
          </div>
          <div>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "#f0f0f8" }}>
              Receive Files
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "3px" }}>
              Scan QR or enter a room code
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
