import { useCallback, useRef, useState } from "react";
import {
  deleteTransfer,
  generateTransferId,
} from "../lib/transferStore";

const CHUNK_SIZE = 32 * 1024;

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
  const throttleDelayRef = useRef(0);          // sender delay between chunks
  const lastSpeedCheckRef = useRef(Date.now()); // receiver speed tracker
  const bytesAtLastCheckRef = useRef(0);

  // Pause / resume / cancel controls
  const pauseTransfer = useCallback(() => {
    pauseRef.current = true;
    channel?.send(JSON.stringify({ type: "transfer-paused" }));
    setProgress((prev) => ({ ...prev, status: "paused" }));
  }, [channel]);

  const resumeTransfer = useCallback(() => {
    pauseRef.current = false;
    channel?.send(JSON.stringify({ type: "transfer-resumed" }));
    setProgress((prev) => ({
      ...prev,
      status: prev.transferred > 0 ? "sending" : "sending",
    }));
  }, [channel]);

  const cancelTransfer = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
    channel?.send(JSON.stringify({ type: "transfer-cancelled" }));

    // Clean up receiver state
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

    // Reset to idle after 2 seconds
    setTimeout(() => {
      setProgress((prev) =>
        prev.status === "cancelled"
          ? { ...prev, status: "idle" }
          : prev
      );
    }, 2000);
  }, [channel]);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (typeof e.data === "string") {
        const meta = JSON.parse(e.data);

        if (meta.type === "file-meta") {
          const id = meta.transferId;
          transferIdRef.current = id;

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

          if (state.writable) {
            state.writable.close().then(() => {
              console.log("[Flux] File saved:", state.fileName);
            });
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
        }

        if (meta.type === "transfer-paused") {
          pauseRef.current = true;  // ← actually pause the sender too
          setProgress((prev) => ({ ...prev, status: "paused" }));
        }

        if (meta.type === "transfer-resumed") {
          pauseRef.current = false;  // ← resume sender too
          setProgress((prev) => ({
            ...prev,
            status: prev.transferred < prev.fileSize ? "sending" : prev.status,
          }));
        }

        if (meta.type === "transfer-cancelled") {
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
            setProgress((prev) =>
              prev.status === "cancelled"
                ? { ...prev, status: "idle" }
                : prev
            );
          }, 2000);
        }

        if (meta.type === "bandwidth-adjust") {
          throttleDelayRef.current = meta.delay;
          console.log(
            `[Flux] Bandwidth: ${meta.mbps} Mbps, delay set to ${meta.delay}ms`
          );
        }

        return;
      }
      

      if (e.data instanceof ArrayBuffer) {
        const state = receivingRef.current;
        if (!state) return;

        const updateProgress = () => {
          state.received += e.data.byteLength;
          setProgress({
            fileName: state.fileName,
            fileSize: state.fileSize,
            transferred: state.received,
            percentage: Math.round((state.received / state.fileSize) * 100),
            status: "receiving",
          });

          // Measure incoming speed every 2 seconds
          const now = Date.now();
          const elapsed = now - lastSpeedCheckRef.current;

          if (elapsed >= 2000) {
            const bytesReceived = state.received - bytesAtLastCheckRef.current;
            const bytesPerSecond = (bytesReceived / elapsed) * 1000;
            const mbps = (bytesPerSecond * 8) / 1_000_000;

            // Calculate optimal chunk delay
            // Target: stay under receiver's actual speed
            let suggestedDelay = 0;
            if (mbps < 5)        suggestedDelay = 20;  // very slow connection
            else if (mbps < 10)  suggestedDelay = 10;  // slow
            else if (mbps < 25)  suggestedDelay = 5;   // medium
            else if (mbps < 50)  suggestedDelay = 2;   // fast
            else                 suggestedDelay = 0;   // very fast

            // Tell sender to adjust
            channel?.send(
              JSON.stringify({
                type: "bandwidth-adjust",
                delay: suggestedDelay,
                mbps: Math.round(mbps),
              })
            );

            lastSpeedCheckRef.current = now;
            bytesAtLastCheckRef.current = state.received;
          }
        };

        if (state.writable) {
          state.writable.write(e.data).then(updateProgress);
        } else {
          state.chunks.push(e.data);
          updateProgress();
        }
      }
    },
    [channel]
  );

  const sendFile = useCallback(
    async (file: File) => {
      if (!channel || channel.readyState !== "open") return;

      cancelRef.current = false;
      pauseRef.current = false;
      throttleDelayRef.current = 0;          // reset
      lastSpeedCheckRef.current = Date.now(); // reset
      bytesAtLastCheckRef.current = 0;        // reset

      const transferId = generateTransferId(file.name, file.size);
      transferIdRef.current = transferId;

      channel.send(
        JSON.stringify({
          type: "file-meta",
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          transferId,
        })
      );

      let offset = 0;

      setProgress({
        fileName: file.name,
        fileSize: file.size,
        transferred: 0,
        percentage: 0,
        status: "sending",
      });

      channel.bufferedAmountLowThreshold = 65536;

      await new Promise<void>((resolve, reject) => {
        const sendNextChunk = async () => {
          try {
            while (offset < file.size) {
              // Check cancellation
              if (cancelRef.current) {
                reject(new Error("cancelled"));
                return;
              }

              // Check pause
              if (pauseRef.current) {
                const checkPause = setInterval(() => {
                  if (!pauseRef.current || cancelRef.current) {
                    clearInterval(checkPause);
                    if (cancelRef.current) reject(new Error("cancelled"));
                    else sendNextChunk();
                  }
                }, 200);
                return;
              }

              // Buffer management
              if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
                channel.onbufferedamountlow = () => {
                  channel.onbufferedamountlow = null;
                  sendNextChunk();
                };
                return;
              }

              if (channel.readyState !== "open") {
                reject(new Error("Channel closed"));
                return;
              }

              const chunk = file.slice(offset, offset + CHUNK_SIZE);
              const buffer = await chunk.arrayBuffer();
              channel.send(buffer);
              offset += buffer.byteLength;

              // Apply adaptive throttle
              if (throttleDelayRef.current > 0) {
                await new Promise((r) =>
                  setTimeout(r, throttleDelayRef.current)
                );
              }

              setProgress({
                fileName: file.name,
                fileSize: file.size,
                transferred: offset,
                percentage: Math.round((offset / file.size) * 100),
                status: "sending",
              });
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        sendNextChunk();
      }).catch((err) => {
        console.log("[Flux] Transfer stopped:", err.message);
      });

      if (!cancelRef.current) {
        channel.send(JSON.stringify({ type: "file-complete" }));
        setProgress((prev) => ({
          ...prev,
          status: "complete",
          percentage: 100,
        }));
      }
    },
    [channel]
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

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