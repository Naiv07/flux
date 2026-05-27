import { useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Pause,
  Play,
  X,
} from "@phosphor-icons/react";
import type { TransferProgress } from "../hooks/useFileTransfer";

interface Props {
  progress: TransferProgress;
  sendFile: (file: File) => void;
  formatBytes: (bytes: number) => string;
  pauseTransfer: () => void;
  resumeTransfer: () => void;
  cancelTransfer: () => void;
}

export function TransferCard({
  progress,
  sendFile,
  formatBytes,
  pauseTransfer,
  resumeTransfer,
  cancelTransfer,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSending   = progress.status === "sending";
  const isReceiving = progress.status === "receiving";
  const isPaused    = progress.status === "paused";
  const isComplete  = progress.status === "complete";
  const isCancelled = progress.status === "cancelled";
  const isActive    = isSending || isReceiving || isPaused;

  const progressColor = isComplete
    ? "#00ff88"
    : isCancelled
    ? "#ff6b6b"
    : isPaused
    ? "#fbbf24"
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
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        minHeight: "240px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <p style={{
        fontSize: "11px",
        fontWeight: "600",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "2px",
      }}>
        Transfer
      </p>

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) sendFile(file);
        }}
      />

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
          width: "100%",
        }}
      >
        <motion.div
          animate={{ y: isActive ? 0 : [0, -4, 0] }}
          transition={{ repeat: isActive ? 0 : Infinity, duration: 2 }}
        >
          <ArrowUp size={32} weight="bold" color="#6b7280" />
        </motion.div>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Click to select a file to send
        </p>
        <p style={{ fontSize: "12px", color: "#374151" }}>
          Any file type · No size limit
        </p>
      </motion.button>

      {/* Progress section — always rendered to prevent layout shift */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        opacity: progress.status === "idle" ? 0 : 1,
        transition: "opacity 0.3s ease",
        visibility: progress.status === "idle" ? "hidden" : "visible",
        minHeight: "160px",
      }}>
        {/* File info */}
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
              <CheckCircle size={16} weight="bold" color="#00ff88" />
            ) : isCancelled ? (
              <X size={16} weight="bold" color="#ff6b6b" />
            ) : isSending ? (
              <ArrowUp size={16} weight="bold" color="#6c63ff" />
            ) : (
              <ArrowDown size={16} weight="bold" color="#89CFF0" />
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
              {progress.fileName || "—"}
            </p>
            <p style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {formatBytes(progress.transferred)} of {formatBytes(progress.fileSize)}
            </p>
          </div>

          <span style={{
            fontSize: "14px",
            fontWeight: "700",
            color: progressColor,
            flexShrink: 0,
            minWidth: "3.5ch",
            textAlign: "right",
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
            animate={{ scaleX: progress.percentage / 100 }}
            transition={{ ease: "easeOut", duration: 0.2 }}
            style={{
              height: "100%",
              width: "100%",
              borderRadius: "999px",
              transformOrigin: "left",
              background: isComplete
                ? "#00ff88"
                : isCancelled
                ? "#ff6b6b"
                : isPaused
                ? "#fbbf24"
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
          {isComplete ? "Transfer complete"
            : isCancelled ? "Transfer cancelled"
            : isPaused ? "Paused"
            : isSending ? "Sending..."
            : isReceiving ? "Receiving..."
            : ""}
        </p>

        {/* Pause / Resume / Cancel — only when active */}
        <div style={{
          display: "flex",
          gap: "8px",
          opacity: isActive ? 1 : 0,
          pointerEvents: isActive ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}>
          {/* Single stable button — never unmounts, avoids Android tap-miss on remount */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={isPaused ? resumeTransfer : pauseTransfer}
            style={{
              flex: 1,
              background: isPaused ? "rgba(108,99,255,0.15)" : "rgba(251,191,36,0.1)",
              border: `1px solid ${isPaused ? "rgba(108,99,255,0.3)" : "rgba(251,191,36,0.3)"}`,
              borderRadius: "10px",
              padding: "10px",
              fontSize: "13px",
              fontWeight: "600",
              color: isPaused ? "#6c63ff" : "#fbbf24",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              touchAction: "manipulation",
            }}
          >
            {isPaused ? <Play size={14} weight="bold" /> : <Pause size={14} weight="bold" />}
            {isPaused ? "Resume" : "Pause"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={cancelTransfer}
            style={{
              flex: 1,
              background: "rgba(255,59,59,0.1)",
              border: "1px solid rgba(255,59,59,0.2)",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#ff6b6b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              touchAction: "manipulation",
            }}
          >
            <X size={14} weight="bold" />
            Cancel
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}