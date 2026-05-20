import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticlesProps {
  connected: boolean;
}

function Particles({ connected }: ParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const count = 3000;

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

    const pos = meshRef.current.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < count; i++) {
      pos[i * 3]     += velocities[i * 3];
      pos[i * 3 + 1] += velocities[i * 3 + 1];

      if (pos[i * 3] > 15)  pos[i * 3] = -15;
      if (pos[i * 3] < -15) pos[i * 3] = 15;
      if (pos[i * 3 + 1] > 15)  pos[i * 3 + 1] = -15;
      if (pos[i * 3 + 1] < -15) pos[i * 3 + 1] = 15;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.rotation.z += connected ? 0.0008 : 0.0002;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={connected ? "#89CFF0" : "#5b8fa8"}
        transparent
        opacity={connected ? 1 : 0.85}
        sizeAttenuation
        map={(() => {
          const canvas = document.createElement("canvas");
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext("2d")!;
          const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
          gradient.addColorStop(0, "rgba(255,255,255,1)");
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(16, 16, 16, 0, Math.PI * 2);
          ctx.fill();
          const texture = new THREE.CanvasTexture(canvas);
          return texture;
        })()}
        alphaTest={0.01}
      />
    </points>
  );
}

export function ParticleBackground({ connected }: { connected: boolean }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 0,
      pointerEvents: "none",
    }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ antialias: false, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Particles connected={connected} />
      </Canvas>
    </div>
  );
}