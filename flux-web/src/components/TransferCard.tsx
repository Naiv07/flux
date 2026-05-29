import { useRef, useEffect, useState } from "react";
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
  const directionRef = useRef<"send" | "receive">("send");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCancelClick = () => {
    if (confirmCancel) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
      setConfirmCancel(false);
      cancelTransfer();
    } else {
      setConfirmCancel(true);
      confirmTimerRef.current = setTimeout(() => {
        setConfirmCancel(false);
        confirmTimerRef.current = null;
      }, 3000);
    }
  };

  const formatSpeed = (bps: number): string => {
    if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bps >= 1024) return `${Math.round(bps / 1024)} KB/s`;
    return `${Math.round(bps)} B/s`;
  };

  const formatEta = (secs: number): string => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60), s = secs % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const isSending   = progress.status === "sending";
  const isReceiving = progress.status === "receiving";
  const isPaused    = progress.status === "paused";

  // Track last known direction so icon stays correct while paused
  useEffect(() => {
    if (isSending) directionRef.current = "send";
    if (isReceiving) directionRef.current = "receive";
  }, [isSending, isReceiving]);

  const isComplete  = progress.status === "complete";
  const isCancelled = progress.status === "cancelled";
  const isActive    = isSending || isReceiving || isPaused;

  // Clear confirm state when transfer ends
  useEffect(() => {
    if (isComplete || isCancelled) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmCancel(false);
    }
  }, [isComplete, isCancelled]);

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
            ) : directionRef.current === "receive" ? (
              <ArrowDown size={16} weight="bold" color="#89CFF0" />
            ) : (
              <ArrowUp size={16} weight="bold" color="#6c63ff" />
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
            initial={{ scaleX: 0 }}
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
          {isComplete
            ? "Transfer complete ✓"
            : isCancelled
            ? "Transfer cancelled"
            : isPaused
            ? progress.pausedBy === "remote"
              ? "Paused by other device — waiting..."
              : "Paused by you — tap Resume to continue"
            : (isSending || isReceiving)
            ? [
                isSending ? "Sending..." : "Receiving...",
                progress.speed ? formatSpeed(progress.speed) : null,
                progress.eta ? `${formatEta(progress.eta)} left` : null,
              ].filter(Boolean).join(" · ")
            : ""}
        </p>

        {/* Controls — show for both sender and receiver while transfer active */}
        <div style={{
          display: "flex",
          gap: "8px",
          opacity: (isSending || isReceiving || isPaused) ? 1 : 0,
          pointerEvents: (isSending || isReceiving || isPaused) ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}>
          {isPaused ? (
            <button
              onClick={resumeTransfer}
              style={{
                flex: 1,
                background: "rgba(108,99,255,0.15)",
                border: "1px solid rgba(108,99,255,0.3)",
                borderRadius: "10px",
                padding: "10px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#6c63ff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                touchAction: "manipulation",
              }}
            >
              <Play size={14} weight="bold" />
              Resume
            </button>
          ) : (
            <button
              onClick={pauseTransfer}
              style={{
                flex: 1,
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: "10px",
                padding: "10px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#fbbf24",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                touchAction: "manipulation",
              }}
            >
              <Pause size={14} weight="bold" />
              Pause
            </button>
          )}

          <button
            onClick={handleCancelClick}
            style={{
              flex: 1,
              background: confirmCancel ? "rgba(255,59,59,0.25)" : "rgba(255,59,59,0.1)",
              border: `1px solid ${confirmCancel ? "rgba(255,59,59,0.5)" : "rgba(255,59,59,0.2)"}`,
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
              transition: "all 0.15s ease",
            }}
          >
            <X size={14} weight="bold" />
            {confirmCancel ? "Confirm?" : "Cancel"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}