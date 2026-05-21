import { useRef, useState } from "react";
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

  // Wrap disconnect to also reset mode
  const handleDisconnect = () => {
    disconnect();
    setMode(null);
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
        {/* Step 1: Pick mode */}
        {!mode && <ModeSelectCard setMode={setMode} />}

        {/* Step 2: Connect */}
        {mode && (
          <ConnectionCard
            connectionState={connectionState}
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            connect={connect}
            disconnect={handleDisconnect}
            mode={mode}
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