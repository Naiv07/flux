import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const resolutionRef = useRef("");

  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

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
        let stream: MediaStream | null = null;

        const constraints = [
          {
            video: {
              facingMode: { exact: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          },
          {
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          },
          { video: true },
        ];

        for (const c of constraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(c);
            break;
          } catch {
            continue;
          }
        }

        if (!stream) throw new Error("No camera");
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        torchTrackRef.current = track;

        const settings = track.getSettings();
        resolutionRef.current = `${settings.width}x${settings.height}`;

        try {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any],
          });
        } catch { /* ignore */ }

        const caps = track.getCapabilities() as any;
        if (caps?.torch) setTorchSupported(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        if (!active) return;
        setLoading(false);
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied.");
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
  }, [stopCamera, retryKey]);

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
      inversionAttempts: "attemptBoth",
    });

    if (code?.data) {
      let roomCode = code.data;
      try {
        const url = new URL(code.data);
        const param = url.searchParams.get("code");
        if (param) roomCode = param;
      } catch { /* not a URL */ }

      if (roomCode.length === 6) {
        navigator.vibrate?.(100);
        setFound(true);
        stopCamera();
        setTimeout(() => onScan(roomCode.toUpperCase()), 50);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [onScan, stopCamera]);

  const handleVideoPlay = () => {
    setLoading(false);
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

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  };

  return createPortal(
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
    }}>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 88%; }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Camera */}
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

        {/* Loading spinner */}
        {loading && !error && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              border: "3px solid rgba(108,99,255,0.2)",
              borderTop: "3px solid #6c63ff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
        )}

        {/* Scan overlay — pure CSS animations */}
        {!error && !found && !loading && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {/* Vignette */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 100%)",
            }} />

            {/* Scan frame */}
            <div style={{
              position: "relative",
              width: "clamp(200px, 65vmin, 280px)",
              height: "clamp(200px, 65vmin, 280px)",
              animation: "cornerPulse 2s ease-in-out infinite",
            }}>
              {/* Four corners */}
              {[
                { top: 0, left: 0, borderTop: "3px solid #6c63ff", borderLeft: "3px solid #6c63ff", borderRadius: "4px 0 0 0" },
                { top: 0, right: 0, borderTop: "3px solid #6c63ff", borderRight: "3px solid #6c63ff", borderRadius: "0 4px 0 0" },
                { bottom: 0, left: 0, borderBottom: "3px solid #6c63ff", borderLeft: "3px solid #6c63ff", borderRadius: "0 0 0 4px" },
                { bottom: 0, right: 0, borderBottom: "3px solid #6c63ff", borderRight: "3px solid #6c63ff", borderRadius: "0 0 4px 0" },
              ].map((s, i) => (
                <div key={i} style={{
                  position: "absolute",
                  width: "28px",
                  height: "28px",
                  ...s,
                }} />
              ))}

              {/* Scan line — CSS animation only */}
              <div style={{
                position: "absolute",
                left: "4px",
                right: "4px",
                height: "2px",
                background: "linear-gradient(90deg, transparent, #6c63ff, #00d4ff, #6c63ff, transparent)",
                boxShadow: "0 0 8px rgba(108,99,255,0.8)",
                borderRadius: "1px",
                animation: "scanLine 2.5s ease-in-out infinite",
              }} />
            </div>

            {/* Hint */}
            <p style={{
              position: "absolute",
              bottom: "28%",
              left: 0,
              right: 0,
              textAlign: "center",
              color: "rgba(255,255,255,0.6)",
              fontSize: "12px",
              fontWeight: "500",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}>
              Align the QR code within the frame
            </p>
          </div>
        )}

        {/* Success */}
        {found && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,255,136,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}>
            <div style={{
              background: "rgba(0,255,136,0.2)",
              border: "2px solid #00ff88",
              borderRadius: "50%",
              width: "80px",
              height: "80px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              animation: "successPop 0.4s ease",
            }}>
              ✓
            </div>
          </div>
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
            background: "rgba(0,0,0,0.85)",
          }}>
            <Camera size={48} color="#6b7280" />
            <p style={{
              color: "#e8e8f0",
              fontSize: "15px",
              fontWeight: "600",
              textAlign: "center",
            }}>
              {error}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleRetry}
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
                Try Again
              </button>
              <button
                onClick={handleClose}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "12px 24px",
                  color: "#9ca3af",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Top label */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingBottom: "16px",
          paddingLeft: "20px",
          paddingRight: "20px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <p style={{
            color: "#e8e8f0",
            fontSize: "15px",
            fontWeight: "600",
          }}>
            Scan Flux QR Code
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{
        background: "rgba(8,8,32,0.97)",
        padding: "16px 24px",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
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
            touchAction: "manipulation",
          }}
        >
          <X size={16} weight="bold" />
          Cancel
        </button>

        <p style={{ color: "#6b7280", fontSize: "12px" }}>
          {found ? "✓ Code found!" : loading ? "Starting camera..." : "Scanning..."}
        </p>

        {torchSupported ? (
          <button
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
              touchAction: "manipulation",
            }}
          >
            {torch
              ? <><LightningSlash size={16} weight="bold" /> Off</>
              : <><Lightning size={16} weight="bold" /> Flash</>
            }
          </button>
        ) : (
          <div style={{ width: "80px" }} />
        )}
      </div>
    </div>,
    document.body
  );
}
