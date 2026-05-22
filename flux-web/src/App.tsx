import { PathBadge } from "./components/PathBadge";
import { NetworkBanner } from "./components/NetworkBanner";
import { generateRoomCode } from "./lib/transferStore";
import { useRef, useState, useEffect } from "react";
import { useFlux } from "./hooks/useFlux";
import { useFileTransfer } from "./hooks/useFileTransfer";
import { ParticleBackground } from "./components/ParticleBackground";
import { ConnectionCard } from "./components/ConnectionCard";
import { TransferCard } from "./components/TransferCard";
import { ScreenShareCard } from "./components/ScreenShareCard";
import { ModeSelectCard } from "./components/ModeSelectCard";

function App() {
  const [mode, setMode] = useState<"send" | "receive" | null>(null);
  const onMessageRef = useRef<((e: MessageEvent) => void) | null>(null);

  const handleSetMode = (selectedMode: "send" | "receive") => {
    setMode(selectedMode);
    if (selectedMode === "send") {
      const code = generateRoomCode();
      setRoomCode(code);
      // Auto-connect immediately
      setTimeout(() => connect(code), 100);
    }
  };

    const {
    connectionState,
    roomCode,
    setRoomCode,
    connect,
    channel,
    disconnect,
    startScreenShare,
    stopScreenShare,
    remoteStream,
    connectionPath,
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
    disconnect();
    setMode(null);
  };

  const handleBack = () => {
    setMode(null);
    setRoomCode("");
    disconnect();
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",      // centers horizontally
      justifyContent: "center",  // centers vertically
      padding: "24px",
      gap: "16px",
      position: "relative",
      overflowY: "auto",
    }}>
      <ParticleBackground connected={isConnected} />

      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: isConnected ? "1200px" : "448px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",    // ← ADD THIS — centers children
        gap: "16px",
        margin: "0 auto",        // ← ADD THIS — centers the container
        transition: "max-width 0.4s ease",
      }}>
        <NetworkBanner fileSize={progress.fileSize} />

        {!mode && <ModeSelectCard setMode={handleSetMode} />}

        {mode && !isConnected && (
          <ConnectionCard
            connectionState={connectionState}
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            connect={connect}
            disconnect={handleDisconnect}
            mode={mode}
            goBack={handleBack}
          />
        )}

        {/* Connected — show cards side by side on desktop */}
        {isConnected && mode && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: "16px",
            width: "100%",
          }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <PathBadge path={connectionPath} />
            </div>
            <ConnectionCard
              connectionState={connectionState}
              roomCode={roomCode}
              setRoomCode={setRoomCode}
              connect={connect}
              disconnect={handleDisconnect}
              mode={mode}
              goBack={handleBack}
            />

            <TransferCard
              progress={progress}
              sendFile={sendFile}
              formatBytes={formatBytes}
              pauseTransfer={pauseTransfer}
              resumeTransfer={resumeTransfer}
              cancelTransfer={cancelTransfer}
            />

            <ScreenShareCard
              startScreenShare={startScreenShare}
              stopScreenShare={stopScreenShare}
              remoteStream={remoteStream}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;