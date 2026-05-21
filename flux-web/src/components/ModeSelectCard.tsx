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
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "32px",
        width: "100%",
        maxWidth: "448px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div>
        <h2 style={{
          fontSize: "20px",
          fontWeight: "700",
          color: "#e8e8f0",
          marginBottom: "4px",
        }}>
          What would you like to do?
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Choose your role to begin
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Send button */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMode("send")}
          style={{
            background: "rgba(108,99,255,0.1)",
            border: "1px solid rgba(108,99,255,0.25)",
            borderRadius: "16px",
            padding: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textAlign: "left",
            transition: "all 0.2s",
          }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <ArrowUp size={24} weight="bold" color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "#e8e8f0",
            }}>
              Send Files
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
              Share files or stream your screen
            </p>
          </div>
        </motion.button>

        {/* Receive button */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMode("receive")}
          style={{
            background: "rgba(137,207,240,0.08)",
            border: "1px solid rgba(137,207,240,0.25)",
            borderRadius: "16px",
            padding: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textAlign: "left",
            transition: "all 0.2s",
          }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #89CFF0, #00d4ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <ArrowDown size={24} weight="bold" color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "#e8e8f0",
            }}>
              Receive Files
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
              Get files from another device
            </p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}