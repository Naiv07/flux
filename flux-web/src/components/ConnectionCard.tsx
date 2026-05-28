import { useState } from "react";
import { motion } from "framer-motion";
import { WifiHigh, WifiSlash, Spinner, ArrowLeft, QrCode } from "@phosphor-icons/react";
import type { ConnectionState } from "../types";
import { QRModal } from "./QRModal";


interface Props {
  connectionState: ConnectionState;
  roomCode: string;
  setRoomCode: (code: string) => void;
  connect: (code: string) => void;
  disconnect: () => void;
  mode: "send" | "receive";
  goBack: () => void;
  connectionStatus?: string;
}

export function ConnectionCard({
  connectionState,
  roomCode,
  setRoomCode,
  connect,
  disconnect,
  mode,
  goBack,
  connectionStatus,
}: Props) {
  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";
  const [showQR, setShowQR] = useState(false);

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
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        alignSelf: "start",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        boxShadow: "0 0 40px rgba(108,99,255,0.15)",
      }}
    >
      {/* Header */}
      {/* Header with back button */}
<div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
  {!isConnected && (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={goBack}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
        padding: "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <ArrowLeft size={18} weight="bold" color="#6b7280" />
    </motion.button>
  )}

  <div style={{ flex: 1 }}>
    <h1 style={{
      fontSize: "28px",
      fontWeight: "700",
      background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    }}>
      Flux
    </h1>
    <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
      No cloud. Just connection.
    </p>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "12px",
            padding: "4px 10px",
            background: mode === "send"
              ? "rgba(108,99,255,0.15)"
              : "rgba(137,207,240,0.15)",
            border: `1px solid ${mode === "send" ? "rgba(108,99,255,0.3)" : "rgba(137,207,240,0.3)"}`,
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: "600",
            color: mode === "send" ? "#6c63ff" : "#89CFF0",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}>
            {mode === "send" ? "Sending" : "Receiving"}
          </div>
        </div>

        <motion.div
          animate={{ scale: isConnected ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: isConnected ? Infinity : 0, duration: 2 }}
          style={{ flexShrink: 0 }}
        >
          {isConnected ? (
            <WifiHigh size={22} weight="bold" color="#00ff88" />
          ) : isConnecting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Spinner size={22} weight="bold" color="#6c63ff" />
            </motion.div>
          ) : (
            <WifiSlash size={22} weight="bold" color="#374151" />
          )}
        </motion.div>
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <motion.div
          animate={{
            backgroundColor: isConnected ? "#00ff88" : isConnecting ? "#6c63ff" : "#374151",
            scale: isConnected ? [1, 1.3, 1] : 1,
          }}
          transition={{ repeat: isConnected ? Infinity : 0, duration: 1.5 }}
          style={{ width: "8px", height: "8px", borderRadius: "50%" }}
        />
        <span style={{
          fontSize: "13px",
          textTransform: "capitalize",
          color: isConnected ? "#00ff88" : isConnecting ? "#6c63ff" : "#6b7280",
        }}>
          {connectionState}
        </span>
      </div>
      {connectionStatus && (
        <p style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", width: "100%" }}>
          {connectionStatus}
        </p>
      )}

      {/* Input */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          {mode === "send" ? (
            <>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                  Share this code with the receiver
                </p>
                <div style={{
                  background: "rgba(108,99,255,0.08)",
                  border: "1px solid rgba(108,99,255,0.2)",
                  borderRadius: "16px",
                  padding: "20px",
                  fontSize: "32px",
                  fontWeight: "700",
                  letterSpacing: "8px",
                  color: "#6c63ff",
                  fontFamily: "monospace",
                  textAlign: "center",
                }}>
                  {roomCode}
                </div>

                <div style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "12px",
                }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigator.clipboard.writeText(roomCode)}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#e8e8f0",
                      cursor: "pointer",
                    }}
                  >
                    Copy Code
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowQR(true)}
                    style={{
                      flex: 1,
                      background: "rgba(108,99,255,0.1)",
                      border: "1px solid rgba(108,99,255,0.25)",
                      borderRadius: "10px",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6c63ff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <QrCode size={14} weight="bold" />
                    QR Code
                  </motion.button>
                </div>

                {/* Share Link button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const url = `${window.location.origin}?code=${roomCode}`;
                    navigator.share
                      ? navigator.share({ title: "Flux", text: "Join my Flux session", url })
                      : navigator.clipboard.writeText(url);
                  }}
                  style={{
                    background: "rgba(0,212,255,0.08)",
                    border: "1px solid rgba(0,212,255,0.2)",
                    borderRadius: "10px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#00d4ff",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Share Link
                </motion.button>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Enter 6-character code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && connect(roomCode)}
                maxLength={6}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "16px",
                  fontSize: "20px",
                  fontWeight: "600",
                  letterSpacing: "6px",
                  color: "#e8e8f0",
                  outline: "none",
                  width: "100%",
                  textAlign: "center",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                }}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => connect(roomCode)}
                disabled={roomCode.length !== 6 || isConnecting}
                style={{
                  background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  cursor: "pointer",
                  width: "100%",
                  opacity: roomCode.length !== 6 || isConnecting ? 0.4 : 1,
                }}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </motion.button>
            </>
          )}
        </motion.div>
      )}

      {showQR && (
        <QRModal
          roomCode={roomCode}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* Connected */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            gap: "12px",
          }}
        >
          <div style={{ textAlign: "center", width: "100%", boxSizing: "border-box" }}>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>
              Connected to room
            </p>
            <p style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#6c63ff",
              marginTop: "4px",
            }}>
              {roomCode}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={disconnect}
            style={{
              background: "rgba(255,59,59,0.1)",
              border: "1px solid rgba(255,59,59,0.2)",
              borderRadius: "12px",
              padding: "10px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#ff6b6b",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Disconnect
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}