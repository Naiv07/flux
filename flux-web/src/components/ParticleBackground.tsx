
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
        background: "linear-gradient(160deg, #0a0a2e 0%, #080820 40%, #0d0a1a 100%)",
      }}>
        <style>{`
          @keyframes nebulaFloat1 {
            0%,100% { transform: translate(0,0) scale(1); }
            50% { transform: translate(4%,6%) scale(1.12); }
          }
          @keyframes nebulaFloat2 {
            0%,100% { transform: translate(0,0) scale(1.05); }
            50% { transform: translate(-6%,-4%) scale(0.92); }
          }
          @keyframes nebulaFloat3 {
            0%,100% { transform: translate(0,0) scale(1); }
            50% { transform: translate(5%,-6%) scale(1.18); }
          }
          @keyframes nebulaFloat4 {
            0%,100% { transform: translate(0,0) scale(0.95); }
            50% { transform: translate(-4%,5%) scale(1.1); }
          }
          @keyframes twinkle1 {
            0%,100% { opacity:0.2; transform:scale(0.8); }
            50% { opacity:1; transform:scale(1.3); }
          }
          @keyframes twinkle2 {
            0%,100% { opacity:0.7; transform:scale(1); }
            40% { opacity:0.1; transform:scale(0.6); }
          }
          @keyframes twinkle3 {
            0%,33% { opacity:0.9; }
            55% { opacity:0.1; }
            100% { opacity:0.9; }
          }
          @keyframes flare {
            0%,100% { opacity:0.5; transform:scale(1) rotate(0deg); }
            50% { opacity:1; transform:scale(1.5) rotate(45deg); }
          }
          @keyframes flare2 {
            0%,100% { opacity:0.4; transform:scale(0.9) rotate(0deg); }
            50% { opacity:0.9; transform:scale(1.3) rotate(-45deg); }
          }

          .cn { position:absolute; border-radius:50%; filter:blur(65px); }

          /* Purple nebula — top left */
          .cn1 {
            width:75vw; height:75vw;
            top:-15%; left:-20%;
            background: radial-gradient(circle,
              ${connected ? "rgba(120,60,200,0.7)" : "rgba(80,30,150,0.5)"} 0%,
              rgba(60,20,120,0.2) 50%,
              transparent 70%);
            animation: nebulaFloat1 22s ease-in-out infinite;
          }
          /* Pink/magenta nebula — top right */
          .cn2 {
            width:55vw; height:55vw;
            top:5%; right:-15%;
            background: radial-gradient(circle,
              ${connected ? "rgba(180,40,120,0.4)" : "rgba(120,20,80,0.3)"} 0%,
              rgba(100,20,80,0.1) 50%,
              transparent 70%);
            animation: nebulaFloat2 18s ease-in-out infinite;
          }
          /* Deep blue nebula — bottom right */
          .cn3 {
            width:65vw; height:65vw;
            bottom:-10%; right:-15%;
            background: radial-gradient(circle,
              ${connected ? "rgba(20,80,180,0.6)" : "rgba(15,50,130,0.4)"} 0%,
              rgba(10,30,100,0.2) 50%,
              transparent 70%);
            animation: nebulaFloat3 26s ease-in-out infinite;
          }
          /* Purple accent — center */
          .cn4 {
            width:50vw; height:50vw;
            top:35%; left:20%;
            background: radial-gradient(circle,
              ${connected ? "rgba(90,40,180,0.35)" : "rgba(60,20,130,0.2)"} 0%,
              transparent 70%);
            animation: nebulaFloat4 20s ease-in-out infinite;
          }

          /* Tiny star dust */
          .cs1 {
            position:absolute; inset:0;
            background-image:
              radial-gradient(1px 1px at 7% 12%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 18% 35%, rgba(180,160,255,0.5), transparent),
              radial-gradient(1px 1px at 28% 68%, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 42% 20%, rgba(137,207,240,0.6), transparent),
              radial-gradient(1px 1px at 58% 80%, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 65% 45%, rgba(200,150,255,0.5), transparent),
              radial-gradient(1px 1px at 75% 15%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 82% 60%, rgba(137,207,240,0.6), transparent),
              radial-gradient(1px 1px at 92% 30%, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 12% 82%, rgba(180,160,255,0.6), transparent),
              radial-gradient(1px 1px at 35% 50%, rgba(255,255,255,0.4), transparent),
              radial-gradient(1px 1px at 48% 92%, rgba(137,207,240,0.5), transparent),
              radial-gradient(1px 1px at 88% 88%, rgba(255,200,255,0.4), transparent),
              radial-gradient(1px 1px at 55% 35%, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 22% 55%, rgba(180,160,255,0.4), transparent);
            background-size:100% 100%;
            animation: twinkle1 6s ease-in-out infinite;
          }

          /* Medium stars */
          .cs2 {
            position:absolute; inset:0;
            background-image:
              radial-gradient(1.5px 1.5px at 15% 25%, rgba(137,207,240,0.9), transparent),
              radial-gradient(1.5px 1.5px at 45% 15%, rgba(255,255,255,0.8), transparent),
              radial-gradient(1.5px 1.5px at 70% 40%, rgba(200,150,255,0.9), transparent),
              radial-gradient(1.5px 1.5px at 30% 75%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1.5px 1.5px at 85% 70%, rgba(137,207,240,0.8), transparent),
              radial-gradient(1.5px 1.5px at 60% 90%, rgba(255,180,255,0.7), transparent),
              radial-gradient(1.5px 1.5px at 95% 50%, rgba(255,255,255,0.8), transparent);
            background-size:100% 100%;
            animation: twinkle2 8s ease-in-out infinite;
          }

          /* Colored twinkling stars */
          .cs3 {
            position:absolute; inset:0;
            background-image:
              radial-gradient(1.5px 1.5px at 5% 40%, rgba(255,100,200,0.8), transparent),
              radial-gradient(1.5px 1.5px at 90% 15%, rgba(100,220,255,0.9), transparent),
              radial-gradient(1.5px 1.5px at 50% 5%, rgba(255,255,255,0.9), transparent),
              radial-gradient(1.5px 1.5px at 20% 95%, rgba(180,100,255,0.8), transparent),
              radial-gradient(1.5px 1.5px at 78% 82%, rgba(255,150,100,0.6), transparent),
              radial-gradient(1.5px 1.5px at 40% 60%, rgba(100,255,200,0.7), transparent);
            background-size:100% 100%;
            animation: twinkle3 4s ease-in-out infinite;
          }

          /* Bright star flares */
          .bf {
            position:absolute;
            border-radius:50%;
          }
          .bf::before, .bf::after {
            content:'';
            position:absolute;
            border-radius:2px;
            background:currentColor;
          }
          .bf::before { width:1px; height:14px; top:-5px; left:calc(50% - 0.5px); }
          .bf::after  { width:14px; height:1px; top:calc(50% - 0.5px); left:-5px; }

          .bf1 {
            width:5px; height:5px;
            top:15%; left:10%;
            background:#ff6ec7;
            color:rgba(255,110,199,0.45);
            box-shadow:0 0 8px 3px rgba(255,110,199,0.5);
            animation: flare 7s ease-in-out infinite;
          }
          .bf2 {
            width:6px; height:6px;
            top:62%; left:85%;
            background:#ffffff;
            color:rgba(255,255,255,0.4);
            box-shadow:0 0 10px 4px rgba(255,255,255,0.45);
            animation: flare2 9s ease-in-out infinite 1.5s;
          }
          .bf3 {
            width:4px; height:4px;
            top:38%; left:58%;
            background:#a78bff;
            color:rgba(167,139,255,0.4);
            box-shadow:0 0 7px 3px rgba(167,139,255,0.5);
            animation: flare 8s ease-in-out infinite 3s;
          }
          .bf4 {
            width:5px; height:5px;
            top:78%; left:22%;
            background:#00ffd5;
            color:rgba(0,255,213,0.35);
            box-shadow:0 0 8px 3px rgba(0,255,213,0.4);
            animation: flare2 10s ease-in-out infinite 0.5s;
          }
          .bf5 {
            width:4px; height:4px;
            top:25%; left:72%;
            background:#89CFF0;
            color:rgba(137,207,240,0.4);
            box-shadow:0 0 7px 3px rgba(137,207,240,0.45);
            animation: flare 6s ease-in-out infinite 2s;
          }
        `}</style>

        <div className="cn cn1" />
        <div className="cn cn2" />
        <div className="cn cn3" />
        <div className="cn cn4" />

        <div className="cs1" />
        <div className="cs2" />
        <div className="cs3" />

        <div className="bf bf1" />
        <div className="bf bf2" />
        <div className="bf bf3" />
        <div className="bf bf4" />
        <div className="bf bf5" />
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