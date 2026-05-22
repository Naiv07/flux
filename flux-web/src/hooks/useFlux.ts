import { useEffect, useRef, useState, useCallback } from "react";
import type { ConnectionState } from "../types";

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || "ws://localhost:8080/ws";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

export function useFlux(onMessage?: (e: MessageEvent) => void) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null); 
  const [connectionPath, setConnectionPath] = useState<"local" | "internet" | "relay" | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  const log = useCallback((msg: string) => {
    console.log("[Flux]", msg);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()} — ${msg}`,
    ]);
  }, []);

  const cleanup = useCallback(() => {
    channelRef.current?.close();
    pcRef.current?.close();
    wsRef.current?.close();
    channelRef.current = null;
    pcRef.current = null;
    wsRef.current = null;
  }, []);

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      channelRef.current = channel;

      channel.onopen = () => {
        log("DataChannel open — peers connected!");
        setConnectionState("connected");
        // Detect path after a moment (ICE needs time to settle)
        setTimeout(() => detectConnectionPath(), 1000);
      };

      channel.onclose = () => {
        log("DataChannel closed");
        setConnectionState("disconnected");
      };

      channel.onmessage = (e) => {
        if (onMessage) {
          onMessage(e);
        } else {
          log(`Message received: ${e.data}`);
        }
      };
    },
    [log, onMessage]
  );

  const createPeerConnection = useCallback(
    (code: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Receive remote screen share
      pc.ontrack = (e) => {
        log("Remote stream received");
        setRemoteStream(e.streams[0]);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: "ice-candidate",
              roomCode: code,
              data: e.candidate,
            })
          );
        }
      };

      pc.onconnectionstatechange = () => {
        log(`Connection state: ${pc.connectionState}`);
      };

      pc.ondatachannel = (e) => {
        log("DataChannel received");
        setupDataChannel(e.channel);
      };

      return pc;
    },
    [setupDataChannel, log]
  );

  const connect = useCallback(
    (code: string) => {
      cleanup();
      setConnectionState("connecting");
      log(`Connecting to room: ${code}`);

      const ws = new WebSocket(SIGNALING_SERVER);
      wsRef.current = ws;

      ws.onopen = () => {
        log("Signaling server connected");
        ws.send(JSON.stringify({ type: "join", roomCode: code }));
      };
      // Keep signaling server alive
      const keepAlive = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000); // ping every 25 seconds

      ws.onclose = () => {
        clearInterval(keepAlive);
        log("Signaling server disconnected");
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);

        switch (msg.type) {
          case "peer-joined": {
            log("Peer joined — creating offer");
            const pc = createPeerConnection(code);
            const channel = pc.createDataChannel("flux");
            setupDataChannel(channel);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(
              JSON.stringify({
                type: "offer",
                roomCode: code,
                data: offer,
              })
            );
            break;
          }

          case "offer": {
            log("Offer received — creating answer");
            const pc = createPeerConnection(code);
            await pc.setRemoteDescription(
              new RTCSessionDescription(msg.data)
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(
              JSON.stringify({
                type: "answer",
                roomCode: code,
                data: answer,
              })
            );
            break;
          }

          case "answer": {
            log("Answer received");
            await pcRef.current?.setRemoteDescription(
              new RTCSessionDescription(msg.data)
            );
            break;
          }

          case "ice-candidate": {
            log("ICE candidate received");
            await pcRef.current?.addIceCandidate(
              new RTCIceCandidate(msg.data)
            );
            break;
          }

          case "peer-left": {
            log("Peer disconnected");
            setConnectionState("disconnected");
            break;
          }

          case "room-full": {
            log("Room is full");
            setConnectionState("idle");
            break;
          }
        }
      };

      ws.onerror = () => {
        log("WebSocket error");
        setConnectionState("disconnected");
      };

      ws.onclose = () => {
        log("Signaling server disconnected");
      };
    },
    [cleanup, createPeerConnection, setupDataChannel, log]
  );

  const sendMessage = useCallback(
    (msg: string) => {
      if (channelRef.current?.readyState === "open") {
        channelRef.current.send(msg);
        log(`Message sent: ${msg}`);
      } else {
        log("DataChannel not open yet");
      }
    },
    [log]
  );

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState("idle");
    setRoomCode("");
    setConnectionPath(null);  // ← add this
    log("Disconnected");
  }, [cleanup, log]);

  // Screen sharing
  const screenStreamRef = useRef<MediaStream | null>(null);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });

      screenStreamRef.current = stream;

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pcRef.current?.addTrack(track, stream);
      });

      // Stop sharing when user clicks browser's stop button
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      log("Screen sharing started");
      return stream;
    } catch (err) {
      log("Screen share cancelled or denied");
      return null;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    log("Screen sharing stopped");
  }, []);

  const detectConnectionPath = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          // Find the local candidate type
          stats.forEach((s) => {
            if (s.id === report.localCandidateId) {
              if (s.candidateType === "host") {
                setConnectionPath("local");
                log("Connection path: LOCAL network (fast)");
              } else if (s.candidateType === "srflx" || s.candidateType === "prflx") {
                setConnectionPath("internet");
                log("Connection path: INTERNET (standard)");
              } else if (s.candidateType === "relay") {
                setConnectionPath("relay");
                log("Connection path: RELAY (slow)");
              }
            }
          });
        }
      });
    } catch (err) {
      console.log("[Flux] Could not detect path");
    }
  }, [log]);

  return {
    connectionState,
    roomCode,
    setRoomCode,
    connect,
    sendMessage,
    logs,
    channel: channelRef.current,
    disconnect,
    startScreenShare,
    stopScreenShare,
    remoteStream,
    connectionPath,
  };
}