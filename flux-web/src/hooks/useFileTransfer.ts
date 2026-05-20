import { useCallback, useRef, useState } from "react";
import {
  saveTransfer,
  getTransfer,
  deleteTransfer,
  generateTransferId,
} from "../lib/transferStore";
import type { TransferRecord } from "../lib/transferStore";

const CHUNK_SIZE = 32 * 1024; // 32KB — optimal for internet P2P

export type TransferStatus =
  | "idle"
  | "sending"
  | "receiving"
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

  const receivingRef = useRef<TransferRecord | null>(null);
  const transferIdRef = useRef<string>("");

  const handleMessage = useCallback((e: MessageEvent) => {
    if (typeof e.data === "string") {
      const meta = JSON.parse(e.data);

      if (meta.type === "file-meta") {
        const id = meta.transferId;
        transferIdRef.current = id;

        // Check if we have a partial transfer saved
        getTransfer(id).then((existing) => {
          if (existing && existing.received > 0) {
            // Resume from where we left off
            receivingRef.current = existing;
            setProgress({
              fileName: existing.fileName,
              fileSize: existing.fileSize,
              transferred: existing.received,
              percentage: Math.round(
                (existing.received / existing.fileSize) * 100
              ),
              status: "resuming",
              resuming: true,
            });

            // Tell sender to resume from this offset
            channel?.send(
              JSON.stringify({
                type: "resume-from",
                offset: existing.received,
                transferId: id,
              })
            );
          } else {
            // Fresh transfer
            receivingRef.current = {
              id,
              fileName: meta.fileName,
              fileSize: meta.fileSize,
              fileType: meta.fileType,
              chunks: [],
              received: 0,
              totalChunks: Math.ceil(meta.fileSize / CHUNK_SIZE),
              timestamp: Date.now(),
            };

            setProgress({
              fileName: meta.fileName,
              fileSize: meta.fileSize,
              transferred: 0,
              percentage: 0,
              status: "receiving",
            });
          }
        });
      }

      if (meta.type === "file-complete") {
        const state = receivingRef.current;
        if (!state) return;

        const blob = new Blob(state.chunks, { type: state.fileType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = state.fileName;
        a.click();
        URL.revokeObjectURL(url);

        // Clean up saved transfer
        deleteTransfer(state.id);
        receivingRef.current = null;

        setProgress((prev) => ({
          ...prev,
          status: "complete",
          percentage: 100,
        }));
      }

      if (meta.type === "resume-from") {
        // Sender received resume request — will handle in sendFile
        console.log("[Flux] Receiver wants to resume from:", meta.offset);
      }

      return;
    }

    if (e.data instanceof ArrayBuffer) {
      const state = receivingRef.current;
      if (!state) return;

      state.chunks.push(e.data);
      state.received += e.data.byteLength;

      const percentage = Math.round(
        (state.received / state.fileSize) * 100
      );

      setProgress({
        fileName: state.fileName,
        fileSize: state.fileSize,
        transferred: state.received,
        percentage,
        status: "receiving",
      });

      // Save progress every 10 chunks
      if (state.chunks.length % 10 === 0) {
        saveTransfer(state);
      }
    }
  }, [channel]);

  const sendFile = useCallback(
    async (file: File, resumeOffset = 0) => {
      if (!channel || channel.readyState !== "open") return;

      const transferId = generateTransferId(file.name, file.size);
      transferIdRef.current = transferId;

      // Send metadata
      channel.send(
        JSON.stringify({
          type: "file-meta",
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          transferId,
        })
      );

      let offset = resumeOffset;

      setProgress({
        fileName: file.name,
        fileSize: file.size,
        transferred: offset,
        percentage: Math.round((offset / file.size) * 100),
        status: offset > 0 ? "resuming" : "sending",
        resuming: offset > 0,
      });

      // Set buffer threshold
      channel.bufferedAmountLowThreshold = 65536; // 64KB

      await new Promise<void>((resolve, reject) => {
        const sendNextChunk = async () => {
          try {
            while (offset < file.size) {
              // If buffer is too full wait for drain event
              if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
                channel.onbufferedamountlow = () => {
                  channel.onbufferedamountlow = null;
                  sendNextChunk();
                };
                return; // pause and wait
              }

              if (channel.readyState !== "open") {
                reject(new Error("Channel closed"));
                return;
              }

              const chunk = file.slice(offset, offset + CHUNK_SIZE);
              const buffer = await chunk.arrayBuffer();
              channel.send(buffer);
              offset += buffer.byteLength;

              setProgress({
                fileName: file.name,
                fileSize: file.size,
                transferred: offset,
                percentage: Math.round((offset / file.size) * 100),
                status: "sending",
              });
            }

            // All chunks sent
            resolve();
          } catch (err) {
            reject(err);
          }
        };

        sendNextChunk();
      });

      channel.send(JSON.stringify({ type: "file-complete" }));
      setProgress((prev) => ({
        ...prev,
        status: "complete",
        percentage: 100,
      }));
      console.log("[Flux] File sent:", file.name);
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

  return { progress, sendFile, handleMessage, formatBytes };
}