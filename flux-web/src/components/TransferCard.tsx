import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, CheckCircle } from "lucide-react";
import type { TransferProgress } from "../hooks/useFileTransfer";

interface Props {
  progress: TransferProgress;
  sendFile: (file: File) => void;
  formatBytes: (bytes: number) => string;
}

export function TransferCard({ progress, sendFile, formatBytes }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSending   = progress.status === "sending";
  const isReceiving = progress.status === "receiving";
  const isComplete  = progress.status === "complete";
  const isActive    = isSending || isReceiving;

  const progressColor = isComplete
    ? "#00ff88"
    : isSending
    ? "#6c63ff"
    : "#89CFF0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
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
      {/* Title */}
      <p style={{
        fontSize: "11px",
        fontWeight: "600",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "2px",
      }}>
        Transfer
      </p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) sendFile(file);
        }}
      />

      {/* Drop zone button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => fileInputRef.current?.click()}
        disabled={isActive}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "2px dashed rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          cursor: isActive ? "not-allowed" : "pointer",
          opacity: isActive ? 0.4 : 1,
          transition: "all 0.2s",
          width: "100%",
        }}
      >
        <motion.div
          animate={{ y: isActive ? 0 : [0, -4, 0] }}
          transition={{ repeat: isActive ? 0 : Infinity, duration: 2 }}
        >
          <Upload style={{ width: "32px", height: "32px", color: "#6b7280" }} />
        </motion.div>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Click to select a file to send
        </p>
        <p style={{ fontSize: "12px", color: "#374151" }}>
          Any file type · No size limit
        </p>
      </motion.button>

      {/* Progress */}
      <AnimatePresence>
        {progress.status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {/* File info row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(108,99,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {isComplete ? (
                  <CheckCircle style={{ width: "16px", height: "16px", color: "#00ff88" }} />
                ) : isSending ? (
                  <Upload style={{ width: "16px", height: "16px", color: "#6c63ff" }} />
                ) : (
                  <Download style={{ width: "16px", height: "16px", color: "#89CFF0" }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#e8e8f0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {progress.fileName}
                </p>
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                  {formatBytes(progress.transferred)} of {formatBytes(progress.fileSize)}
                </p>
              </div>

              <span style={{
                fontSize: "14px",
                fontWeight: "700",
                color: progressColor,
                flexShrink: 0,
              }}>
                {progress.percentage}%
              </span>
            </div>

            {/* Progress bar */}
            <div style={{
              width: "100%",
              height: "4px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "999px",
              overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ ease: "easeOut", duration: 0.2 }}
                style={{
                  height: "100%",
                  borderRadius: "999px",
                  background: isComplete
                    ? "#00ff88"
                    : "linear-gradient(90deg, #6c63ff, #89CFF0)",
                  boxShadow: `0 0 10px ${progressColor}66`,
                }}
              />
            </div>

            {/* Status text */}
            <p style={{
              fontSize: "12px",
              textAlign: "center",
              color: progressColor,
            }}>
              {progress.status === "complete"
                ? "Transfer complete"
                : progress.status === "resuming"
                ? "Resuming transfer..."
                : progress.status === "sending"
                ? "Sending..."
                : "Receiving..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}