import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteTransfer,
  generateTransferId,
} from "../lib/transferStore";

const isDev = import.meta.env.DEV;
const WEBRTC_CHUNK_SIZE = 128 * 1024; // 128KB for WebRTC
const RELAY_CHUNK_SIZE  =  64 * 1024; //  64KB for relay

export type TransferStatus =
  | "idle"
  | "sending"
  | "receiving"
  | "paused"
  | "cancelled"
  | "complete"
  | "error"
  | "resuming";

export type TransferProgress = {
  fileName: string;
  fileSize: number;
  transferred: number;
  percentage: number;
  status: TransferStatus;
  resuming?: boolean;
  speed?: number;
  eta?: number;
  pausedBy?: "local" | "remote" | null;
};

export function useFileTransfer(channel: RTCDataChannel | null) {
  const [progress, setProgress] = useState<TransferProgress>({
    fileName: "",
    fileSize: 0,
    transferred: 0,
    percentage: 0,
    status: "idle",
  });

  const receivingRef = useRef<any>(null);
  const transferIdRef = useRef<string>("");
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  const resumeResolverRef = useRef<(() => void) | null>(null);
  const throttleDelayRef = useRef(0);
  const lastSpeedCheckRef = useRef(Date.now());
  const bytesAtLastCheckRef = useRef(0);
  const lastProgressUpdateRef = useRef(0);
  const speedRef = useRef(0);
  const directionRef = useRef<"sending" | "receiving">("sending");

  // Always use latest channel via ref — fixes stale closure on relay switch
  const channelRef = useRef<RTCDataChannel | null>(channel);
  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  const sendControl = useCallback((msg: object) => {
    const ch = channelRef.current;
    if (ch && ch.readyState === "open") {
      ch.send(JSON.stringify(msg));
    }
  }, []);

  const updateProgressThrottled = useCallback((newProgress: TransferProgress) => {
    const now = Date.now();
    if (now - lastProgressUpdateRef.current > 100) {
      setProgress(newProgress);
      lastProgressUpdateRef.current = now;
    }
  }, []);

  const pauseTransfer = useCallback(() => {
    if (pauseRef.current || cancelRef.current) return;
    pauseRef.current = true;
    sendControl({ type: "transfer-paused" });
    setProgress((prev) => ({ ...prev, status: "paused", pausedBy: "local" }));
  }, [sendControl]);

  const resumeTransfer = useCallback(() => {
    if (!pauseRef.current || cancelRef.current) return;
    pauseRef.current = false;
    const resolver = resumeResolverRef.current;
    resumeResolverRef.current = null;
    resolver?.();
    sendControl({ type: "transfer-resumed" });
    setProgress((prev) => ({
      ...prev,
      status: directionRef.current,
      pausedBy: null,
    }));
  }, [sendControl]);

  const cancelTransfer = useCallback(() => {
    if (cancelRef.current) return;
    cancelRef.current = true;
    pauseRef.current = false;
    const resolver = resumeResolverRef.current;
    resumeResolverRef.current = null;
    resolver?.();
    sendControl({ type: "transfer-cancelled" });

    const state = receivingRef.current;
    if (state?.writable) {
      state.writable.close().catch(() => {});
    }
    receivingRef.current = null;

    setProgress({
      fileName: "",
      fileSize: 0,
      transferred: 0,
      percentage: 0,
      status: "cancelled",
    });

    setTimeout(() => {
      cancelRef.current = false;
      setProgress((prev) =>
        prev.status === "cancelled" ? { ...prev, status: "idle" } : prev
      );
    }, 2000);
  }, [sendControl]);

  const flushWriteBuffer = useCallback(async (state: any) => {
    if (!state.writeBuffer?.length) return;

    const chunks = state.writeBuffer.splice(0); // take all, clear buffer
    state.bufferedBytes = 0;

    if (state.writable) {
      // Stream API — combine into one buffer and write once
      const total = chunks.reduce((s: number, c: ArrayBuffer) => s + c.byteLength, 0);
      const combined = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      await state.writable.write(combined.buffer);
    } else {
      // Blob method — push to chunks array
      state.chunks.push(...chunks);
    }
  }, []);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (typeof e.data === "string") {
        const meta = JSON.parse(e.data);

        if (meta.type === "file-meta") {
          const id = meta.transferId;
          transferIdRef.current = id;
          directionRef.current = "receiving";

          const useStreaming = "showSaveFilePicker" in window;

          if (useStreaming) {
            (window as any)
              .showSaveFilePicker({ suggestedName: meta.fileName })
              .then(async (handle: any) => {
                const writable = await handle.createWritable();
                receivingRef.current = {
                  id,
                  fileName: meta.fileName,
                  fileSize: meta.fileSize,
                  fileType: meta.fileType,
                  chunks: [],
                  received: 0,
                  writable,
                };
                setProgress({
                  fileName: meta.fileName,
                  fileSize: meta.fileSize,
                  transferred: 0,
                  percentage: 0,
                  status: "receiving",
                });
              })
              .catch(() => {
                receivingRef.current = {
                  id,
                  fileName: meta.fileName,
                  fileSize: meta.fileSize,
                  fileType: meta.fileType,
                  chunks: [],
                  received: 0,
                };
                setProgress({
                  fileName: meta.fileName,
                  fileSize: meta.fileSize,
                  transferred: 0,
                  percentage: 0,
                  status: "receiving",
                });
              });
          } else {
            receivingRef.current = {
              id,
              fileName: meta.fileName,
              fileSize: meta.fileSize,
              fileType: meta.fileType,
              chunks: [],
              received: 0,
            };
            setProgress({
              fileName: meta.fileName,
              fileSize: meta.fileSize,
              transferred: 0,
              percentage: 0,
              status: "receiving",
            });
          }
        }

        if (meta.type === "file-complete") {
          const state = receivingRef.current;
          if (!state) return;

          (async () => {
            // Flush any remaining buffered chunks first
            await flushWriteBuffer(state);

            if (state.writable) {
              await state.writable.close();
              if (isDev) console.log("[Flux] File saved:", state.fileName);
            } else {
              const blob = new Blob(state.chunks, { type: state.fileType });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = state.fileName;
              a.click();
              URL.revokeObjectURL(url);
            }

            deleteTransfer(state.id);
            receivingRef.current = null;
            setProgress((prev) => ({
              ...prev,
              status: "complete",
              percentage: 100,
            }));
          })();
        }

        if (meta.type === "transfer-paused") {
          pauseRef.current = true;
          setProgress((prev) => ({ ...prev, status: "paused", pausedBy: "remote" }));
        }

        if (meta.type === "transfer-resumed") {
          pauseRef.current = false;
          const resolver = resumeResolverRef.current;
          resumeResolverRef.current = null;
          resolver?.();
          setProgress((prev) => ({
            ...prev,
            status: directionRef.current,
            pausedBy: null,
          }));
        }

        if (meta.type === "transfer-cancelled") {
          cancelRef.current = true;
          const resolver = resumeResolverRef.current;
          resumeResolverRef.current = null;
          resolver?.();
          const state = receivingRef.current;
          if (state?.writable) {
            state.writable.close().catch(() => {});
          }
          receivingRef.current = null;
          setProgress({
            fileName: "",
            fileSize: 0,
            transferred: 0,
            percentage: 0,
            status: "cancelled",
          });
          setTimeout(() => {
            cancelRef.current = false;
            setProgress((prev) =>
              prev.status === "cancelled" ? { ...prev, status: "idle" } : prev
            );
          }, 2000);
        }

        if (meta.type === "bandwidth-adjust") {
          throttleDelayRef.current = meta.delay;
        }

        return;
      }

      if (e.data instanceof ArrayBuffer) {
        const state = receivingRef.current;
        if (!state) return;
        // No early return on pause — dropping in-flight chunks corrupts the file.
        // Sender will stop within one RTT after receiving transfer-paused.

        state.writeBuffer = state.writeBuffer || [];
        state.writeBuffer.push(e.data);
        state.received += e.data.byteLength;
        state.bufferedBytes = (state.bufferedBytes || 0) + e.data.byteLength;

        // Speed tracking (every 1s)
        const now = Date.now();
        const elapsed = now - lastSpeedCheckRef.current;
        if (elapsed >= 1000) {
          const bytesReceived = state.received - bytesAtLastCheckRef.current;
          speedRef.current = Math.round((bytesReceived / elapsed) * 1000);
          lastSpeedCheckRef.current = now;
          bytesAtLastCheckRef.current = state.received;
        }

        // Only push UI updates when not paused
        if (!pauseRef.current) {
          const remaining = state.fileSize - state.received;
          updateProgressThrottled({
            fileName: state.fileName,
            fileSize: state.fileSize,
            transferred: state.received,
            percentage: Math.round((state.received / state.fileSize) * 100),
            status: "receiving",
            speed: speedRef.current || undefined,
            eta: speedRef.current > 0 ? Math.round(remaining / speedRef.current) : undefined,
          });
        }

        // Flush to disk when buffer hits 2MB
        const FLUSH_SIZE = 2 * 1024 * 1024;
        if (state.bufferedBytes >= FLUSH_SIZE) {
          flushWriteBuffer(state);
        }
      }
    },
    [sendControl, updateProgressThrottled, flushWriteBuffer]
  );

  const sendFile = useCallback(
    async (file: File) => {
      const ch = channelRef.current;
      if (!ch || ch.readyState !== "open") return;

      const isRelay = !(ch instanceof RTCDataChannel);
      const CHUNK_SIZE = isRelay ? RELAY_CHUNK_SIZE : WEBRTC_CHUNK_SIZE;

      cancelRef.current = false;
      pauseRef.current = false;
      resumeResolverRef.current = null;
      throttleDelayRef.current = 0;
      lastSpeedCheckRef.current = Date.now();
      bytesAtLastCheckRef.current = 0;
      lastProgressUpdateRef.current = 0;
      speedRef.current = 0;
      directionRef.current = "sending";

      const transferId = generateTransferId(file.name, file.size);
      transferIdRef.current = transferId;

      ch.send(JSON.stringify({
        type: "file-meta",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        transferId,
      }));

      let offset = 0;

      setProgress({
        fileName: file.name,
        fileSize: file.size,
        transferred: 0,
        percentage: 0,
        status: "sending",
      });

      // Scale backpressure threshold with channel type
      if ("bufferedAmountLowThreshold" in ch) {
        (ch as RTCDataChannel).bufferedAmountLowThreshold = isRelay
          ? 512 * 1024      // 512KB for relay
          : 4 * 1024 * 1024; // 4MB for WebRTC
      }

      try {
        while (offset < file.size) {
          // Check cancel first
          if (cancelRef.current) break;

          // Check pause — await promise until resumed
          if (pauseRef.current) {
            await new Promise<void>((res) => {
              resumeResolverRef.current = res;
            });
            // After resume, check cancel
            if (cancelRef.current) break;
            continue;
          }

          // Backpressure — wait for buffer to drain
          if (
            "bufferedAmount" in ch &&
            (ch as RTCDataChannel).bufferedAmount >
            ((ch as RTCDataChannel).bufferedAmountLowThreshold ?? 1024 * 1024)
          ) {
            await new Promise<void>((res) => {
              (ch as RTCDataChannel).onbufferedamountlow = () => {
                (ch as RTCDataChannel).onbufferedamountlow = null;
                res();
              };
            });
            continue;
          }

          if (ch.readyState !== "open") break;

          // Send one chunk at a time — check pause between EVERY chunk
          const chunk = file.slice(offset, offset + CHUNK_SIZE);
          const buffer = await chunk.arrayBuffer();

          // Re-check pause and cancel after async arrayBuffer()
          if (cancelRef.current) break;
          if (pauseRef.current) continue;

          ch.send(buffer);
          offset += buffer.byteLength;

          // Speed tracking (every 1s)
          const now = Date.now();
          const elapsed = now - lastSpeedCheckRef.current;
          if (elapsed >= 1000) {
            const bytesSent = offset - bytesAtLastCheckRef.current;
            speedRef.current = Math.round((bytesSent / elapsed) * 1000);
            lastSpeedCheckRef.current = now;
            bytesAtLastCheckRef.current = offset;
          }

          if (throttleDelayRef.current > 0) {
            await new Promise((r) => setTimeout(r, throttleDelayRef.current));
          }

          updateProgressThrottled({
            fileName: file.name,
            fileSize: file.size,
            transferred: offset,
            percentage: Math.round((offset / file.size) * 100),
            status: "sending",
            speed: speedRef.current || undefined,
            eta: speedRef.current > 0
              ? Math.round((file.size - offset) / speedRef.current)
              : undefined,
          });
        }

        if (!cancelRef.current) {
          ch.send(JSON.stringify({ type: "file-complete" }));
          setProgress((prev) => ({
            ...prev,
            status: "complete",
            percentage: 100,
            speed: undefined,
            eta: undefined,
          }));
        }
      } catch (err) {
        if (isDev) console.log("[Flux] Transfer error:", err);
      }
    },
    [updateProgressThrottled]
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  useEffect(() => {
    return () => {
      const resolver = resumeResolverRef.current;
      resumeResolverRef.current = null;
      resolver?.();
    };
  }, []);

  return {
    progress,
    sendFile,
    handleMessage,
    formatBytes,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
  };
}