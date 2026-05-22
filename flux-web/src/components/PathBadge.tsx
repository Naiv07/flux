import { motion } from "framer-motion";
import { Lightning, Globe, WarningCircle } from "@phosphor-icons/react";

interface Props {
  path: "local" | "internet" | "relay" | null;
}

export function PathBadge({ path }: Props) {
  if (!path) return null;

  const config = {
    local: {
      label: "Local Network",
      sub: "Maximum speed",
      color: "#00ff88",
      bg: "rgba(0,255,136,0.1)",
      border: "rgba(0,255,136,0.25)",
      icon: <Lightning size={16} weight="fill" color="#00ff88" />,
    },
    internet: {
      label: "Internet Connection",
      sub: "Standard speed",
      color: "#89CFF0",
      bg: "rgba(137,207,240,0.1)",
      border: "rgba(137,207,240,0.25)",
      icon: <Globe size={16} weight="bold" color="#89CFF0" />,
    },
    relay: {
      label: "Relay Connection",
      sub: "Slower — restricted network",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.1)",
      border: "rgba(251,191,36,0.25)",
      icon: <WarningCircle size={16} weight="bold" color="#fbbf24" />,
    },
  };

  const c = config[path];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: "12px",
        padding: "10px 14px",
        width: "100%",
      }}
    >
      {c.icon}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: "600", color: c.color }}>
          {c.label}
        </p>
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>
          {c.sub}
        </p>
      </div>
    </motion.div>
  );
}