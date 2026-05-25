// Flux useFlux hook - v4
import { useEffect, useRef, useState, useCallback } from "react";
import type { ConnectionState } from "../types";

const SIGNALING_SERVER =
  import.meta.env.VITE_SIGNALING_SERVER || "ws://localhost:8080/ws";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

// WebSocket relay channel — wraps WS into DataChannel-like interface
class WSRelay {
  private ws: WebSocket;
  private roomCode: string;
  public onmessage: ((e: MessageEvent) => void) | null = null;
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public readyState: string = "connecting";

  constructor(ws: WebSocket, roomCode: string) {
    this.ws = ws;
    this.roomCode = roomCode;
  }

  send(data: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "relay-data",
        roomCode: this.roomCode,
        data: data,
      }));
    }
  }

  close() {
    this.readyState = "closed";
    if (this.onclose) this.onclose();
  }

  handleRelayData(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  setOpen() {
    this.readyState = "open";
    if (this.onopen) this.onopen();
  }
}

export function useFlux(onMessage?: (e: MessageEvent) => void) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionPath, setConnectionPath] = useState<"local" | "internet" | "relay" | "ws-relay" | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | WSRelay | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const detectPathRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);
  const wsRelayRef = useRef<WSRelay | null>(null);
  const webrtcFailedRef = useRef(false);
  const currentCodeRef = useRef("");
  const webrtcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const log = useCallback((msg: string) => {
    console.log("[Flux]", msg);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }, []);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (webrtcTimeoutRef.current) clearTimeout(webrtcTimeoutRef.current);
    retryTimeoutRef.current = null;
    webrtcTimeoutRef.current = null;
    channelRef.current?.close();
    pcRef.current?.close();
    wsRef.current?.close();
    channelRef.current = null;
    pcRef.current = null;
    wsRef.current = null;
    wsRelayRef.current = null;
    iceCandidateBuffer.current = [];
    remoteDescSet.current = false;
    webrtcFailedRef.current = false;
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    log("Screen sharing stopped");
  }, [log]);

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
                log("Path: LOCAL network");
              } else if (s.candidateType === "srflx" || s.candidateType === "prflx") {
                setConnectionPath("internet");
                log("Path: INTERNET");
              } else if (s.candidateType === "relay") {
                setConnectionPath("relay");
                log("Path: TURN RELAY");
              }
            }
          });
        }
      });
    } catch {
      log("Could not detect path");
    }
  }, [log]);

  detectPathRef.current = detectConnectionPath;

  const flushIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !remoteDescSet.current) return;
    while (iceCandidateBuffer.current.length > 0) {
      const candidate = iceCandidateBuffer.current.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        log("Failed to flush ICE candidate");
      }
    }
  }, [log]);

  // ── WebSocket Relay Fallback ───────────────────────────────────────────────
  const startWSRelay = useCallback((code: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    log("WebRTC failed — switching to WebSocket relay");
    setConnectionStatus("Switching to relay mode...");
    webrtcFailedRef.current = true;

    // Close WebRTC
    pcRef.current?.close();
    pcRef.current = null;

    // Create relay wrapper
    const relay = new WSRelay(ws, code);
    wsRelayRef.current = relay;
    channelRef.current = relay;

    // Request relay from server
    ws.send(JSON.stringify({ type: "relay-request", roomCode: code }));

    // Set up relay message handler
    relay.onopen = () => {
      log("WebSocket relay connected!");
      setConnectionState("connected");
      setConnectionPath("ws-relay");
      setConnectionStatus("Connected via relay");
      if (webrtcTimeoutRef.current) {
        clearTimeout(webrtcTimeoutRef.current);
      }
    };

    relay.onmessage = (e) => {
      if (onMessage) onMessage(e);
    };

  }, [log, onMessage]);

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      channelRef.current = channel;

      channel.onopen = () => {
        log("WebRTC DataChannel open!");
        setConnectionState("connected");
        setConnectionStatus("Connected");
        if (webrtcTimeoutRef.current) {
          clearTimeout(webrtcTimeoutRef.current);
        }
        setTimeout(() => detectPathRef.current?.(), 1500);
      };

      channel.onclose = () => {
        log("DataChannel closed");
        if (!webrtcFailedRef.current) {
          setConnectionState("disconnected");
        }
      };

      channel.onmessage = (e) => {
        if (onMessage) onMessage(e);
      };
    },
    [log, onMessage]
  );

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
          wsRef.current.send(JSON.stringify({
            type: "ice-candidate",
            roomCode: code,
            data: e.candidate,
          }));
        }
      };

      pc.onicegatheringstatechange = () => {
        log(`ICE gathering: ${pc.iceGatheringState}`);
        if (pc.iceGatheringState === "gathering") {
          setConnectionStatus("Finding connection path...");
        }
        if (pc.iceGatheringState === "complete") {
          setConnectionStatus("Trying to connect...");
        }
      };

      pc.oniceconnectionstatechange = () => {
        log(`ICE: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed") {
          if (webrtcTimeoutRef.current) {
            clearTimeout(webrtcTimeoutRef.current);
          }
        }
        if (pc.iceConnectionState === "failed") {
          log("ICE failed — trying WebSocket relay");
          startWSRelay(code);
        }
        if (pc.iceConnectionState === "disconnected") {
          setConnectionStatus("Connection interrupted...");
        }
      };

      pc.onconnectionstatechange = () => {
        log(`Connection: ${pc.connectionState}`);
        if (pc.connectionState === "failed") {
          log("WebRTC failed — falling back to relay");
          startWSRelay(code);
        }
      };

      pc.ondatachannel = (e) => {
        log("DataChannel received");
        setupDataChannel(e.channel);
      };

      return pc;
    },
    [setupDataChannel, startWSRelay, log]
  );

  const connectInternal = useCallback(
    (code: string) => {
      cleanup();
      currentCodeRef.current = code;

      setConnectionState("connecting");
      setConnectionStatus("Connecting...");
      log(`Connecting to room: ${code}`);

      const ws = new WebSocket(SIGNALING_SERVER);
      wsRef.current = ws;

      // WebRTC timeout — after 15s fall back to WS relay
      webrtcTimeoutRef.current = setTimeout(() => {
        if (connectionState !== "connected") {
          log("WebRTC timeout — switching to WebSocket relay");
          startWSRelay(code);
        }
      }, 15000);

      ws.onopen = () => {
        log("Signaling server connected");
        setConnectionStatus("Waiting for peer...");
        ws.send(JSON.stringify({ type: "join", roomCode: code }));

        const keepAlive = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);

        ws.addEventListener("close", () => clearInterval(keepAlive));
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);

        // Handle relay data
        if (msg.type === "relay-data" && wsRelayRef.current) {
          wsRelayRef.current.handleRelayData(msg.data);
          return;
        }

        // Handle relay ready
        if (msg.type === "relay-start") {
          log("Peer switching to relay mode");
          if (!wsRelayRef.current) {
            startWSRelay(code);
          }
          return;
        }

        if (msg.type === "relay-ready") {
          log(`Relay ready — both ready: ${msg.bothReady}`);
          if (wsRelayRef.current) {
            wsRelayRef.current.setOpen();
          }
          return;
        }

        switch (msg.type) {
          case "joined": {
            log(`Joined — peers: ${msg.peers}`);
            break;
          }

          case "peer-joined": {
            log("Peer joined — creating offer");
            setConnectionStatus("Peer found — connecting...");
            const pc = createPeerConnection(code);
            const channel = pc.createDataChannel("flux", { ordered: true });
            setupDataChannel(channel);
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
            log("Offer received");
            setConnectionStatus("Responding to peer...");
            const pc = createPeerConnection(code);
            await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
            remoteDescSet.current = true;
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
            await flushIceCandidates();
            break;
          }

          case "ice-candidate": {
            if (!msg.data) break;
            if (remoteDescSet.current && pcRef.current) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.data));
              } catch {
                iceCandidateBuffer.current.push(msg.data);
              }
            } else {
              iceCandidateBuffer.current.push(msg.data);
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
            log("Room full");
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
        log("Signaling disconnected");
      };
    },
    [cleanup, createPeerConnection, setupDataChannel,
     flushIceCandidates, startWSRelay, log]
  );

  const connect = useCallback(
    (code: string) => {
      retryCountRef.current = 0;
      connectInternal(code);
    },
    [connectInternal]
  );

  const disconnect = useCallback(() => {
    retryCountRef.current = 0;
    cleanup();
    setConnectionState("idle");
    setConnectionStatus("");
    setRoomCode("");
    setConnectionPath(null);
    log("Disconnected");
  }, [cleanup, log]);

  const sendMessage = useCallback(
    (msg: string) => {
      const ch = channelRef.current;
      if (ch && ch.readyState === "open") {
        ch.send(msg);
      } else {
        log("Channel not open");
      }
    },
    [log]
  );

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
      log("Screen share cancelled");
      return null;
    }
  }, [log, stopScreenShare]);

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
    channel: channelRef.current as RTCDataChannel | null,
    disconnect,
    startScreenShare,
    stopScreenShare,
    remoteStream,
    connectionPath,
  };
}