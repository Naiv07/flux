
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
        size={0.08}
        color={connected ? "#8b83ff" : "#6b7280"}
        transparent
        opacity={connected ? 1 : 0.85}
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
        background: connected
          ? "radial-gradient(ellipse at 50% 50%, #1a1040 0%, #0a0a0f 70%)"
          : "radial-gradient(ellipse at 50% 50%, #0d0d1a 0%, #0a0a0f 70%)",
        transition: "background 1s ease",
      }}>
        {/* CSS animated dots for mobile */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle, ${connected ? "#89CFF0" : "#4a5568"} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          opacity: 0.3,
        }} />
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