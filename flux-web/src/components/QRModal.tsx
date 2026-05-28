import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, ShareNetwork } from "@phosphor-icons/react";

interface Props {
  roomCode: string;
  onClose: () => void;
}

export function QRModal({ roomCode, onClose }: Props) {
  const [copied, setCopied] = useState(false);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 24 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "rgba(10,10,30,0.97)",
            border: "1px solid rgba(108,99,255,0.25)",
            borderRadius: "28px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            width: "100%",
            maxWidth: "340px",
            boxShadow: "0 0 60px rgba(108,99,255,0.2), 0 0 120px rgba(0,212,255,0.08)",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            width: "100%",
          }}>
            <div>
              <p style={{
                fontSize: "17px",
                fontWeight: "700",
                color: "#e8e8f0",
              }}>
                Scan to Connect
              </p>
              <p style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "3px",
              }}>
                Point camera at QR — connects instantly
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={14} weight="bold" color="#6b7280" />
            </motion.button>
          </div>

          {/* QR Code with glow */}
          <div style={{ position: "relative" }}>
            {/* Glow layers */}
            <div style={{
              position: "absolute",
              inset: "-12px",
              borderRadius: "24px",
              background: "radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)",
              filter: "blur(8px)",
            }} />
            <div style={{
              position: "absolute",
              inset: "-8px",
              borderRadius: "22px",
              border: "1px solid rgba(108,99,255,0.2)",
            }} />

            {/* QR Container */}
            <div style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "16px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <QRCodeSVG
                value={url}
                size={190}
                bgColor="#ffffff"
                fgColor="#080820"
                level="M"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.svg",
                  x: undefined,
                  y: undefined,
                  height: 28,
                  width: 28,
                  excavate: true,
                }}
              />
            </div>
          </div>

          {/* Room code pill */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(108,99,255,0.08)",
            border: "1px solid rgba(108,99,255,0.2)",
            borderRadius: "14px",
            padding: "12px 18px",
            width: "100%",
            justifyContent: "center",
          }}>
            <div>
              <p style={{
                fontSize: "10px",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                textAlign: "center",
                marginBottom: "4px",
              }}>
                Room Code
              </p>
              <p style={{
                fontSize: "26px",
                fontWeight: "700",
                color: "#6c63ff",
                letterSpacing: "8px",
                fontFamily: "monospace",
                textAlign: "center",
              }}>
                {roomCode}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            display: "flex",
            gap: "8px",
            width: "100%",
          }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCopy}
              style={{
                flex: 1,
                background: copied
                  ? "rgba(0,255,136,0.1)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${copied ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "12px",
                padding: "10px",
                fontSize: "12px",
                fontWeight: "600",
                color: copied ? "#00ff88" : "#e8e8f0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
            >
              {copied
                ? <><Check size={13} weight="bold" /> Copied!</>
                : <><Copy size={13} weight="bold" /> Copy Link</>
              }
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              style={{
                flex: 1,
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.2)",
                borderRadius: "12px",
                padding: "10px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#00d4ff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <ShareNetwork size={13} weight="bold" />
              Share
            </motion.button>
          </div>

          {/* Tip */}
          <p style={{
            fontSize: "11px",
            color: "#374151",
            textAlign: "center",
          }}>
            Works offline on the same network · tap outside to close
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}