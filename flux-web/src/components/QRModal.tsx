import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { X } from "@phosphor-icons/react";

interface Props {
  roomCode: string;
  onClose: () => void;
}

export function QRModal({ roomCode, onClose }: Props) {
  const url = `${window.location.origin}?code=${roomCode}`;

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
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "rgba(15,15,40,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "28px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            maxWidth: "320px",
            width: "100%",
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
                fontSize: "18px",
                fontWeight: "700",
                color: "#e8e8f0",
              }}>
                Scan to Connect
              </p>
              <p style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "4px",
              }}>
                Point receiver's camera at this code
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} weight="bold" color="#6b7280" />
            </motion.button>
          </div>

          {/* QR Code */}
          <div style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <QRCodeSVG
              value={url}
              size={200}
              bgColor="#ffffff"
              fgColor="#080820"
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Room Code */}
          <div style={{
            background: "rgba(108,99,255,0.08)",
            border: "1px solid rgba(108,99,255,0.2)",
            borderRadius: "14px",
            padding: "14px 20px",
            textAlign: "center",
            width: "100%",
          }}>
            <p style={{
              fontSize: "11px",
              color: "#6b7280",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}>
              Room Code
            </p>
            <p style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#6c63ff",
              letterSpacing: "8px",
              fontFamily: "monospace",
            }}>
              {roomCode}
            </p>
          </div>

          {/* Tip */}
          <p style={{
            fontSize: "11px",
            color: "#4b5563",
            textAlign: "center",
            lineHeight: "1.5",
          }}>
            Or share the code manually.
            Tap outside to close.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}