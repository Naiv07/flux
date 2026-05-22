
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ connected }: { connected: boolean }) {
  const meshRef = useRef<THREE.Points>(null);
  const count = 800; // reduced for mobile

  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.003;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
      velocities[i * 3 + 2] = 0;
    }
    return [positions, velocities];
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3]     += velocities[i * 3];
      pos[i * 3 + 1] += velocities[i * 3 + 1];
      if (pos[i * 3] > 15)       pos[i * 3] = -15;
      if (pos[i * 3] < -15)      pos[i * 3] = 15;
      if (pos[i * 3 + 1] > 15)   pos[i * 3 + 1] = -15;
      if (pos[i * 3 + 1] < -15)  pos[i * 3 + 1] = 15;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.rotation.z += connected ? 0.0008 : 0.0002;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={connected ? "#89CFF0" : "#4a6fa5"}
        transparent
        opacity={connected ? 0.9 : 0.6}
        sizeAttenuation
      />
    </points>
  );
}

export function ParticleBackground({ connected }: { connected: boolean }) {
  // Disable Three.js on mobile — use CSS fallback
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  if (isMobile) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "#0a0a0f",
      }}>
        {/* Aurora glow blobs */}
        <div className="flux-aurora flux-aurora-1" />
        <div className="flux-aurora flux-aurora-2" />
        <div className="flux-aurora flux-aurora-3" />

        {/* Twinkling stars layer */}
        <div className="flux-stars" />

        <style>{`
          @keyframes auroraDrift1 {
            0%, 100% { transform: translate(-10%, -10%) scale(1); }
            50% { transform: translate(10%, 15%) scale(1.2); }
          }
          @keyframes auroraDrift2 {
            0%, 100% { transform: translate(15%, 10%) scale(1.1); }
            50% { transform: translate(-15%, -5%) scale(0.9); }
          }
          @keyframes auroraDrift3 {
            0%, 100% { transform: translate(5%, -15%) scale(0.95); }
            50% { transform: translate(-10%, 10%) scale(1.15); }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.8; }
          }

          .flux-aurora {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: ${connected ? "0.4" : "0.25"};
            transition: opacity 1s ease;
          }
          .flux-aurora-1 {
            width: 60vw;
            height: 60vw;
            top: 10%;
            left: 0;
            background: radial-gradient(circle, #6c63ff 0%, transparent 70%);
            animation: auroraDrift1 18s ease-in-out infinite;
          }
          .flux-aurora-2 {
            width: 50vw;
            height: 50vw;
            bottom: 5%;
            right: 0;
            background: radial-gradient(circle, #89CFF0 0%, transparent 70%);
            animation: auroraDrift2 22s ease-in-out infinite;
          }
          .flux-aurora-3 {
            width: 45vw;
            height: 45vw;
            top: 40%;
            left: 30%;
            background: radial-gradient(circle, #00d4ff 0%, transparent 70%);
            animation: auroraDrift3 25s ease-in-out infinite;
          }
          .flux-stars {
            position: absolute;
            inset: 0;
            background-image:
              radial-gradient(1px 1px at 20% 30%, #fff, transparent),
              radial-gradient(1px 1px at 60% 70%, #89CFF0, transparent),
              radial-gradient(1px 1px at 80% 20%, #fff, transparent),
              radial-gradient(1px 1px at 40% 80%, #89CFF0, transparent),
              radial-gradient(1px 1px at 90% 60%, #fff, transparent),
              radial-gradient(1px 1px at 10% 90%, #89CFF0, transparent),
              radial-gradient(1px 1px at 50% 50%, #fff, transparent),
              radial-gradient(1px 1px at 70% 40%, #89CFF0, transparent);
            background-size: 200px 200px;
            animation: twinkle 4s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 0,
      pointerEvents: "none",
    }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        frameloop="always"
      >
        <Particles connected={connected} />
      </Canvas>
    </div>
  );
}