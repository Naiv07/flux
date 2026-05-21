import { motion } from "framer-motion";
import { WifiHigh, WifiSlash, Spinner } from "@phosphor-icons/react";
import type { ConnectionState } from "../types";

interface Props {
  connectionState: ConnectionState;
  roomCode: string;
  setRoomCode: (code: string) => void;
  connect: (code: string) => void;
  disconnect: () => void;
}

interface Props {
  connectionState: ConnectionState;
  roomCode: string;
  setRoomCode: (code: string) => void;
  connect: (code: string) => void;
}

export function ConnectionCard({
  connectionState,
  roomCode,
  setRoomCode,
  connect,
  disconnect,
}: Props) {
  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";

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
        gap: "24px",
        boxShadow: "0 0 40px rgba(108,99,255,0.15)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
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
        </div>

        <motion.div
          animate={{ scale: isConnected ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: isConnected ? Infinity : 0, duration: 2 }}
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

      {/* Input */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <input
            type="text"
            placeholder="Enter room code e.g. flux123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect(roomCode)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              color: "#e8e8f0",
              outline: "none",
              width: "100%",
            }}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => connect(roomCode)}
            disabled={!roomCode || isConnecting}
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
              opacity: !roomCode || isConnecting ? 0.4 : 1,
            }}
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </motion.button>
        </motion.div>
      )}

      {/* Connected */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div style={{ textAlign: "center" }}>
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