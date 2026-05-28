import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, WifiX } from "@phosphor-icons/react";

interface Props {
  setMode: (mode: "send" | "receive") => void;
  onOfflineMode: () => void;
}

export function ModeSelectCard({ setMode, onOfflineMode }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: "rgba(15,15,40,0.8)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "28px",
        padding: "32px 24px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div>
        <h2 style={{
          fontSize: "28px",
          fontWeight: "800",
          color: "#ffffff",
          lineHeight: "1.2",
          marginBottom: "8px",
        }}>
          What would you like to do?
        </h2>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Choose your role to begin
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setMode("send")}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "18px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textAlign: "left",
          }}
        >
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #4f8ef7, #00d4ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 15px rgba(79,142,247,0.4)",
          }}>
            <ArrowUp size={26} weight="bold" color="white" />
          </div>
          <div>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff" }}>
              Send Files
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "3px" }}>
              Share files or stream your screen
            </p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setMode("receive")}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "18px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textAlign: "left",
          }}
        >
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #00d4ff, #0099cc)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 15px rgba(0,212,255,0.4)",
          }}>
            <ArrowDown size={26} weight="bold" color="white" />
          </div>
          <div>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff" }}>
              Receive Files
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "3px" }}>
              Get files from another device
            </p>
          </div>
        </motion.button>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
          <p style={{ fontSize: "11px", color: "#374151" }}>or</p>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Offline Mode */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOfflineMode}
          style={{
            background: "rgba(108,99,255,0.06)",
            border: "1px solid rgba(108,99,255,0.15)",
            borderRadius: "20px",
            padding: "14px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            textAlign: "left",
            width: "100%",
          }}
        >
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "14px",
            background: "rgba(108,99,255,0.12)",
            border: "1px solid rgba(108,99,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <WifiX size={22} weight="bold" color="#6c63ff" />
          </div>
          <div>
            <p style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#9ca3af",
            }}>
              Offline Mode
            </p>
            <p style={{
              fontSize: "12px",
              color: "#4b5563",
              marginTop: "2px",
            }}>
              Transfer via hotspot, no internet needed
            </p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}