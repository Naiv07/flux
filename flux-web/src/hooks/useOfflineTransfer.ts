import { useCallback, useRef, useState } from "react";
import pako from "pako";

export type OfflineState =
  | "idle"
  | "creating-offer"
  | "waiting-for-answer"
  | "creating-answer"
  | "connecting"
  | "connected"
  | "failed";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [], // No STUN needed on local network
  iceCandidatePoolSize: 5,
};

// Compress SDP for QR code
export function compressSDP(sdp: string): string {
  const compressed = pako.deflate(sdp);
  return btoa(String.fromCharCode(...compressed));
}

// Decompress SDP from QR code
export function decompressSDP(data: string): string {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return pako.inflate(bytes, { to: "string" });
}

export function useOfflineTransfer(
  onMessage?: (e: MessageEvent) => void
) {
  const [offlineState, setOfflineState] = useState<OfflineState>("idle");
  const [offerQR, setOfferQR] = useState<string | null>(null);
  const [answerQR, setAnswerQR] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const candidatesRef = useRef<RTCIceCandidate[]>([]);

  const cleanup = useCallback(() => {
    channelRef.current?.close();
    pcRef.current?.close();
    pcRef.current = null;
    channelRef.current = null;
    candidatesRef.current = [];
    setOfferQR(null);
    setAnswerQR(null);
  }, []);

  const setupChannel = useCallback(
    (channel: RTCDataChannel) => {
      channelRef.current = channel;

      channel.onopen = () => {
        setOfflineState("connected");
      };

      channel.onclose = () => {
        setOfflineState("idle");
      };

      channel.onmessage = (e) => {
        if (onMessage) onMessage(e);
      };
    },
    [onMessage]
  );

  // SENDER: Create offer and encode as QR
  const createOffer = useCallback(async () => {
    cleanup();
    setOfflineState("creating-offer");

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const channel = pc.createDataChannel("flux-offline", { ordered: true });
    setupChannel(channel);

    // Collect all ICE candidates before generating QR
    const candidates: RTCIceCandidate[] = [];

    await new Promise<void>((resolve) => {
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          // Only keep host candidates (local network)
          if (e.candidate.type === "host") {
            candidates.push(e.candidate);
          }
        } else {
          // Gathering complete
          resolve();
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") resolve();
      };

      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
      });

      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });

    candidatesRef.current = candidates;

    // Encode offer + candidates as compressed JSON
    const payload = JSON.stringify({
      sdp: pc.localDescription?.sdp,
      type: pc.localDescription?.type,
      candidates: candidates.map((c) => c.toJSON()),
    });

    const compressed = compressSDP(payload);
    setOfferQR(compressed);
    setOfflineState("waiting-for-answer");
  }, [cleanup, setupChannel]);

  // RECEIVER: Process scanned offer, create answer
  const processOffer = useCallback(
    async (compressedOffer: string) => {
      cleanup();
      setOfflineState("creating-answer");

      try {
        const payload = JSON.parse(decompressSDP(compressedOffer));
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        pc.ondatachannel = (e) => {
          setupChannel(e.channel);
        };

        // Set remote description
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: payload.type, sdp: payload.sdp })
        );

        // Add sender's ICE candidates
        for (const candidate of payload.candidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }

        // Collect answer candidates
        const answerCandidates: RTCIceCandidate[] = [];

        await new Promise<void>((resolve) => {
          pc.onicecandidate = (e) => {
            if (e.candidate?.type === "host") {
              answerCandidates.push(e.candidate);
            } else if (!e.candidate) {
              resolve();
            }
          };

          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") resolve();
          };

          pc.createAnswer().then((answer) => {
            pc.setLocalDescription(answer);
          });

          setTimeout(resolve, 5000);
        });

        // Encode answer as QR
        const answerPayload = JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
          candidates: answerCandidates.map((c) => c.toJSON()),
        });

        const compressed = compressSDP(answerPayload);
        setAnswerQR(compressed);
        setOfflineState("waiting-for-answer");
      } catch {
        setOfflineState("failed");
      }
    },
    [cleanup, setupChannel]
  );

  // SENDER: Process scanned answer
  const processAnswer = useCallback(async (compressedAnswer: string) => {
    setOfflineState("connecting");

    try {
      const payload = JSON.parse(decompressSDP(compressedAnswer));
      const pc = pcRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: payload.type, sdp: payload.sdp })
      );

      for (const candidate of payload.candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch {
      setOfflineState("failed");
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setOfflineState("idle");
  }, [cleanup]);

  return {
    offlineState,
    offerQR,
    answerQR,
    createOffer,
    processOffer,
    processAnswer,
    disconnect,
    channel: channelRef.current,
  };
}