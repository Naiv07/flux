import { PathBadge } from "./components/PathBadge";
import { NetworkBanner } from "./components/NetworkBanner";
import { generateRoomCode } from "./lib/transferStore";
import { useRef, useState, useEffect } from "react";
import { useFlux } from "./hooks/useFlux";
import { useFileTransfer } from "./hooks/useFileTransfer";
import { ParticleBackground } from "./components/ParticleBackground";
import { ConnectionCard } from "./components/ConnectionCard";
import { TransferCard } from "./components/TransferCard";
import { ModeSelectCard } from "./components/ModeSelectCard";
import { DiscoverCard } from "./components/DiscoverCard";

 const SIGNALING_SERVER_URL =
  import.meta.env.VITE_SIGNALING_SERVER ||
  "ws://localhost:8080/ws";

function App() {
  const mq = window.matchMedia("(max-width: 767px)");
  const [isMobileView, setIsMobileView] = useState(mq.matches);

  useEffect(() => {
    const handleChange = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const [mode, setMode] = useState<"send" | "receive" | null>(null);
  const [showDisconnectedToast, setShowDisconnectedToast] = useState(false);
  const onMessageRef = useRef<((e: MessageEvent) => void) | null>(null);
  const isConnectingRef = useRef(false);

  // Check for ?code= in URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code");
    if (codeFromUrl && codeFromUrl.length === 6) {
      const code = codeFromUrl.toUpperCase();
      setMode("receive");
      setRoomCode(code);
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-connect after a moment
      setTimeout(() => connect(code), 500);
    }
  }, []);

  const handleSetMode = (selectedMode: "send" | "receive") => {
    if (isConnectingRef.current) return;
    if (connectionState === "connecting" || connectionState === "connected") return;

    isConnectingRef.current = true;
    setMode(selectedMode);

    if (selectedMode === "send") {
      const code = generateRoomCode();
      setRoomCode(code);
      setTimeout(() => {
        connect(code);
        isConnectingRef.current = false;
      }, 50);
    } else {
      isConnectingRef.current = false;
      prewarm();
    }
  };

    const {
    connectionState,
    connectionStatus,
    roomCode,
    setRoomCode,
    connect,
    channel,
    disconnect,
    connectionPath,
    prewarm,
  } = useFlux((e) => onMessageRef.current?.(e));

  const {
    progress,
    sendFile,
    handleMessage,
    formatBytes,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
  } = useFileTransfer(channel);

  onMessageRef.current = handleMessage;

  const isConnected = connectionState === "connected";
// Handle mobile back gesture
  useEffect(() => {
    // Push initial state
    window.history.pushState({ screen: "home" }, "");

    const handlePopState = () => {
      if (isConnected) {
        // If connected, back disconnects
        disconnect();
        setMode(null);
        window.history.pushState({ screen: "home" }, "");
      } else if (mode) {
        // If on connection screen, back goes to mode select
        isConnectingRef.current = false;
        disconnect();
        setMode(null);
        setRoomCode("");
        window.history.pushState({ screen: "home" }, "");
      }
      // If on home — let browser handle (closes PWA)
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [mode, isConnected, disconnect, setRoomCode]);

  // Push history state when entering a screen
  useEffect(() => {
    if (mode) {
      window.history.pushState({ screen: "connection" }, "");
    }
  }, [mode]);

  useEffect(() => {
    if (isConnected) {
      window.history.pushState({ screen: "connected" }, "");
    }
  }, [isConnected]);

  useEffect(() => {
    if (connectionState === "disconnected") {
      setShowDisconnectedToast(true);
      const timer = setTimeout(() => {
        setShowDisconnectedToast(false);
        disconnect();
        setMode(null);
        setRoomCode("");
        isConnectingRef.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionState, disconnect]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (progress.status === "sending" || progress.status === "receiving") {
        e.preventDefault();
        e.returnValue = "Transfer in progress. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [progress.status]);


  // Wrap disconnect to also reset mode
  const handleDisconnect = () => {
    isConnectingRef.current = false;
    disconnect();
    setMode(null);
  };

  const handleBack = () => {
    isConnectingRef.current = false;
    disconnect();
    setMode(null);
    setRoomCode("");
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      paddingTop: "max(16px, env(safe-area-inset-top))",
      paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      paddingLeft: "max(16px, env(safe-area-inset-left))",
      paddingRight: "max(16px, env(safe-area-inset-right))",
      gap: "16px",
      position: "relative",
      overflowX: "hidden",
      overflowY: "auto",
      boxSizing: "border-box",
      width: "100%",
    }}>
      <ParticleBackground connected={isConnected} />

      {/* Disconnected toast */}
      {showDisconnectedToast && (
        <div style={{
          position: "fixed",
          bottom: "max(32px, env(safe-area-inset-bottom))",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15,15,40,0.95)",
          border: "1px solid rgba(255,100,100,0.2)",
          borderRadius: "14px",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#ff6b6b",
          }} />
          <p style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "#e8e8f0",
          }}>
            Disconnected — returning to dashboard
          </p>
        </div>
      )}

      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: isMobileView ? "100%" : "900px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        margin: "0 auto",
      }}>
        <NetworkBanner fileSize={progress.fileSize} />

        {!mode && <ModeSelectCard setMode={handleSetMode} />}

        {/* Single unified block — ConnectionCard never remounts when connecting */}
        {mode && (
          <div style={{
            display: "grid",
            gridTemplateColumns: !isMobileView && isConnected
              ? "repeat(auto-fit, minmax(380px, 1fr))"
              : "1fr",
            gap: isMobileView ? "12px" : "16px",
            width: "100%",
            alignItems: "start",
            overflowX: "hidden",
          }}>
            {/* Desktop only: PathBadge above both cards as a header row */}
            {isConnected && !isMobileView && (
              <div style={{ gridColumn: "1 / -1" }}>
                <PathBadge path={connectionPath} />
              </div>
            )}

            <div style={!isConnected ? { maxWidth: "448px", width: "100%", margin: "0 auto" } : undefined}>
              <ConnectionCard
                key={mode}
                connectionStatus={connectionStatus}
                connectionState={connectionState}
                roomCode={roomCode}
                setRoomCode={setRoomCode}
                connect={connect}
                disconnect={handleDisconnect}
                mode={mode}
                goBack={handleBack}
              />
            </div>

            {!isConnected && mode === "receive" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <DiscoverCard
                  key="discover"
                  onConnect={(code) => {
                    setRoomCode(code);
                    connect(code);
                  }}
                  signalingUrl={SIGNALING_SERVER_URL}
                />
              </div>
            )}

            {isConnected && (
              <TransferCard
                progress={progress}
                sendFile={sendFile}
                formatBytes={formatBytes}
                pauseTransfer={pauseTransfer}
                resumeTransfer={resumeTransfer}
                cancelTransfer={cancelTransfer}
              />
            )}

            {/* Mobile only: PathBadge below both cards so ConnectionCard never shifts */}
            {isConnected && isMobileView && (
              <PathBadge path={connectionPath} />
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default App;