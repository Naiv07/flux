import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, ShareNetwork } from "@phosphor-icons/react";
import type { ConnectionState } from "../types";

interface Props {
  roomCode: string;
  onClose: () => void;
  connectionState: ConnectionState;
}

export function QRModal({ roomCode, onClose, connectionState }: Props) {
  const [copied, setCopied] = useState(false);

  // Auto-close when connection is established
  useEffect(() => {
    if (connectionState === "connected") {
      onClose();
    }
  }, [connectionState, onClose]);
  const url = `${window.location.origin}?code=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join my Flux session",
        text: `Use code ${roomCode} to receive files`,
        url,
      });
    } else {
      handleCopy();
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          transition={{ type: "spring", damping: 22, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(160deg, rgba(18,10,40,0.98) 0%, rgba(8,8,32,0.98) 100%)",
            border: "1px solid rgba(108,99,255,0.3)",
            borderRadius: "28px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            width: "100%",
            maxWidth: "320px",
            boxShadow: `
              0 0 0 1px rgba(108,99,255,0.1),
              0 20px 60px rgba(0,0,0,0.6),
              0 0 80px rgba(108,99,255,0.12),
              0 0 160px rgba(0,212,255,0.06)
            `,
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}>
            <div>
              <p style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#e8e8f0",
                letterSpacing: "-0.2px",
              }}>
                Scan to Connect
              </p>
              <p style={{
                fontSize: "11px",
                color: "#6b7280",
                marginTop: "2px",
              }}>
                Point camera at QR — connects instantly
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                width: "30px",
                height: "30px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={13} weight="bold" color="#6b7280" />
            </motion.button>
          </div>

          {/* QR with glow */}
          <div style={{ position: "relative", padding: "8px" }}>
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: "-4px",
                borderRadius: "22px",
                background: "radial-gradient(ellipse, rgba(108,99,255,0.2) 0%, rgba(0,212,255,0.08) 60%, transparent 100%)",
                filter: "blur(12px)",
              }}
            />
            <div style={{
              position: "absolute",
              inset: "0px",
              borderRadius: "20px",
              border: "1px solid rgba(108,99,255,0.25)",
            }} />
            <div style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "14px",
              position: "relative",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.08)",
            }}>
              <QRCodeSVG
                value={url}
                size={176}
                bgColor="#ffffff"
                fgColor="#06061a"
                level="M"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.svg",
                  x: undefined,
                  y: undefined,
                  height: 26,
                  width: 26,
                  excavate: true,
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: "100%",
            height: "1px",
            background: "rgba(255,255,255,0.05)",
          }} />

          {/* Room code */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            width: "100%",
          }}>
            <p style={{
              fontSize: "10px",
              color: "#4b5563",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}>
              Room Code
            </p>
            <p style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#6c63ff",
              letterSpacing: "10px",
              fontFamily: "monospace",
            }}>
              {roomCode}
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleCopy}
              style={{
                flex: 1,
                background: copied
                  ? "rgba(0,255,136,0.08)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${copied
                  ? "rgba(0,255,136,0.25)"
                  : "rgba(255,255,255,0.08)"}`,
                borderRadius: "12px",
                padding: "10px 8px",
                fontSize: "12px",
                fontWeight: "600",
                color: copied ? "#00ff88" : "#9ca3af",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.2s ease",
              }}
            >
              {copied
                ? <><Check size={12} weight="bold" /> Copied!</>
                : <><Copy size={12} weight="bold" /> Copy Link</>
              }
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleShare}
              style={{
                flex: 1,
                background: "rgba(0,212,255,0.07)",
                border: "1px solid rgba(0,212,255,0.2)",
                borderRadius: "12px",
                padding: "10px 8px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#00d4ff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              <ShareNetwork size={12} weight="bold" />
              Share
            </motion.button>
          </div>

          {/* Tip */}
          <p style={{
            fontSize: "10px",
            color: "#374151",
            textAlign: "center",
            lineHeight: "1.5",
          }}>
            Works offline on the same network
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
