// Flux useFlux hook - v4
import { useEffect, useRef, useState, useCallback } from "react";
import type { ConnectionState } from "../types";

const SIGNALING_SERVER =
  import.meta.env.VITE_SIGNALING_SERVER || "ws://localhost:8080/ws";

const isDev = import.meta.env.DEV;

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
  iceTransportPolicy: "all",
};

// WebSocket relay channel — wraps WS into DataChannel-like interface
class WSRelay {
  private ws: WebSocket;
  private roomCode: string;
  public onmessage: ((e: MessageEvent) => void) | null = null;
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public readyState: string = "connecting";
  public bufferedAmount: number = 0;
  public bufferedAmountLowThreshold: number = 0;
  public onbufferedamountlow: (() => void) | null = null;

  constructor(ws: WebSocket, roomCode: string) {
    this.ws = ws;
    this.roomCode = roomCode;
  }

  send(data: string | ArrayBuffer) {
    if (this.ws.readyState !== WebSocket.OPEN) return;

    if (typeof data === "string") {
      // Text — wrap in JSON as before
      this.ws.send(JSON.stringify({
        type: "relay-data",
        roomCode: this.roomCode,
        dataType: "string",
        data: data,
      }));
    } else {
      // Binary — prepend 8-byte room code header so server can route it
      const encoder = new TextEncoder();
      const roomBytes = encoder.encode(this.roomCode.padEnd(8, " "));
      const combined = new Uint8Array(roomBytes.length + (data as ArrayBuffer).byteLength);
      combined.set(roomBytes, 0);
      combined.set(new Uint8Array(data as ArrayBuffer), roomBytes.length);
      this.ws.send(combined.buffer);
    }
  }

  close() {
    this.readyState = "closed";
    if (this.onclose) this.onclose();
  }

  handleRelayData(dataType: string, data: string) {
    if (!this.onmessage) return;
    if (dataType === "binary") {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      this.onmessage(new MessageEvent("message", { data: bytes.buffer }));
    } else {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  handleBinaryData(data: ArrayBuffer) {
    if (!this.onmessage) return;
    // Strip the 8-byte room code header
    const payload = data.slice(8);
    this.onmessage(new MessageEvent("message", { data: payload }));
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
  const [connectionPath, setConnectionPath] = useState<"local" | "internet" | "relay" | "ws-relay" | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [activeChannel, setActiveChannel] = useState<RTCDataChannel | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const prewarmWsRef = useRef<WebSocket | null>(null);
  const prewarmReadyRef = useRef(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | WSRelay | null>(null);
  const detectPathRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);
  const wsRelayRef = useRef<WSRelay | null>(null);
  const webrtcFailedRef = useRef(false);
  const relayStartedRef = useRef(false);
  const currentCodeRef = useRef("");
  const webrtcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionStateRef = useRef<ConnectionState>("idle");
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const log = useCallback((msg: string) => {
    if (isDev) console.log("[Flux]", msg);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }, []);

  const setConnectionStateSafe = useCallback((state: ConnectionState) => {
    connectionStateRef.current = state;
    setConnectionState(state);
  }, []);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (webrtcTimeoutRef.current) clearTimeout(webrtcTimeoutRef.current);
    if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    retryTimeoutRef.current = null;
    webrtcTimeoutRef.current = null;
    visibilityTimeoutRef.current = null;
    keepAliveRef.current = null;
    if (prewarmWsRef.current) {
      prewarmWsRef.current.close();
      prewarmWsRef.current = null;
      prewarmReadyRef.current = false;
    }
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
    relayStartedRef.current = false;
    setActiveChannel(null);
  }, []);

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
    // Atomic guard — prevent double init
    if (relayStartedRef.current) {
      log("Relay already started — ignoring duplicate call");
      return;
    }
    relayStartedRef.current = true;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log("WebSocket not available for relay");
      relayStartedRef.current = false;
      return;
    }
    if (wsRelayRef.current) {
      log("Relay already active");
      return;
    }

    log("Starting WebSocket relay");
    setConnectionStatus("Relay ready — waiting for peer...");
    webrtcFailedRef.current = true;

    pcRef.current?.close();
    pcRef.current = null;

    const relay = new WSRelay(ws, code);
    wsRelayRef.current = relay;
    channelRef.current = relay as unknown as RTCDataChannel;
    setActiveChannel(relay as unknown as RTCDataChannel);

    relay.onmessage = (e) => {
      if (onMessage) onMessage(e);
    };

    // Request relay from server — it tells us peer count
    ws.send(JSON.stringify({ type: "relay-request", roomCode: code }));
  }, [log, onMessage, setConnectionStateSafe]);

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      // Don't override relay if we've already switched
      if (webrtcFailedRef.current) {
        log("Ignoring WebRTC channel — relay active");
        return;
      }
      channelRef.current = channel;

      channel.onopen = () => {
        log("WebRTC DataChannel open!");
        channelRef.current = channel;
        setActiveChannel(channel);
        setConnectionStateSafe("connected");
        setConnectionStatus("Connected");
        if (webrtcTimeoutRef.current) {
          clearTimeout(webrtcTimeoutRef.current);
        }
        setTimeout(() => detectPathRef.current?.(), 1500);
      };

      channel.onclose = () => {
        log("DataChannel closed");
        if (!webrtcFailedRef.current) {
          setConnectionStateSafe("disconnected");
        }
      };

      channel.onmessage = (e) => {
        if (onMessage) onMessage(e);
      };
    },
    [log, onMessage, setConnectionStateSafe]
  );

  const createPeerConnection = useCallback(
    (code: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      remoteDescSet.current = false;

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
        if (pc.iceGatheringState === "complete") {
          log("ICE gathering complete");
          setConnectionStatus("Trying to connect...");
        }
      };

      pc.oniceconnectionstatechange = () => {
        log(`ICE: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "failed") {
          log("ICE failed — falling back to relay immediately");
          if (webrtcTimeoutRef.current) {
            clearTimeout(webrtcTimeoutRef.current);
            webrtcTimeoutRef.current = null;
          }
          startWSRelay(code);
        }
      };

      pc.onconnectionstatechange = () => {
        log(`Connection: ${pc.connectionState}`);
      };

      pc.ondatachannel = (e) => {
        log("DataChannel received");
        setupDataChannel(e.channel);
      };

      return pc;
    },
    [setupDataChannel, startWSRelay, log, setConnectionStateSafe]
  );

  const connectInternal = useCallback(
    (code: string) => {
      cleanup();
      currentCodeRef.current = code;

      setConnectionStateSafe("connecting");
      setConnectionStatus("Connecting...");
      log(`Connecting to room: ${code}`);

      let ws: WebSocket;
      if (prewarmWsRef.current && prewarmReadyRef.current) {
        log("Reusing pre-warmed WebSocket");
        ws = prewarmWsRef.current;
        prewarmWsRef.current = null;
        prewarmReadyRef.current = false;
      } else {
        if (prewarmWsRef.current) {
          // Pre-warm in-progress but not open yet — discard cleanly
          prewarmWsRef.current.onopen = null;
          prewarmWsRef.current.onerror = null;
          prewarmWsRef.current.onclose = null;
          prewarmWsRef.current.close();
          prewarmWsRef.current = null;
          prewarmReadyRef.current = false;
        }
        ws = new WebSocket(SIGNALING_SERVER);
        ws.binaryType = "arraybuffer";
      }
      wsRef.current = ws;

      // After 8s with no WebRTC — fall back to relay, stay in connecting state
      webrtcTimeoutRef.current = setTimeout(() => {
        const ice = pcRef.current?.iceConnectionState;
        if (ice !== "connected" && ice !== "completed") {
          log("WebRTC didn't connect — trying relay");
          startWSRelay(code);
          // Don't set idle — just try relay, stay in connecting state
        }
      }, 8000);

      ws.onopen = () => {
        log("Signaling server connected");
        setConnectionStatus("Waiting for peer...");
        ws.send(JSON.stringify({ type: "join", roomCode: code }));

        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
        keepAliveRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = async (e) => {
        // Handle binary relay data
        if (e.data instanceof ArrayBuffer || e.data instanceof Blob) {
          if (wsRelayRef.current) {
            const buffer = e.data instanceof Blob
              ? await e.data.arrayBuffer()
              : e.data;
            wsRelayRef.current.handleBinaryData(buffer);
          }
          return;
        }

        const msg = JSON.parse(e.data);

        // Text relay data
        if (msg.type === "relay-data" && wsRelayRef.current) {
          wsRelayRef.current.handleRelayData(msg.dataType ?? "string", msg.data);
          return;
        }

        // Handle relay ready
        if (msg.type === "relay-start") {
          log(`Relay start — peers: ${msg.peers}`);
          if (!relayStartedRef.current) {
            startWSRelay(code);
          }
          // If both peers present, mark connected
          if (msg.peers >= 2 && wsRelayRef.current) {
            wsRelayRef.current.setOpen();
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
            setActiveChannel(wsRelayRef.current as unknown as RTCDataChannel);
            setConnectionStateSafe("connected");
            setConnectionPath("ws-relay");
            setConnectionStatus("Connected via relay");
            log("Relay connected — both peers present!");
          }
          return;
        }

        if (msg.type === "relay-ready") {
          log(`Relay ready — peers: ${msg.peers}`);
          if (msg.peers >= 2 && wsRelayRef.current) {
            wsRelayRef.current.setOpen();
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
            setActiveChannel(wsRelayRef.current as unknown as RTCDataChannel);
            setConnectionStateSafe("connected");
            setConnectionPath("ws-relay");
            setConnectionStatus("Connected via relay");
            log("Relay connected — both peers present!");
          } else {
            setConnectionStatus("Relay ready — waiting for peer...");
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
            setConnectionStateSafe("disconnected");
            setConnectionStatus("Peer disconnected");
            break;
          }

          case "room-full": {
            log("Room full");
            setConnectionStateSafe("idle");
            break;
          }
        }
      };

      ws.onerror = () => {
        log("WebSocket error");
        setConnectionStateSafe("disconnected");
      };

      ws.onclose = () => {
        log("Signaling disconnected");
      };
    },
    [cleanup, createPeerConnection, setupDataChannel,
     flushIceCandidates, startWSRelay, log, setConnectionStateSafe]
  );

  const prewarm = useCallback(() => {
    if (prewarmWsRef.current || wsRef.current) return;
    log("Pre-warming signaling WebSocket");
    const ws = new WebSocket(SIGNALING_SERVER);
    ws.binaryType = "arraybuffer";
    prewarmWsRef.current = ws;
    prewarmReadyRef.current = false;

    ws.onopen = () => {
      log("Pre-warm WebSocket ready");
      prewarmReadyRef.current = true;
    };
    ws.onerror = () => {
      prewarmWsRef.current = null;
      prewarmReadyRef.current = false;
    };
    ws.onclose = () => {
      if (prewarmWsRef.current === ws) {
        prewarmWsRef.current = null;
        prewarmReadyRef.current = false;
      }
    };
  }, [log]);

  const connect = useCallback(
    (code: string) => {
      retryCountRef.current = 0;
      connectInternal(code);
    },
    [connectInternal]
  );

  const disconnect = useCallback(() => {
    cleanup();
    // Reset all state immediately
    connectionStateRef.current = "idle";
    setConnectionState("idle");
    setConnectionStatus("");
    setRoomCode("");
    setConnectionPath(null);
    relayStartedRef.current = false;
    retryCountRef.current = 0;
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

  // Only timeout when user leaves the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // User left the app — start a generous timeout
        if (connectionStateRef.current === "connecting") {
          visibilityTimeoutRef.current = setTimeout(() => {
            if (connectionStateRef.current !== "connected") {
              log("Connection timed out — user left the app");
              cleanup();
              setConnectionStateSafe("idle");
              setConnectionStatus("");
            }
          }, 120000); // 2 minutes after leaving
        }
      } else {
        // User came back — cancel the timeout
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
          visibilityTimeoutRef.current = null;
          log("User returned — keeping connection alive");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [cleanup, log, setConnectionStateSafe]);

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
    channel: activeChannel,
    disconnect,
    connectionPath,
    prewarm,
  };
}