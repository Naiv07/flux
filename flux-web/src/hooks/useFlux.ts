// Flux useFlux hook - v3
import { useEffect, useRef, useState, useCallback } from "react";
import type { ConnectionState } from "../types";

const SIGNALING_SERVER =
  import.meta.env.VITE_SIGNALING_SERVER || "ws://localhost:8080/ws";

// Cloudflare STUN + multiple TURN fallbacks
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:80?transport=tcp",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

const MAX_RETRIES = 3;

export function useFlux(onMessage?: (e: MessageEvent) => void) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionPath, setConnectionPath] = useState<"local" | "internet" | "relay" | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const detectPathRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCodeRef = useRef<string>("");
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);

  // ─── log ──────────────────────────────────────────────────────────────────
  const log = useCallback((msg: string) => {
    console.log("[Flux]", msg);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }, []);

  // ─── cleanup ──────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    channelRef.current?.close();
    pcRef.current?.close();
    wsRef.current?.close();
    channelRef.current = null;
    pcRef.current = null;
    wsRef.current = null;
    iceCandidateBuffer.current = [];
    remoteDescSet.current = false;
  }, []);

  // ─── stopScreenShare ──────────────────────────────────────────────────────
  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    log("Screen sharing stopped");
  }, [log]);

  // ─── detectConnectionPath ─────────────────────────────────────────────────
  const detectConnectionPath = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          stats.forEach((s) => {
            if (s.id === report.localCandidateId) {
              if (s.candidateType === "host") {
                setConnectionPath("local");
                log("Path: LOCAL network — maximum speed");
              } else if (s.candidateType === "srflx" || s.candidateType === "prflx") {
                setConnectionPath("internet");
                log("Path: INTERNET — standard speed");
              } else if (s.candidateType === "relay") {
                setConnectionPath("relay");
                log("Path: RELAY — working but slower");
              }
            }
          });
        }
      });
    } catch {
      log("Could not detect connection path");
    }
  }, [log]);

  detectPathRef.current = detectConnectionPath;

  // ─── flushIceCandidates ───────────────────────────────────────────────────
  const flushIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !remoteDescSet.current) return;
    while (iceCandidateBuffer.current.length > 0) {
      const candidate = iceCandidateBuffer.current.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        log("Flushed buffered ICE candidate");
      } catch {
        log("Failed to flush ICE candidate");
      }
    }
  }, [log]);

  // ─── setupDataChannel ─────────────────────────────────────────────────────
  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      channelRef.current = channel;

      channel.onopen = () => {
        log("Connected!");
        setConnectionState("connected");
        setConnectionStatus("Connected");
        retryCountRef.current = 0;
        setTimeout(() => detectPathRef.current?.(), 1500);
      };

      channel.onclose = () => {
        log("DataChannel closed");
        setConnectionState("disconnected");
      };

      channel.onmessage = (e) => {
        if (onMessage) {
          onMessage(e);
        }
      };
    },
    [log, onMessage]
  );

  // ─── createPeerConnection ─────────────────────────────────────────────────
  const createPeerConnection = useCallback(
    (code: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      remoteDescSet.current = false;

      pc.ontrack = (e) => {
        log("Remote stream received");
        setRemoteStream(e.streams[0]);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "ice-candidate",
              roomCode: code,
              data: e.candidate,
            })
          );
        }
      };

      pc.onicegatheringstatechange = () => {
        log(`ICE gathering: ${pc.iceGatheringState}`);
        if (pc.iceGatheringState === "gathering") {
          setConnectionStatus("Finding connection path...");
        } else if (pc.iceGatheringState === "complete") {
          setConnectionStatus("Establishing connection...");
        }
      };

      pc.oniceconnectionstatechange = () => {
        log(`ICE state: ${pc.iceConnectionState}`);
        switch (pc.iceConnectionState) {
          case "checking":
            setConnectionStatus("Checking connection paths...");
            break;
          case "connected":
          case "completed":
            setConnectionStatus("Connected!");
            break;
          case "failed":
            log("ICE failed — restarting ICE");
            setConnectionStatus("Retrying connection...");
            pc.restartIce();
            break;
          case "disconnected":
            log("ICE disconnected — may recover");
            setConnectionStatus("Connection interrupted...");
            break;
        }
      };

      pc.onconnectionstatechange = () => {
        log(`Peer connection: ${pc.connectionState}`);
        if (pc.connectionState === "failed") {
          log("Connection failed");
          setConnectionState("disconnected");
        }
      };

      pc.ondatachannel = (e) => {
        log("DataChannel received");
        setupDataChannel(e.channel);
      };

      return pc;
    },
    [setupDataChannel, log]
  );

  // ─── connectInternal ──────────────────────────────────────────────────────
  const connectInternal = useCallback(
    (code: string) => {
      cleanup();
      currentCodeRef.current = code;
      iceCandidateBuffer.current = [];
      remoteDescSet.current = false;

      setConnectionState("connecting");
      setConnectionStatus("Connecting to signaling server...");
      log(`Connecting to room: ${code} (attempt ${retryCountRef.current + 1})`);

      const ws = new WebSocket(SIGNALING_SERVER);
      wsRef.current = ws;

      // Connection timeout — only reset if not connected after 90s
      const timeout = setTimeout(() => {
        if (
          connectionState !== "connected" &&
          pcRef.current?.connectionState !== "connected"
        ) {
          log("Connection timed out");
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++;
            log(`Retrying... (${retryCountRef.current}/${MAX_RETRIES})`);
            setConnectionStatus(`Retry ${retryCountRef.current}/${MAX_RETRIES}...`);
            retryTimeoutRef.current = setTimeout(
              () => connectInternal(code),
              1000
            );
          } else {
            log("Max retries reached — giving up");
            setConnectionStatus("Connection failed — please try again");
            cleanup();
            setConnectionState("idle");
            retryCountRef.current = 0;
          }
        }
      }, 90000);

      ws.onopen = () => {
        log("Signaling server connected");
        setConnectionStatus("Waiting for peer...");
        ws.send(JSON.stringify({ type: "join", roomCode: code }));

        // Clear timeout when WS opens successfully
        clearTimeout(timeout);

        // Keep alive
        const keepAlive = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);

        ws.addEventListener("close", () => clearInterval(keepAlive));
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);

        switch (msg.type) {

          case "joined": {
            log(`Joined room — peers: ${msg.peers}`);
            if (msg.peers === 2) {
              setConnectionStatus("Peer found — connecting...");
            }
            break;
          }

          case "peer-joined": {
            log("Peer joined — creating offer");
            setConnectionStatus("Peer found — creating connection...");
            const pc = createPeerConnection(code);

            const channel = pc.createDataChannel("flux", {
              ordered: true,
            });
            setupDataChannel(channel);

            // Signal ready
            ws.send(JSON.stringify({ type: "ready", roomCode: code }));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "offer", roomCode: code, data: offer }));
            break;
          }

          case "peer-ready": {
            log("Peer is ready");
            break;
          }

          case "offer": {
            log("Offer received — creating answer");
            setConnectionStatus("Peer found — responding...");
            const pc = createPeerConnection(code);

            await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
            remoteDescSet.current = true;

            // Flush buffered candidates now that remote desc is set
            await flushIceCandidates();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", roomCode: code, data: answer }));
            break;
          }

          case "answer": {
            log("Answer received");
            await pcRef.current?.setRemoteDescription(
              new RTCSessionDescription(msg.data)
            );
            remoteDescSet.current = true;

            // Flush buffered candidates
            await flushIceCandidates();
            break;
          }

          case "ice-candidate": {
            if (!msg.data) break;

            if (remoteDescSet.current && pcRef.current) {
              try {
                await pcRef.current.addIceCandidate(
                  new RTCIceCandidate(msg.data)
                );
                log("ICE candidate added");
              } catch {
                log("ICE candidate failed — buffering");
                iceCandidateBuffer.current.push(msg.data);
              }
            } else {
              // Buffer candidate until remote description is set
              iceCandidateBuffer.current.push(msg.data);
              log(`ICE candidate buffered (${iceCandidateBuffer.current.length})`);
            }
            break;
          }

          case "peer-left": {
            log("Peer disconnected");
            setConnectionState("disconnected");
            setConnectionStatus("Peer disconnected");
            break;
          }

          case "room-full": {
            log("Room is full — try a different code");
            setConnectionStatus("Room full");
            setConnectionState("idle");
            break;
          }

          case "pong": {
            // Server acknowledged ping
            break;
          }
        }
      };

      ws.onerror = () => {
        log("WebSocket error");
        setConnectionStatus("Server connection error");
        setConnectionState("disconnected");
      };

      ws.onclose = () => {
        log("Signaling server disconnected");
      };
    },
    [cleanup, createPeerConnection, setupDataChannel, flushIceCandidates, log]
  );

  // ─── connect (public) ─────────────────────────────────────────────────────
  const connect = useCallback(
    (code: string) => {
      retryCountRef.current = 0;
      connectInternal(code);
    },
    [connectInternal]
  );

  // ─── disconnect ───────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    retryCountRef.current = 0;
    cleanup();
    setConnectionState("idle");
    setConnectionStatus("");
    setRoomCode("");
    setConnectionPath(null);
    log("Disconnected");
  }, [cleanup, log]);

  // ─── sendMessage ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (msg: string) => {
      if (channelRef.current?.readyState === "open") {
        channelRef.current.send(msg);
      } else {
        log("DataChannel not open");
      }
    },
    [log]
  );

  // ─── startScreenShare ─────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      screenStreamRef.current = stream;
      stream.getTracks().forEach((track) => {
        pcRef.current?.addTrack(track, stream);
      });
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
      log("Screen sharing started");
      return stream;
    } catch {
      log("Screen share cancelled or denied");
      return null;
    }
  }, [log, stopScreenShare]);

  // ─── cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    connectionState,
    connectionStatus,
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