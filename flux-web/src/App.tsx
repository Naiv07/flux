import { useRef } from "react";
import { useFlux } from "./hooks/useFlux";
import { useFileTransfer } from "./hooks/useFileTransfer";
import { ParticleBackground } from "./components/ParticleBackground";
import { ConnectionCard } from "./components/ConnectionCard";
import { TransferCard } from "./components/TransferCard";
import { ScreenShareCard } from "./components/ScreenShareCard";

function App() {
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

  const { progress, sendFile, handleMessage, formatBytes } =
    useFileTransfer(channel);

  onMessageRef.current = handleMessage;

  const isConnected = connectionState === "connected";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      gap: "16px",
      position: "relative",
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
        <ConnectionCard
          connectionState={connectionState}
          roomCode={roomCode}
          setRoomCode={setRoomCode}
          connect={connect}
          disconnect={disconnect}
        />
        {isConnected && (
          <>
            <TransferCard
              progress={progress}
              sendFile={sendFile}
              formatBytes={formatBytes}
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