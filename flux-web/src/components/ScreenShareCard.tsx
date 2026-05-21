import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Monitor, MonitorPlay } from "@phosphor-icons/react";

interface Props {
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  remoteStream: MediaStream | null;
}

export function ScreenShareCard({
  startScreenShare,
  stopScreenShare,
  remoteStream,
}: Props) {
  const [isSharing, setIsSharing] = useState(false);
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Show remote stream when received
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleStart = async () => {
    const stream = await startScreenShare();
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      setIsSharing(true);
    }
  };

  const handleStop = () => {
    stopScreenShare();
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setIsSharing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
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
        Screen Share
      </p>

      {/* Remote stream — what other peer is sharing */}
      {remoteStream && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(137,207,240,0.3)",
            boxShadow: "0 0 20px rgba(137,207,240,0.1)",
          }}
        >
          <p style={{
            fontSize: "11px",
            color: "#89CFF0",
            padding: "8px 12px",
            background: "rgba(137,207,240,0.05)",
          }}>
            Receiving screen
          </p>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", display: "block", maxHeight: "200px", objectFit: "contain" }}
          />
        </motion.div>
      )}

      {/* Local preview */}
      {isSharing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(108,99,255,0.3)",
          }}
        >
          <p style={{
            fontSize: "11px",
            color: "#6c63ff",
            padding: "8px 12px",
            background: "rgba(108,99,255,0.05)",
          }}>
            Your screen
          </p>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", display: "block", maxHeight: "200px", objectFit: "contain" }}
          />
        </motion.div>
      )}

      {/* Start / Stop button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={isSharing ? handleStop : handleStart}
        style={{
          background: isSharing
            ? "rgba(255,59,59,0.1)"
            : "rgba(108,99,255,0.15)",
          border: isSharing
            ? "1px solid rgba(255,59,59,0.2)"
            : "1px solid rgba(108,99,255,0.3)",
          borderRadius: "12px",
          padding: "12px",
          fontSize: "14px",
          fontWeight: "600",
          color: isSharing ? "#ff6b6b" : "#6c63ff",
          cursor: "pointer",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {isSharing ? (
          <>
            <MonitorPlay size={16} weight="bold" />
            Stop Sharing
          </>
        ) : (
          <>
            <Monitor size={16} weight="bold" />
            Share Screen
          </>
        )}
      </motion.button>
    </motion.div>
  );
}