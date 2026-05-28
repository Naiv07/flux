import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "@phosphor-icons/react";

interface Props {
  setMode: (mode: "send" | "receive") => void;
}

export function ModeSelectCard({ setMode }: Props) {
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

      </div>
    </motion.div>
  );
}