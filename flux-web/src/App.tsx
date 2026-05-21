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
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      gap: "12px",
      position: "relative",
      overflowY: "auto",
    }}>
      <ParticleBackground connected={isConnected} />

      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: "448px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>

        <NetworkBanner fileSize={progress.fileSize} />
        
        {/* Step 1: Pick mode */}
        {!mode && <ModeSelectCard setMode={handleSetMode} />}

        {/* Step 2: Connect */}
        {mode && (
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

        {/* Step 3: Send mode shows transfer + screen share */}
        {isConnected && mode === "send" && (
          <>
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
          </>
        )}

        {/* Step 4: Receive mode shows progress + screen */}
        {isConnected && mode === "receive" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default App;