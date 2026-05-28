import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, X, ArrowsClockwise } from "@phosphor-icons/react";
import { QRScanner } from "./QRScanner";
import { useOfflineTransfer } from "../hooks/useOfflineTransfer";
import { useFileTransfer } from "../hooks/useFileTransfer";
import { TransferCard } from "./TransferCard";

type Screen = "guide" | "role" | "sender-show-qr" | "receiver-scan" | "receiver-show-qr" | "connected";

interface Props {
  onClose: () => void;
}

// Simple slide transition — no heavy spring physics
const slide = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
  transition: { duration: 0.18, ease: "easeOut" as const },
};

export function OfflineMode({ onClose }: Props) {
  const [screen, setScreen] = useState<Screen>("guide");
  const [role, setRole] = useState<"sender" | "receiver" | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [btAvailable, setBtAvailable] = useState(false);
  const onMessageRef = useRef<((e: MessageEvent) => void) | null>(null);

  const {
    offlineState,
    offerQR,
    answerQR,
    createOffer,
    processOffer,
    processAnswer,
    disconnect,
    channel,
  } = useOfflineTransfer((e) => onMessageRef.current?.(e));

  const {
    progress,
    sendFile,
    handleMessage,
    formatBytes,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
  } = useFileTransfer(channel as any);

  onMessageRef.current = handleMessage;

  // Check Bluetooth availability
  useEffect(() => {
    if ("bluetooth" in navigator) setBtAvailable(true);
  }, []);

  // Auto advance to connected
  useEffect(() => {
    if (offlineState === "connected") setScreen("connected");
  }, [offlineState]);

  // Auto advance sender when offer ready
  useEffect(() => {
    if (offerQR && role === "sender") setScreen("sender-show-qr");
  }, [offerQR, role]);

  // Auto advance receiver when answer ready
  useEffect(() => {
    if (answerQR && role === "receiver") setScreen("receiver-show-qr");
  }, [answerQR, role]);

  // Back navigation per screen
  const handleBack = () => {
    switch (screen) {
      case "role":
        setScreen("guide");
        break;
      case "sender-show-qr":
      case "receiver-scan":
        disconnect();
        setRole(null);
        setScreen("role");
        break;
      case "receiver-show-qr":
        setScreen("receiver-scan");
        break;
      default:
        onClose();
    }
  };

  const handleRoleSelect = (r: "sender" | "receiver") => {
    setRole(r);
    if (r === "sender") {
      createOffer();
      // Screen will advance when offerQR ready
    } else {
      setScreen("receiver-scan");
    }
  };

  // Shared container style
  const container: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "#07071a",
    zIndex: 9998,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  };

  // Top nav bar
  const renderNav = (title: string, subtitle?: string) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "16px 20px",
      paddingTop: "max(16px, env(safe-area-inset-top))",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      flexShrink: 0,
    }}>
      <button
        onClick={handleBack}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          width: "36px",
          height: "36px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <ArrowLeft size={16} weight="bold" color="#9ca3af" />
      </button>
      <div>
        <p style={{ fontSize: "16px", fontWeight: "700", color: "#e8e8f0" }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  // Large QR display — same size as online mode
  const renderLargeQR = (value: string, glowColor: string) => (
    <div style={{
      display: "flex",
      justifyContent: "center",
      padding: "8px",
      position: "relative",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "24px",
        background: `radial-gradient(ellipse, ${glowColor}22 0%, transparent 70%)`,
        filter: "blur(20px)",
        pointerEvents: "none",
      }} />
      {/* QR */}
      <div style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "18px",
        position: "relative",
        boxShadow: `0 0 0 1px ${glowColor}33, 0 8px 32px rgba(0,0,0,0.4)`,
      }}>
        <QRCodeSVG
          value={value}
          size={240}
          bgColor="#ffffff"
          fgColor="#06061a"
          level="M"
          includeMargin={false}
          imageSettings={{
            src: "/favicon.svg",
            x: undefined,
            y: undefined,
            height: 32,
            width: 32,
            excavate: true,
          }}
        />
      </div>
    </div>
  );

  const renderScreen = () => {
    // Guide
    if (screen === "guide") return (
      <motion.div key="guide" {...slide} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Close button in top right */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          paddingTop: "max(16px, env(safe-area-inset-top))",
        }}>
          <div>
            <p style={{ fontSize: "22px", fontWeight: "800", color: "#e8e8f0" }}>
              ⚡ Offline Mode
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
              Transfer files without internet
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              width: "34px",
              height: "34px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} weight="bold" color="#6b7280" />
          </button>
        </div>

        {/* Steps */}
        <div style={{
          padding: "8px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          flex: 1,
        }}>
          {[
            {
              icon: "📶",
              color: "#fbbf24",
              bg: "rgba(251,191,36,0.08)",
              border: "rgba(251,191,36,0.15)",
              title: "One device creates a hotspot",
              desc: "Go to Settings → Hotspot → Turn on",
            },
            {
              icon: "📱",
              color: "#00d4ff",
              bg: "rgba(0,212,255,0.08)",
              border: "rgba(0,212,255,0.15)",
              title: "Other device connects to it",
              desc: "Join the hotspot from WiFi settings",
            },
            {
              icon: "📷",
              color: "#00ff88",
              bg: "rgba(0,255,136,0.08)",
              border: "rgba(0,255,136,0.15)",
              title: "Exchange QR codes to pair",
              desc: "Takes about 10 seconds total",
            },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              background: item.bg,
              border: `1px solid ${item.border}`,
              borderRadius: "16px",
              padding: "16px",
            }}>
              <div style={{
                fontSize: "24px",
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#e8e8f0" }}>
                  {i + 1}. {item.title}
                </p>
                <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "3px" }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}

          {/* Bluetooth boost tip */}
          {btAvailable && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(89,120,255,0.06)",
              border: "1px solid rgba(89,120,255,0.15)",
              borderRadius: "12px",
              padding: "12px 14px",
            }}>
              <span style={{ fontSize: "18px" }}>🔵</span>
              <p style={{ fontSize: "11px", color: "#6b7280" }}>
                <span style={{ color: "#89CFF0", fontWeight: "600" }}>Tip: </span>
                Enable Bluetooth on both devices for faster local discovery
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{
          padding: "16px 20px",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}>
          <button
            onClick={() => setScreen("role")}
            style={{
              background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
              border: "none",
              borderRadius: "16px",
              padding: "16px",
              fontSize: "15px",
              fontWeight: "700",
              color: "white",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Get Started →
          </button>
        </div>
      </motion.div>
    );

    // Role select
    if (screen === "role") return (
      <motion.div key="role" {...slide} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {renderNav("Choose Your Role", "Select on this device")}

        <div style={{
          flex: 1,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          justifyContent: "center",
        }}>
          {[
            {
              role: "sender" as const,
              emoji: "📤",
              title: "I'm Sending Files",
              desc: "I'll show a QR code for the receiver to scan",
              color: "#6c63ff",
              bg: "rgba(108,99,255,0.08)",
              border: "rgba(108,99,255,0.2)",
            },
            {
              role: "receiver" as const,
              emoji: "📥",
              title: "I'm Receiving Files",
              desc: "I'll scan the sender's QR code",
              color: "#00d4ff",
              bg: "rgba(0,212,255,0.08)",
              border: "rgba(0,212,255,0.2)",
            },
          ].map((item) => (
            <button
              key={item.role}
              onClick={() => handleRoleSelect(item.role)}
              style={{
                background: item.bg,
                border: `1px solid ${item.border}`,
                borderRadius: "20px",
                padding: "22px",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <span style={{ fontSize: "36px" }}>{item.emoji}</span>
              <div>
                <p style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: item.color,
                }}>
                  {item.title}
                </p>
                <p style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginTop: "4px",
                  lineHeight: "1.4",
                }}>
                  {item.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    );

    // Sender shows QR
    if (screen === "sender-show-qr" && offerQR) return (
      <motion.div key="sender-qr" {...slide} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {renderNav("Your QR Code", "Step 1 of 2 — Show to receiver")}

        <div style={{
          flex: 1,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {renderLargeQR(offerQR, "#6c63ff")}

          <div style={{
            background: "rgba(108,99,255,0.06)",
            border: "1px solid rgba(108,99,255,0.12)",
            borderRadius: "14px",
            padding: "14px 16px",
            width: "100%",
            maxWidth: "320px",
          }}>
            <p style={{
              fontSize: "13px",
              color: "#9ca3af",
              textAlign: "center",
              lineHeight: "1.5",
            }}>
              Show this QR to the receiver.
              After they scan it, they'll show you their QR.
            </p>
          </div>
        </div>

        <div style={{
          padding: "16px 20px",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}>
          <button
            onClick={() => setShowScanner(true)}
            style={{
              background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
              border: "none",
              borderRadius: "16px",
              padding: "16px",
              fontSize: "15px",
              fontWeight: "700",
              color: "white",
              cursor: "pointer",
              width: "100%",
            }}
          >
            📷 Scan Receiver's QR →
          </button>
        </div>
      </motion.div>
    );

    // Receiver scans offer
    if (screen === "receiver-scan") return (
      <motion.div key="receiver-scan" {...slide} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {renderNav("Scan Sender's QR", "Step 1 of 2")}

        <div style={{
          flex: 1,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {offlineState === "creating-answer" ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <ArrowsClockwise size={40} color="#6c63ff" />
              </motion.div>
              <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                Generating your QR...
              </p>
            </div>
          ) : (
            <>
              <div style={{
                width: "100px",
                height: "100px",
                borderRadius: "24px",
                background: "rgba(0,212,255,0.08)",
                border: "2px dashed rgba(0,212,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "44px",
              }}>
                📷
              </div>

              <div style={{ textAlign: "center" }}>
                <p style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "#e8e8f0",
                }}>
                  Ask the sender to show their QR
                </p>
                <p style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginTop: "6px",
                }}>
                  Then tap below to open your camera
                </p>
              </div>
            </>
          )}
        </div>

        {offlineState !== "creating-answer" && (
          <div style={{
            padding: "16px 20px",
            paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          }}>
            <button
              onClick={() => setShowScanner(true)}
              style={{
                background: "linear-gradient(135deg, #00d4ff, #0099cc)",
                border: "none",
                borderRadius: "16px",
                padding: "16px",
                fontSize: "15px",
                fontWeight: "700",
                color: "white",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Open Camera to Scan
            </button>
          </div>
        )}
      </motion.div>
    );

    // Receiver shows answer QR
    if (screen === "receiver-show-qr" && answerQR) return (
      <motion.div key="receiver-qr" {...slide} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {renderNav("Show to Sender", "Step 2 of 2 — Almost there!")}

        <div style={{
          flex: 1,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {renderLargeQR(answerQR, "#00d4ff")}

          <div style={{
            background: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.12)",
            borderRadius: "14px",
            padding: "14px 16px",
            width: "100%",
            maxWidth: "320px",
          }}>
            <p style={{
              fontSize: "13px",
              color: "#9ca3af",
              textAlign: "center",
              lineHeight: "1.5",
            }}>
              Show this QR to the sender.
              Once they scan it, you'll be connected!
            </p>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#00d4ff",
                boxShadow: "0 0 8px #00d4ff",
              }}
            />
            <p style={{ fontSize: "12px", color: "#6b7280" }}>
              Waiting for sender to scan...
            </p>
          </div>
        </div>
      </motion.div>
    );

    // Connected
    if (screen === "connected") return (
      <motion.div key="connected" {...slide} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Status header */}
        <div style={{
          padding: "16px 20px",
          paddingTop: "max(16px, env(safe-area-inset-top))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(0,255,136,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#00ff88",
                boxShadow: "0 0 8px #00ff88",
              }}
            />
            <div>
              <p style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#00ff88",
              }}>
                Connected — Local Network
              </p>
              <p style={{ fontSize: "11px", color: "#6b7280" }}>
                No internet used · Maximum speed
              </p>
            </div>
          </div>
          <button
            onClick={() => { disconnect(); onClose(); }}
            style={{
              background: "rgba(255,59,59,0.1)",
              border: "1px solid rgba(255,59,59,0.2)",
              borderRadius: "10px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#ff6b6b",
              cursor: "pointer",
            }}
          >
            End
          </button>
        </div>

        {/* Transfer area */}
        <div style={{
          flex: 1,
          padding: "16px 20px",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          overflowY: "auto",
        }}>
          <TransferCard
            progress={progress}
            sendFile={sendFile}
            formatBytes={formatBytes}
            pauseTransfer={pauseTransfer}
            resumeTransfer={resumeTransfer}
            cancelTransfer={cancelTransfer}
          />
        </div>
      </motion.div>
    );

    return null;
  };

  return createPortal(
    <div style={container}>
      {/* Background */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(160deg, #0a0820 0%, #07071a 100%)",
        zIndex: -1,
      }} />

      <AnimatePresence mode="wait">
        {renderScreen()}
      </AnimatePresence>

      {showScanner && (
        <QRScanner
          onScan={(data) => {
            setShowScanner(false);
            if (role === "sender") {
              processAnswer(data);
            } else {
              processOffer(data);
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>,
    document.body
  );
}