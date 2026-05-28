import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiX } from "@phosphor-icons/react";

interface Props {
  onOfflineModeClick: () => void;
}

export function OfflineBanner({ onOfflineModeClick }: Props) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            background: "rgba(108,99,255,0.08)",
            border: "1px solid rgba(108,99,255,0.2)",
            borderRadius: "16px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            gap: "12px",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <WifiX size={16} weight="bold" color="#6c63ff" />
            <div>
              <p style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#e8e8f0",
              }}>
                You're offline
              </p>
              <p style={{
                fontSize: "11px",
                color: "#6b7280",
              }}>
                Use offline mode for local transfers
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onOfflineModeClick}
            style={{
              background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
              border: "none",
              borderRadius: "10px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "700",
              color: "white",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Use Offline
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}