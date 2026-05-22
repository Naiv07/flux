import { motion, AnimatePresence } from "framer-motion";
import { WifiHigh, CellSignalHigh, Plug, Warning, CheckCircle, Info } from "@phosphor-icons/react";
import { useNetworkInfo, getNetworkRecommendation } from "../hooks/useNetworkInfo";

interface Props {
  fileSize?: number;
}

export function NetworkBanner({ fileSize }: Props) {
  const network = useNetworkInfo();
  const rec = getNetworkRecommendation(network, fileSize);

  const colors = {
    good:    { bg: "rgba(0,255,136,0.08)",    border: "rgba(0,255,136,0.2)",    text: "#00ff88" },
    okay:    { bg: "rgba(137,207,240,0.08)",  border: "rgba(137,207,240,0.2)",  text: "#89CFF0" },
    warning: { bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.2)",   text: "#fbbf24" },
  };

  const c = colors[rec.level];

  const NetworkIcon = () => {
    if (network.type === "wifi") return <WifiHigh size={16} weight="bold" color={c.text} />;
    if (network.type === "cellular") return <CellSignalHigh size={16} weight="bold" color={c.text} />;
    if (network.type === "ethernet") return <Plug size={16} weight="bold" color={c.text} />;
    return <Info size={16} weight="bold" color={c.text} />;
  };

  const StatusIcon = () => {
    if (rec.level === "good")    return <CheckCircle size={14} weight="bold" color={c.text} />;
    if (rec.level === "warning") return <Warning size={14} weight="bold" color={c.text} />;
    return <Info size={14} weight="bold" color={c.text} />;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: "12px",
          padding: "10px 14px",
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <NetworkIcon />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "12px",
            fontWeight: "500",
            color: c.text,
            lineHeight: "1.4",
          }}>
            {rec.message}
          </p>
          {network.downlinkMbps > 0 && (
            <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
              {network.effectiveType.toUpperCase()} · ~{network.downlinkMbps.toFixed(1)} Mbps
            </p>
          )}
        </div>
        <StatusIcon />
      </motion.div>
    </AnimatePresence>
  );
}