
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ connected }: { connected: boolean }) {
  const meshRef = useRef<THREE.Points>(null);
  const count = 6000;

  // Create a soft circular dot texture
  const dotTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.2, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }, []);

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const branches = 3;
    const radius = 14;
    const spin = 0.9;
    const randomness = 0.25;

    const colorInside = new THREE.Color("#a78bff");
    const colorOutside = new THREE.Color("#89CFF0");

    // Vibrant accent colors for random glow particles
    // Vibrant NEON accent colors — multiplied for extra glow
    const accentColors = [
      new THREE.Color("#ff6ec7").multiplyScalar(2.5), // neon pink
      new THREE.Color("#00ffd5").multiplyScalar(2.5), // neon cyan
      new THREE.Color("#ffffff").multiplyScalar(2.0), // bright white
      new THREE.Color("#ffd700").multiplyScalar(2.5), // neon gold
      new THREE.Color("#ff4d6d").multiplyScalar(2.5), // neon red
      new THREE.Color("#b94dff").multiplyScalar(2.5), // neon violet
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const r = Math.pow(Math.random(), 1.5) * radius;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      const spinAngle = r * spin;

      const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;
      const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * randomness * r * 0.15;
      const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;

      positions[i3]     = Math.cos(branchAngle + spinAngle) * r + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

      let finalColor: THREE.Color;

      // 15% chance of a vibrant accent color
      if (Math.random() < 0.15) {
        finalColor = accentColors[
          Math.floor(Math.random() * accentColors.length)
        ].clone();
      } else {
        // normal galaxy gradient
        finalColor = colorInside.clone();
        finalColor.lerp(colorOutside, r / radius);
      }

      colors[i3]     = finalColor.r;
      colors[i3 + 1] = finalColor.g;
      colors[i3 + 2] = finalColor.b;
    }

    return [positions, colors];
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    meshRef.current.rotation.y += delta * (connected ? 0.1 : 0.05);

    const material = meshRef.current.material as THREE.PointsMaterial;
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.15;
    material.size = 0.17 + pulse * 0.1; // pulse the glow size instead
  });

  return (
    <points ref={meshRef} rotation={[1.1, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.19}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        transparent
        opacity={1}
        map={dotTexture}
        alphaTest={0.001}
        toneMapped={false}
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
        camera={{ position: [0, 8, 16], fov: 55 }}
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