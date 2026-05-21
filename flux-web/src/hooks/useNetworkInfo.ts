import { useEffect, useState } from "react";

export type NetworkType = "wifi" | "cellular" | "ethernet" | "unknown";

export interface NetworkInfo {
  type: NetworkType;
  downlinkMbps: number;
  effectiveType: string;
  saveData: boolean;
  online: boolean;
}

export function useNetworkInfo(): NetworkInfo {
  const [info, setInfo] = useState<NetworkInfo>({
    type: "unknown",
    downlinkMbps: 0,
    effectiveType: "unknown",
    saveData: false,
    online: navigator.onLine,
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      if (connection) {
        const rawType = connection.type || "unknown";
        let type: NetworkType = "unknown";

        if (rawType === "wifi") type = "wifi";
        else if (rawType === "cellular") type = "cellular";
        else if (rawType === "ethernet") type = "ethernet";

        setInfo({
          type,
          downlinkMbps: connection.downlink || 0,
          effectiveType: connection.effectiveType || "unknown",
          saveData: connection.saveData || false,
          online: navigator.onLine,
        });
      } else {
        setInfo((prev) => ({ ...prev, online: navigator.onLine }));
      }
    };

    updateNetworkInfo();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
    }

    window.addEventListener("online", updateNetworkInfo);
    window.addEventListener("offline", updateNetworkInfo);

    return () => {
      if (connection) {
        connection.removeEventListener("change", updateNetworkInfo);
      }
      window.removeEventListener("online", updateNetworkInfo);
      window.removeEventListener("offline", updateNetworkInfo);
    };
  }, []);

  return info;
}

// Recommendation logic
export function getNetworkRecommendation(
  network: NetworkInfo,
  fileSize?: number
): { message: string; level: "good" | "okay" | "warning" } {
  const sizeMB = fileSize ? fileSize / (1024 * 1024) : 0;

  // Cellular with large file
  if (network.type === "cellular" && sizeMB > 100) {
    return {
      message: "Large file on cellular — switch to WiFi to save data",
      level: "warning",
    };
  }

  // Save data mode
  if (network.saveData) {
    return {
      message: "Data saver is on — use WiFi for faster transfers",
      level: "warning",
    };
  }

  // Slow connection
  if (network.effectiveType === "slow-2g" || network.effectiveType === "2g") {
    return {
      message: "Very slow connection — connect both devices to WiFi or hotspot",
      level: "warning",
    };
  }

  if (network.effectiveType === "3g") {
    return {
      message: "3G detected — large files will be slow, consider hotspot",
      level: "okay",
    };
  }

  // Ethernet — best
  if (network.type === "ethernet") {
    return {
      message: "Ethernet connected — optimal for fast transfers",
      level: "good",
    };
  }

  // WiFi — good
  if (network.type === "wifi") {
    if (network.downlinkMbps >= 25) {
      return {
        message: "Strong WiFi — optimal for any file size",
        level: "good",
      };
    } else if (network.downlinkMbps >= 5) {
      return {
        message: "WiFi connected — good for transfers under 1GB",
        level: "good",
      };
    } else {
      return {
        message: "Weak WiFi — consider moving closer to router",
        level: "okay",
      };
    }
  }

  // Cellular — okay for small files
  if (network.type === "cellular") {
    if (network.downlinkMbps >= 25) {
      return {
        message: "5G/LTE detected — fast but uses cellular data",
        level: "okay",
      };
    }
    return {
      message: "Cellular network — use hotspot mode for best speed",
      level: "okay",
    };
  }

  // Same network tip
  return {
    message: "Connect both devices to the same WiFi for faster transfers",
    level: "okay",
  };
}