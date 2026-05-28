import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  WifiX,
  ArrowLeft,
  Lightning,
  DeviceMobile,
  ArrowsClockwise,
  CheckCircle,
  X,
} from "@phosphor-icons/react";
import { QRScanner } from "./QRScanner";
import { useOfflineTransfer } from "../hooks/useOfflineTransfer";
import { useFileTransfer } from "../hooks/useFileTransfer";
import { TransferCard } from "./TransferCard";

type OfflineStep =
  | "guide"
  | "role-select"
  | "sender-qr"
  | "sender-scan"
  | "receiver-scan"
  | "receiver-qr"
  | "connected";

interface Props {
  onClose: () => void;
}

export function OfflineMode({ onClose }: Props) {
  const [step, setStep] = useState<OfflineStep>("guide");
  const [role, setRole] = useState<"sender" | "receiver" | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const onMessageRef = { current: null as any };

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

  // Auto-advance when connected
  useEffect(() => {
    if (offlineState === "connected") {
      setStep("connected");
    }
  }, [offlineState]);

  // Auto-advance when QRs are ready
  useEffect(() => {
    if (offerQR && step === "role-select") {
      setStep("sender-qr");
    }
  }, [offerQR, step]);

  useEffect(() => {
    if (answerQR && step === "receiver-scan") {
      setStep("receiver-qr");
    }
  }, [answerQR, step]);

  const handleRoleSelect = (selectedRole: "sender" | "receiver") => {
    setRole(selectedRole);
    if (selectedRole === "sender") {
      createOffer();
      setStep("role-select"); // will advance when offerQR ready
    } else {
      setStep("receiver-scan");
    }
  };

  const cardStyle = {
    background: "rgba(10,10,30,0.97)",
    border: "1px solid rgba(108,99,255,0.2)",
    borderRadius: "24px",
    padding: "28px",
    width: "100%",
    maxWidth: "380px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(108,99,255,0.1)",
  };

  const renderStep = () => {
    // Guide screen
    if (step === "guide") {
      return (
        <motion.div
          key="guide"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={cardStyle}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(108,99,255,0.15)",
                border: "1px solid rgba(108,99,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <WifiX size={18} weight="bold" color="#6c63ff" />
              </div>
              <div>
                <p style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#e8e8f0",
                }}>
                  Offline Mode
                </p>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>
                  No internet required
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
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
              }}
            >
              <X size={13} weight="bold" color="#6b7280" />
            </motion.button>
          </div>

          {/* Steps */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            {[
              {
                icon: <Lightning size={18} weight="fill" color="#fbbf24" />,
                bg: "rgba(251,191,36,0.1)",
                border: "rgba(251,191,36,0.2)",
                title: "Turn on Hotspot",
                desc: "One device creates a mobile hotspot",
              },
              {
                icon: <DeviceMobile size={18} weight="bold" color="#00d4ff" />,
                bg: "rgba(0,212,255,0.1)",
                border: "rgba(0,212,255,0.2)",
                title: "Connect Other Device",
                desc: "Join the hotspot on the second device",
              },
              {
                icon: <ArrowsClockwise size={18} weight="bold" color="#00ff88" />,
                bg: "rgba(0,255,136,0.1)",
                border: "rgba(0,255,136,0.2)",
                title: "Scan & Connect",
                desc: "Exchange QR codes to pair instantly",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "14px",
                  padding: "14px",
                }}
              >
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#e8e8f0",
                  }}>
                    {item.icon && `${i + 1}. `}{item.title}
                  </p>
                  <p style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setStep("role-select")}
            style={{
              background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
              border: "none",
              borderRadius: "14px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: "700",
              color: "white",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Get Started
          </motion.button>
        </motion.div>
      );
    }

    // Role select
    if (step === "role-select") {
      return (
        <motion.div
          key="role"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={cardStyle}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setStep("guide")}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                display: "flex",
              }}
            >
              <ArrowLeft size={14} weight="bold" color="#6b7280" />
            </motion.button>
            <div>
              <p style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#e8e8f0",
              }}>
                What's your role?
              </p>
              <p style={{ fontSize: "11px", color: "#6b7280" }}>
                Choose on this device
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              {
                role: "sender" as const,
                title: "I'm Sending Files",
                desc: "Generate QR for the receiver to scan",
                color: "#6c63ff",
                bg: "rgba(108,99,255,0.08)",
                border: "rgba(108,99,255,0.2)",
              },
              {
                role: "receiver" as const,
                title: "I'm Receiving Files",
                desc: "Scan the sender's QR code",
                color: "#00d4ff",
                bg: "rgba(0,212,255,0.08)",
                border: "rgba(0,212,255,0.2)",
              },
            ].map((item) => (
              <motion.button
                key={item.role}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRoleSelect(item.role)}
                style={{
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                  borderRadius: "16px",
                  padding: "18px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <p style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: item.color,
                }}>
                  {item.title}
                </p>
                <p style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginTop: "4px",
                }}>
                  {item.desc}
                </p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      );
    }

    // Sender shows offer QR
    if (step === "sender-qr" && offerQR) {
      return (
        <motion.div
          key="sender-qr"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={cardStyle}
        >
          <div>
            <p style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#e8e8f0",
            }}>
              Step 1 — Show this QR
            </p>
            <p style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "4px",
            }}>
              Let the receiver scan this on their device
            </p>
          </div>

          {/* QR */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            padding: "8px",
          }}>
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 3 }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "20px",
                background: "radial-gradient(ellipse, rgba(108,99,255,0.2) 0%, transparent 70%)",
                filter: "blur(10px)",
              }}
            />
            <div style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "14px",
              position: "relative",
            }}>
              <QRCodeSVG
                value={offerQR}
                size={200}
                bgColor="#ffffff"
                fgColor="#06061a"
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

          <div style={{
            background: "rgba(108,99,255,0.08)",
            border: "1px solid rgba(108,99,255,0.15)",
            borderRadius: "12px",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <ArrowsClockwise
              size={16}
              color="#6c63ff"
              style={{ flexShrink: 0 }}
            />
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>
              After receiver scans, they'll show you a QR to scan back
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowScanner(true);
            }}
            style={{
              background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
              border: "none",
              borderRadius: "14px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: "700",
              color: "white",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Scan Receiver's QR →
          </motion.button>
        </motion.div>
      );
    }

    // Receiver scans offer
    if (step === "receiver-scan") {
      return (
        <motion.div
          key="receiver-scan"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={cardStyle}
        >
          <div>
            <p style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#e8e8f0",
            }}>
              Step 1 — Scan Sender's QR
            </p>
            <p style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "4px",
            }}>
              Ask the sender to show their QR code
            </p>
          </div>

          {offlineState === "creating-answer" ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              padding: "24px",
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <ArrowsClockwise size={32} color="#6c63ff" />
              </motion.div>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>
                Generating your QR code...
              </p>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowScanner(true)}
              style={{
                background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
                border: "none",
                borderRadius: "14px",
                padding: "32px",
                fontSize: "15px",
                fontWeight: "700",
                color: "white",
                cursor: "pointer",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <p style={{ fontSize: "32px" }}>📷</p>
              Tap to Open Camera
            </motion.button>
          )}
        </motion.div>
      );
    }

    // Receiver shows answer QR
    if (step === "receiver-qr" && answerQR) {
      return (
        <motion.div
          key="receiver-qr"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={cardStyle}
        >
          <div>
            <p style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#e8e8f0",
            }}>
              Step 2 — Show this QR
            </p>
            <p style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "4px",
            }}>
              Let the sender scan this to complete connection
            </p>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            padding: "8px",
          }}>
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 3 }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "20px",
                background: "radial-gradient(ellipse, rgba(0,212,255,0.2) 0%, transparent 70%)",
                filter: "blur(10px)",
              }}
            />
            <div style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "14px",
              position: "relative",
            }}>
              <QRCodeSVG
                value={answerQR}
                size={200}
                bgColor="#ffffff"
                fgColor="#06061a"
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

          <div style={{
            background: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.15)",
            borderRadius: "12px",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <ArrowsClockwise size={16} color="#00d4ff" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>
              Waiting for sender to scan this...
            </p>
          </div>
        </motion.div>
      );
    }

    // Connected
    if (step === "connected") {
      return (
        <motion.div
          key="connected"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
            maxWidth: "380px",
          }}
        >
          {/* Status bar */}
          <div style={{
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: "16px",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#00ff88",
                  boxShadow: "0 0 8px #00ff88",
                }}
              />
              <div>
                <p style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#00ff88",
                }}>
                  Connected — Local Network
                </p>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>
                  <CheckCircle size={10} /> No internet used
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                disconnect();
                onClose();
              }}
              style={{
                background: "rgba(255,59,59,0.1)",
                border: "1px solid rgba(255,59,59,0.2)",
                borderRadius: "10px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#ff6b6b",
                cursor: "pointer",
              }}
            >
              Disconnect
            </motion.button>
          </div>

          {/* Transfer card */}
          <TransferCard
            progress={progress}
            sendFile={sendFile}
            formatBytes={formatBytes}
            pauseTransfer={pauseTransfer}
            resumeTransfer={resumeTransfer}
            cancelTransfer={cancelTransfer}
          />
        </motion.div>
      );
    }

    return null;
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>

      {/* QR Scanner for both sender and receiver */}
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
    </motion.div>,
    document.body
  );
}