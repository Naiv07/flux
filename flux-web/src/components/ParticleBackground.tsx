
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
      new THREE.Color("#ff6ec7").multiplyScalar(1.6), // pink
      new THREE.Color("#00ffd5").multiplyScalar(1.6), // cyan
      new THREE.Color("#ffffff").multiplyScalar(1.4), // white
      new THREE.Color("#ffd700").multiplyScalar(1.6), // gold
      new THREE.Color("#ff4d6d").multiplyScalar(1.6), // red
      new THREE.Color("#b94dff").multiplyScalar(1.6), // violet
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
    const pulse = Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
    material.size = 0.1 + pulse; // gentle breathing around 0.1
  });

  return (
    <points ref={meshRef} rotation={[1.1, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
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
        background: "#07071a",
      }}>
        <style>{`
          @keyframes nebulaFloat1 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
            50% { transform: translate(5%, 8%) scale(1.15); opacity: 0.7; }
          }
          @keyframes nebulaFloat2 {
            0%, 100% { transform: translate(0, 0) scale(1.1); opacity: 0.4; }
            50% { transform: translate(-8%, -5%) scale(0.95); opacity: 0.6; }
          }
          @keyframes nebulaFloat3 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
            50% { transform: translate(6%, -8%) scale(1.2); opacity: 0.5; }
          }
          @keyframes twinkleA {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          @keyframes twinkleB {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 0.1; transform: scale(0.7); }
          }
          @keyframes twinkleC {
            0%, 33% { opacity: 0.8; }
            66% { opacity: 0.1; }
            100% { opacity: 0.8; }
          }
          @keyframes starFlare {
            0%, 100% { opacity: 0.6; transform: scale(1) rotate(0deg); }
            50% { opacity: 1; transform: scale(1.4) rotate(45deg); }
          }

          .flux-nebula {
            position: absolute;
            border-radius: 50%;
            filter: blur(70px);
          }
          .flux-nebula-1 {
            width: 70vw; height: 70vw;
            top: -10%; left: -15%;
            background: radial-gradient(circle, ${connected ? "#5b3d9e" : "#3d2870"} 0%, transparent 70%);
            animation: nebulaFloat1 20s ease-in-out infinite;
          }
          .flux-nebula-2 {
            width: 60vw; height: 60vw;
            bottom: 0%; right: -10%;
            background: radial-gradient(circle, ${connected ? "#1a4a8a" : "#102a5a"} 0%, transparent 70%);
            animation: nebulaFloat2 25s ease-in-out infinite;
          }
          .flux-nebula-3 {
            width: 50vw; height: 50vw;
            top: 35%; left: 25%;
            background: radial-gradient(circle, ${connected ? "#2d1b6e" : "#1a0f45"} 0%, transparent 70%);
            animation: nebulaFloat3 18s ease-in-out infinite;
          }

          /* Small star field */
          .flux-stars-sm {
            position: absolute;
            inset: 0;
            background-image:
              radial-gradient(1px 1px at 8% 15%, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 22% 45%, rgba(137,207,240,0.6), transparent),
              radial-gradient(1px 1px at 38% 22%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 55% 68%, rgba(180,160,255,0.6), transparent),
              radial-gradient(1px 1px at 72% 35%, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 85% 80%, rgba(137,207,240,0.5), transparent),
              radial-gradient(1px 1px at 15% 75%, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 48% 90%, rgba(180,160,255,0.7), transparent),
              radial-gradient(1px 1px at 92% 20%, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 65% 12%, rgba(137,207,240,0.6), transparent),
              radial-gradient(1px 1px at 30% 58%, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 78% 55%, rgba(180,160,255,0.6), transparent);
            background-size: 100% 100%;
            animation: twinkleA 5s ease-in-out infinite;
          }

          /* Medium stars */
          .flux-stars-md {
            position: absolute;
            inset: 0;
            background-image:
              radial-gradient(1.5px 1.5px at 18% 30%, rgba(137,207,240,0.9), transparent),
              radial-gradient(1.5px 1.5px at 62% 25%, rgba(255,255,255,0.9), transparent),
              radial-gradient(1.5px 1.5px at 42% 72%, rgba(180,160,255,0.8), transparent),
              radial-gradient(1.5px 1.5px at 88% 45%, rgba(137,207,240,0.9), transparent),
              radial-gradient(1.5px 1.5px at 25% 88%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1.5px 1.5px at 75% 92%, rgba(180,160,255,0.8), transparent);
            background-size: 100% 100%;
            animation: twinkleB 7s ease-in-out infinite;
          }

          /* Bright star points with flare */
          .flux-star-bright {
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
          }
          .flux-star-bright::before,
          .flux-star-bright::after {
            content: '';
            position: absolute;
            background: currentColor;
            border-radius: 2px;
          }
          .flux-star-bright::before {
            width: 1px; height: 12px;
            top: -4px; left: 1.5px;
          }
          .flux-star-bright::after {
            width: 12px; height: 1px;
            top: 1.5px; left: -4px;
          }
          .flux-star-s1 {
            top: 18%; left: 12%;
            background: #89CFF0;
            color: rgba(137,207,240,0.5);
            box-shadow: 0 0 6px 2px rgba(137,207,240,0.6);
            animation: starFlare 6s ease-in-out infinite;
          }
          .flux-star-s2 {
            top: 65%; left: 82%;
            background: #ffffff;
            color: rgba(255,255,255,0.4);
            box-shadow: 0 0 8px 3px rgba(255,255,255,0.5);
            animation: starFlare 8s ease-in-out infinite 2s;
          }
          .flux-star-s3 {
            top: 40%; left: 55%;
            background: #b89eff;
            color: rgba(184,158,255,0.4);
            box-shadow: 0 0 6px 2px rgba(184,158,255,0.5);
            animation: starFlare 7s ease-in-out infinite 4s;
          }
          .flux-star-s4 {
            top: 80%; left: 25%;
            background: #00ffd5;
            color: rgba(0,255,213,0.3);
            box-shadow: 0 0 6px 2px rgba(0,255,213,0.4);
            animation: starFlare 9s ease-in-out infinite 1s;
          }

          /* Twinkling layer C */
          .flux-stars-twinkle {
            position: absolute;
            inset: 0;
            background-image:
              radial-gradient(1px 1px at 5% 50%, rgba(255,200,100,0.7), transparent),
              radial-gradient(1px 1px at 95% 10%, rgba(100,200,255,0.8), transparent),
              radial-gradient(1px 1px at 50% 5%, rgba(255,255,255,0.9), transparent),
              radial-gradient(1px 1px at 33% 95%, rgba(200,150,255,0.7), transparent),
              radial-gradient(1px 1px at 80% 70%, rgba(255,100,200,0.6), transparent);
            background-size: 100% 100%;
            animation: twinkleC 4s ease-in-out infinite;
          }
        `}</style>

        {/* Nebula layers */}
        <div className="flux-nebula flux-nebula-1" />
        <div className="flux-nebula flux-nebula-2" />
        <div className="flux-nebula flux-nebula-3" />

        {/* Star layers */}
        <div className="flux-stars-sm" />
        <div className="flux-stars-md" />
        <div className="flux-stars-twinkle" />

        {/* Bright star points */}
        <div className="flux-star-bright flux-star-s1" />
        <div className="flux-star-bright flux-star-s2" />
        <div className="flux-star-bright flux-star-s3" />
        <div className="flux-star-bright flux-star-s4" />
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