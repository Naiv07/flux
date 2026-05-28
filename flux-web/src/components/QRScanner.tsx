import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera } from "@phosphor-icons/react";
import { Lightning, LightningSlash } from "@phosphor-icons/react";
import jsQR from "jsqr";

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);

  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          } as MediaTrackConstraints,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        torchTrackRef.current = track;

        try {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any],
          });
        } catch {
          // Focus not supported
        }

        const caps = track.getCapabilities() as any;
        if (caps?.torch) setTorchSupported(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access.");
        } else if (err.name === "NotFoundError") {
          setError("No rear camera found on this device.");
        } else {
          setError("Could not start camera.");
        }
      }
    };

    startCamera();
    return () => {
      active = false;
      stopCamera();
    };
  }, [stopCamera]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      let roomCode = code.data;
      try {
        const url = new URL(code.data);
        const param = url.searchParams.get("code");
        if (param) roomCode = param;
      } catch {
        // Not a URL
      }

      if (roomCode.length === 6) {
        setFound(true);
        stopCamera();
        setTimeout(() => onScan(roomCode.toUpperCase()), 600);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [onScan, stopCamera]);

  const handleVideoPlay = () => {
    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const toggleTorch = async () => {
    const track = torchTrackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torch } as any],
      });
      setTorch(!torch);
    } catch {
      setTorchSupported(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Camera view */}
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          <video
            ref={videoRef}
            onPlay={handleVideoPlay}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Scan overlay */}
          {!error && !found && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <div style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 100%)",
              }} />

              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ position: "relative", width: "240px", height: "240px" }}
              >
                {[
                  { top: 0, left: 0, borderTop: "3px solid #6c63ff", borderLeft: "3px solid #6c63ff", borderRadius: "4px 0 0 0" },
                  { top: 0, right: 0, borderTop: "3px solid #6c63ff", borderRight: "3px solid #6c63ff", borderRadius: "0 4px 0 0" },
                  { bottom: 0, left: 0, borderBottom: "3px solid #6c63ff", borderLeft: "3px solid #6c63ff", borderRadius: "0 0 0 4px" },
                  { bottom: 0, right: 0, borderBottom: "3px solid #6c63ff", borderRight: "3px solid #6c63ff", borderRadius: "0 0 4px 0" },
                ].map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: "28px", height: "28px", ...s }} />
                ))}

                <motion.div
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    left: "4px",
                    right: "4px",
                    height: "2px",
                    background: "linear-gradient(90deg, transparent, #6c63ff, #00d4ff, #6c63ff, transparent)",
                    boxShadow: "0 0 8px rgba(108,99,255,0.8)",
                    borderRadius: "1px",
                  }}
                />
              </motion.div>
            </div>
          )}

          {/* Success overlay */}
          {found && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,255,136,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                style={{
                  background: "rgba(0,255,136,0.2)",
                  border: "2px solid #00ff88",
                  borderRadius: "50%",
                  width: "80px",
                  height: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                }}
              >
                ✓
              </motion.div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              padding: "32px",
              background: "rgba(0,0,0,0.8)",
            }}>
              <Camera size={48} color="#6b7280" />
              <p style={{
                color: "#e8e8f0",
                fontSize: "16px",
                fontWeight: "600",
                textAlign: "center",
              }}>
                {error}
              </p>
              <button
                onClick={handleClose}
                style={{
                  background: "rgba(108,99,255,0.2)",
                  border: "1px solid rgba(108,99,255,0.4)",
                  borderRadius: "12px",
                  padding: "12px 24px",
                  color: "#6c63ff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Go Back
              </button>
            </div>
          )}

          {/* Top bar */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "max(16px, env(safe-area-inset-top)) 20px 16px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <p style={{ color: "#e8e8f0", fontSize: "15px", fontWeight: "600" }}>
              Scan Flux QR Code
            </p>
          </div>
        </div>

        {/* Bottom controls */}
        <div style={{
          background: "rgba(8,8,32,0.95)",
          backdropFilter: "blur(20px)",
          padding: "20px 24px",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              padding: "12px 20px",
              color: "#9ca3af",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <X size={16} weight="bold" />
            Cancel
          </motion.button>

          <p style={{ color: "#6b7280", fontSize: "12px" }}>
            {found ? "Code found!" : "Scanning..."}
          </p>

          {torchSupported ? (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={toggleTorch}
              style={{
                background: torch ? "rgba(255,214,0,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${torch ? "rgba(255,214,0,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "14px",
                padding: "12px 20px",
                color: torch ? "#ffd600" : "#9ca3af",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
            >
              {torch
                ? <><LightningSlash size={16} weight="bold" /> Off</>
                : <><Lightning size={16} weight="bold" /> Flash</>
              }
            </motion.button>
          ) : (
            <div style={{ width: "80px" }} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}