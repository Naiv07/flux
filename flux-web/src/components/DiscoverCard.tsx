import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onConnect: (code: string) => void;
  signalingUrl: string;
}

export function DiscoverCard({ onConnect, signalingUrl }: Props) {
  const [rooms, setRooms] = useState<{ code: string; age: number }[]>([]);
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(() => {
    setScanning(true);
    setRooms([]);

    const ws = new WebSocket(signalingUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "discover" }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "available-rooms") {
        setRooms(msg.rooms || []);
        setScanning(false);
        ws.close();
      }
    };
    ws.onerror = () => setScanning(false);

    setTimeout(() => {
      setScanning(false);
      ws.close();
    }, 5000);
  }, [signalingUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(15,15,40,0.8)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "20px",
        padding: "20px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <p style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "2px",
        }}>
          Nearby Devices
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={scan}
          style={{
            background: "rgba(108,99,255,0.15)",
            border: "1px solid rgba(108,99,255,0.3)",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#6c63ff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <motion.div
            animate={{ rotate: scanning ? 360 : 0 }}
            transition={{ repeat: scanning ? Infinity : 0, duration: 1, ease: "linear" }}
          >
            🔍
          </motion.div>
          {scanning ? "Scanning..." : "Scan"}
        </motion.button>
      </div>

      <AnimatePresence>
        {rooms.length === 0 && !scanning && (
          <p style={{ fontSize: "12px", color: "#4b5563", textAlign: "center", padding: "12px 0" }}>
            Tap scan to find nearby devices
          </p>
        )}

        {rooms.map((room) => (
          <motion.button
            key={room.code}
            onClick={() => onConnect(room.code)}
            style={{
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.2)",
              borderRadius: "12px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#00ff88",
                boxShadow: "0 0 6px #00ff88",
              }} />
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#e8e8f0" }}>
                Device ready
              </span>
            </div>
            <span style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#00d4ff",
              fontFamily: "monospace",
              letterSpacing: "2px",
            }}>
              {room.code}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}