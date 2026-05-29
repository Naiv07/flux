import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Copy, Check, ShareNetwork, QrCode,
  WifiHigh, Spinner,
} from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import type { ConnectionState } from "../types";
import { QRScanner } from "./QRScanner";

interface Props {
  connectionState: ConnectionState;
  roomCode: string;
  setRoomCode: (code: string) => void;
  connect: (code: string) => void;
  disconnect: () => void;
  mode: "send" | "receive";
  goBack: () => void;
  connectionStatus?: string;
  signalingUrl?: string;
}

type ReceiveTab = "code" | "scan" | "nearby";

// ── Nearby tab (extracted to avoid hook rules issues) ──────────────────────
function NearbyTab({ signalingUrl, onConnect }: {
  signalingUrl: string;
  onConnect: (code: string) => void;
}) {
  const [rooms, setRooms] = useState<{ code: string }[]>([]);
  const [scanning, setScanning] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scan = useCallback(() => {
    wsRef.current?.close();
    if (timerRef.current) clearTimeout(timerRef.current);
    setScanning(true);
    setRooms([]);
    const ws = new WebSocket(signalingUrl);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "discover" }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "available-rooms") {
        setRooms(msg.rooms || []);
        setScanning(false);
        ws.close();
        wsRef.current = null;
      }
    };
    ws.onerror = () => { setScanning(false); ws.close(); wsRef.current = null; };
    timerRef.current = setTimeout(() => {
      setScanning(false);
      ws.close();
      wsRef.current = null;
    }, 5000);
  }, [signalingUrl]);

  useEffect(() => {
    scan();
    return () => {
      wsRef.current?.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scan]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {scanning && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
          <div style={{
            width: "16px", height: "16px",
            border: "2px solid rgba(108,99,255,0.2)",
            borderTop: "2px solid #6c63ff",
            borderRadius: "50%",
            animation: "ccSpin 0.8s linear infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "13px", color: "#6b7280" }}>Scanning nearby devices...</span>
        </div>
      )}
      {!scanning && rooms.length === 0 && (
        <p style={{ fontSize: "13px", color: "#4b5563", textAlign: "center", padding: "16px 0" }}>
          No devices found nearby
        </p>
      )}
      {rooms.map((room) => (
        <button
          key={room.code}
          onClick={() => onConnect(room.code)}
          style={{
            background: "rgba(0,212,255,0.07)",
            border: "1px solid rgba(0,212,255,0.18)",
            borderRadius: "14px",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#00ff88", boxShadow: "0 0 6px #00ff88",
            }} />
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#e8e8f0" }}>Device ready</span>
          </div>
          <span style={{
            fontSize: "13px", fontWeight: "700", color: "#00d4ff",
            fontFamily: "monospace", letterSpacing: "2px",
          }}>
            {room.code}
          </span>
        </button>
      ))}
      {!scanning && (
        <button
          onClick={scan}
          style={{
            background: "rgba(108,99,255,0.1)",
            border: "1px solid rgba(108,99,255,0.2)",
            borderRadius: "12px",
            padding: "10px",
            fontSize: "13px",
            fontWeight: "600",
            color: "#6c63ff",
            cursor: "pointer",
            marginTop: "4px",
          }}
        >
          Scan Again
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function ConnectionCard({
  connectionState,
  roomCode,
  setRoomCode,
  connect,
  disconnect,
  mode,
  goBack,
  connectionStatus,
  signalingUrl = "",
}: Props) {
  const isConnected  = connectionState === "connected";
  const isConnecting = connectionState === "connecting";

  // Send mode state
  const [copied, setCopied] = useState(false);

  // Receive mode state
  const [receiveTab, setReceiveTab] = useState<ReceiveTab>("code");
  const [chars, setChars] = useState(["", "", "", "", "", ""]);
  const [showScanner, setShowScanner] = useState(false);
  const charRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);

  const url = `${window.location.origin}?code=${roomCode}`;

  const peerJoined =
    isConnecting &&
    connectionStatus !== "" &&
    connectionStatus !== "Waiting for peer..." &&
    connectionStatus !== "Connecting...";

  // ── Send helpers ──────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Join my Flux session", text: `Use code ${roomCode}`, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  // ── Receive helpers (segmented PIN) ───────────────────────────────────────
  const handleCharInput = (i: number, value: string) => {
    const char = value.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    const next = [...chars];
    next[i] = char;
    setChars(next);
    const code = next.join("");
    setRoomCode(code);
    if (char && i < 5) {
      charRefs.current[i + 1]?.focus();
    }
    if (next.every(Boolean)) {
      connect(next.join(""));
    }
  };

  const handleCharKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (chars[i]) {
        const next = [...chars];
        next[i] = "";
        setChars(next);
        setRoomCode(next.join(""));
      } else if (i > 0) {
        const next = [...chars];
        next[i - 1] = "";
        setChars(next);
        setRoomCode(next.join(""));
        charRefs.current[i - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      charRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      charRefs.current[i + 1]?.focus();
    } else if (e.key === "Enter" && chars.every(Boolean)) {
      connect(chars.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setChars(next);
    setRoomCode(next.join(""));
    const focusIdx = Math.min(pasted.length, 5);
    charRefs.current[focusIdx]?.focus();
    if (next.every(Boolean)) {
      connect(next.join(""));
    }
  };

  // ── Status indicator (top-right) ──────────────────────────────────────────
  const statusDot = isConnected
    ? { color: "#00ff88", label: "Connected" }
    : isConnecting
    ? { color: "#6c63ff", label: peerJoined ? "Connecting..." : "Waiting..." }
    : { color: "#374151", label: "Idle" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "24px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        boxShadow: "0 0 40px rgba(108,99,255,0.12)",
      }}
    >
      <style>{`
        @keyframes ccSpin { to { transform: rotate(360deg); } }
        .pin-box {
          width: 44px;
          height: 54px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          font-family: monospace;
          color: #e8e8f0;
          outline: none;
          caret-color: #6c63ff;
          transition: border-color 0.15s ease, background 0.15s ease;
          -webkit-appearance: none;
        }
        .pin-box:focus {
          border-color: #6c63ff;
          background: rgba(108,99,255,0.08);
        }
        .pin-box.filled {
          border-color: rgba(108,99,255,0.4);
        }
        .rx-tab {
          flex: 1;
          background: none;
          border: none;
          padding: 8px 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.15s ease;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
        }
        .rx-tab.active {
          color: #6c63ff;
          border-bottom-color: #6c63ff;
        }
        .rx-tab.inactive { color: #4b5563; }
        .rx-tab.inactive:hover { color: #6b7280; }
      `}</style>

      {/* ── Top bar: back + status ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {!isConnected ? (
          <button
            onClick={goBack}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "8px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#9ca3af",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            <ArrowLeft size={14} weight="bold" />
            Back
          </button>
        ) : (
          <div />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isConnecting && !peerJoined ? (
            <div style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: "#6c63ff",
              boxShadow: "0 0 6px #6c63ff",
            }} />
          ) : isConnecting && peerJoined ? (
            <div style={{
              width: "14px", height: "14px",
              border: "2px solid rgba(108,99,255,0.2)",
              borderTop: "2px solid #6c63ff",
              borderRadius: "50%",
              animation: "ccSpin 0.8s linear infinite",
            }} />
          ) : isConnected ? (
            <WifiHigh size={14} weight="bold" color="#00ff88" />
          ) : null}
          <span style={{ fontSize: "12px", fontWeight: "600", color: statusDot.color }}>
            {statusDot.label}
          </span>
        </div>
      </div>

      {/* ── Send mode (not connected) ── */}
      {!isConnected && mode === "send" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
          <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
            Show this to the receiver to connect
          </p>

          {/* QR code */}
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: "-10px", borderRadius: "26px",
              background: "radial-gradient(ellipse, rgba(108,99,255,0.2) 0%, rgba(0,212,255,0.07) 60%, transparent 100%)",
              filter: "blur(16px)",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "20px",
              border: "1px solid rgba(108,99,255,0.22)",
            }} />
            <div style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "14px",
              position: "relative",
              opacity: peerJoined ? 0.3 : 1,
              transition: "opacity 0.4s ease",
            }}>
              <QRCodeSVG
                value={url}
                size={220}
                bgColor="#ffffff"
                fgColor="#06061a"
                level="M"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.svg",
                  x: undefined, y: undefined,
                  height: 30, width: 30,
                  excavate: true,
                }}
              />
            </div>
            {peerJoined && (
              <div style={{
                position: "absolute", inset: "14px",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "10px",
                borderRadius: "12px",
              }}>
                <div style={{
                  width: "32px", height: "32px",
                  border: "3px solid rgba(108,99,255,0.2)",
                  borderTop: "3px solid #6c63ff",
                  borderRadius: "50%",
                  animation: "ccSpin 0.8s linear infinite",
                }} />
                <p style={{ color: "#6c63ff", fontSize: "12px", fontWeight: "600" }}>Connecting...</p>
              </div>
            )}
          </div>

          {/* Room code */}
          <div style={{ textAlign: "center" }}>
            <p style={{
              fontSize: "10px", color: "#4b5563",
              textTransform: "uppercase", letterSpacing: "2px", marginBottom: "6px",
            }}>
              Room Code
            </p>
            <p style={{
              fontSize: "28px", fontWeight: "800", color: "#6c63ff",
              letterSpacing: "12px", fontFamily: "monospace",
            }}>
              {roomCode}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleCopy}
              style={{
                flex: 1,
                background: copied ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${copied ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "12px", padding: "10px",
                fontSize: "13px", fontWeight: "600",
                color: copied ? "#00ff88" : "#e8e8f0",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                transition: "all 0.2s ease",
              }}
            >
              {copied
                ? <><Check size={13} weight="bold" /> Copied!</>
                : <><Copy size={13} weight="bold" /> Copy Code</>}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleShare}
              style={{
                flex: 1,
                background: "rgba(0,212,255,0.06)",
                border: "1px solid rgba(0,212,255,0.15)",
                borderRadius: "12px", padding: "10px",
                fontSize: "13px", fontWeight: "600", color: "#00d4ff",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              <ShareNetwork size={13} weight="bold" />
              Share Link
            </motion.button>
          </div>

          {connectionStatus && (
            <p style={{ fontSize: "12px", color: peerJoined ? "#6c63ff" : "#4b5563", textAlign: "center" }}>
              {peerJoined ? "Peer found! Establishing connection..." : connectionStatus}
            </p>
          )}
        </div>
      )}

      {/* ── Receive mode (not connected) ── */}
      {!isConnected && mode === "receive" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Tab strip */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            gap: "4px",
          }}>
            {(["code", "scan", "nearby"] as ReceiveTab[]).map((tab) => (
              <button
                key={tab}
                className={`rx-tab ${receiveTab === tab ? "active" : "inactive"}`}
                onClick={() => {
                  setReceiveTab(tab);
                  if (tab === "scan") setShowScanner(true);
                }}
              >
                {tab === "code" ? "Enter Code" : tab === "scan" ? "Scan QR" : "Nearby"}
              </button>
            ))}
          </div>

          {/* Code tab */}
          {receiveTab === "code" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
              {/* 6-box PIN */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {chars.map((ch, i) => (
                  <>
                    {i === 3 && (
                      <div key="sep" style={{ width: "8px", height: "2px", background: "rgba(255,255,255,0.15)", borderRadius: "1px" }} />
                    )}
                    <input
                      key={i}
                      ref={(el) => { charRefs.current[i] = el; }}
                      className={`pin-box${ch ? " filled" : ""}`}
                      type="text"
                      inputMode="text"
                      maxLength={2}
                      value={ch}
                      onChange={(e) => handleCharInput(i, e.target.value)}
                      onKeyDown={(e) => handleCharKeyDown(i, e)}
                      onPaste={handlePaste}
                      onFocus={(e) => e.target.select()}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </>
                ))}
              </div>

              <button
                onClick={() => chars.every(Boolean) && connect(chars.join(""))}
                disabled={!chars.every(Boolean) || isConnecting}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
                  border: "none",
                  borderRadius: "14px",
                  padding: "14px",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "white",
                  cursor: chars.every(Boolean) ? "pointer" : "not-allowed",
                  opacity: chars.every(Boolean) && !isConnecting ? 1 : 0.35,
                  transition: "opacity 0.2s ease",
                }}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
            </div>
          )}

          {/* Scan QR tab */}
          {receiveTab === "scan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
              <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
                Point your camera at the sender's QR code
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowScanner(true)}
                style={{
                  width: "100%",
                  background: "rgba(108,99,255,0.1)",
                  border: "1px solid rgba(108,99,255,0.25)",
                  borderRadius: "14px",
                  padding: "18px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#6c63ff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <QrCode size={20} weight="bold" />
                Open Camera
              </motion.button>
            </div>
          )}

          {/* Nearby tab */}
          {receiveTab === "nearby" && signalingUrl && (
            <NearbyTab
              signalingUrl={signalingUrl}
              onConnect={(code) => {
                setRoomCode(code);
                connect(code);
              }}
            />
          )}
          {receiveTab === "nearby" && !signalingUrl && (
            <p style={{ fontSize: "13px", color: "#4b5563", textAlign: "center" }}>
              Discovery not available
            </p>
          )}
        </div>
      )}

      {/* ── QR Scanner portal ── */}
      {showScanner && (
        <QRScanner
          onScan={(code) => {
            setShowScanner(false);
            setReceiveTab("code");
            setRoomCode(code);
            connect(code);
          }}
          onClose={() => {
            setShowScanner(false);
            setReceiveTab("code");
          }}
        />
      )}

      {/* ── Connected state ── */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>Connected to room</p>
            <p style={{ fontSize: "20px", fontWeight: "800", color: "#6c63ff", marginTop: "4px", fontFamily: "monospace", letterSpacing: "8px" }}>
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
