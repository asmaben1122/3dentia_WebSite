import { useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ── Arch geometry constants (same as JawCanvas) ──────────────────────────────
const ARCH_W  = 1.05;
const ARCH_D  = 0.72;
const N_TEETH = 14;

function toothSize(i: number): [number, number, number] {
  const fromCenter = Math.abs(i - (N_TEETH - 1) / 2) / ((N_TEETH - 1) / 2);
  if (fromCenter > 0.78) return [0.19, 0.19, 0.17];
  if (fromCenter > 0.55) return [0.15, 0.24, 0.14];
  if (fromCenter > 0.38) return [0.13, 0.28, 0.12];
  return [0.115, 0.31, 0.105];
}

function archXZ(i: number): [number, number] {
  const t = (i / (N_TEETH - 1)) * Math.PI;
  return [-ARCH_W * Math.cos(t), ARCH_D * Math.sin(t)];
}

// ── One arch (upper or lower) ────────────────────────────────────────────────
function Arch({
  isUpper, toothColor, toothEmissive, boneColor, boneEmissive,
}: {
  isUpper: boolean;
  toothColor: string; toothEmissive: string;
  boneColor: string;  boneEmissive: string;
}) {
  const yBone = isUpper ? 0.40 : -0.40;

  const boneCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI;
      pts.push(new THREE.Vector3(-ARCH_W * Math.cos(t), yBone, ARCH_D * Math.sin(t)));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [yBone]);

  const boneMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(boneColor), emissive: new THREE.Color(boneEmissive),
    emissiveIntensity: 0.6, roughness: 0.10, metalness: 0.45, transparent: true, opacity: 0.78,
  }), [boneColor, boneEmissive]);

  const toothMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(toothColor), emissive: new THREE.Color(toothEmissive),
    emissiveIntensity: 0.50, roughness: 0.06, metalness: 0.20, transparent: true, opacity: 0.92,
  }), [toothColor, toothEmissive]);

  const teethData = useMemo(() =>
    Array.from({ length: N_TEETH }, (_, i) => {
      const t = (i / (N_TEETH - 1)) * Math.PI;
      const [x, z] = archXZ(i);
      const [tw, th, td] = toothSize(i);
      const y = isUpper ? yBone - th / 2 - 0.015 : yBone + th / 2 + 0.015;
      return {
        position: [x, y, z] as [number, number, number],
        rotation: [0, -(t - Math.PI / 2), 0] as [number, number, number],
        size: [tw, th, td] as [number, number, number],
      };
    }),
  [isUpper, yBone]);

  return (
    <group>
      <mesh material={boneMat}>
        <tubeGeometry args={[boneCurve, 64, 0.068, 8, false]} />
      </mesh>
      {teethData.map((d, i) => (
        <mesh key={i} position={d.position} rotation={d.rotation} material={toothMat}>
          <boxGeometry args={d.size} />
        </mesh>
      ))}
    </group>
  );
}

// ── Inner Three.js component: reads shared rotation refs each frame ───────────
function InteractiveJaw({
  rotRef,
  autoRef,
}: {
  rotRef: React.MutableRefObject<{ x: number; y: number }>;
  autoRef: React.MutableRefObject<boolean>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (autoRef.current) {
      rotRef.current.y += delta * 0.38;
    }
    groupRef.current.rotation.y = rotRef.current.y;
    groupRef.current.rotation.x = rotRef.current.x;
  });

  return (
    <group ref={groupRef}>
      <Arch isUpper toothColor="#f0abfc" toothEmissive="#a855f7" boneColor="#e879f9" boneEmissive="#c026d3" />
      <Arch isUpper={false} toothColor="#d8b4fe" toothEmissive="#7c3aed" boneColor="#c084fc" boneEmissive="#6d28d9" />
    </group>
  );
}

// ── Scroll-to-zoom (attached to the WebGL canvas element) ───────────────────
function CameraController() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camera as THREE.PerspectiveCamera;
      cam.position.z = Math.max(1.8, Math.min(6.5, cam.position.z + e.deltaY * 0.006));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [camera, gl]);
  return null;
}

// ── Public component ─────────────────────────────────────────────────────────
export interface JawViewer3DProps {
  /** Show a processing overlay (spinner) on top of the 3D jaw */
  processing?: boolean;
  /** Show a faint idle hint when no scan has started yet */
  idle?: boolean;
  /** Whether a patient is already selected (changes idle hint text) */
  patientSelected?: boolean;
  /** Optional status line shown in the processing overlay */
  processingText?: string;
}

export function JawViewer3D({
  processing = false,
  idle = false,
  patientSelected = false,
  processingText = "AI Reconstruction in progress…",
}: JawViewer3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Rotation angles tracked as mutable refs — updated by DOM events, read by useFrame
  const rotRef  = useRef({ x: -0.08, y: 0 });
  const autoRef = useRef(true);    // auto-rotate when true

  // Drag state (DOM-level only, no React re-renders)
  const draggingRef = useRef(false);
  const lastRef     = useRef({ x: 0, y: 0 });
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resumeAuto = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { autoRef.current = true; }, 3000);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    /* ─ Mouse ─ */
    const onMouseDown = (e: MouseEvent) => {
      draggingRef.current = true;
      autoRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      lastRef.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastRef.current.x;
      const dy = e.clientY - lastRef.current.y;
      rotRef.current.y += dx * 0.010;
      rotRef.current.x = Math.max(-1.1, Math.min(1.1, rotRef.current.x + dy * 0.010));
      lastRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      el.style.cursor = "grab";
      resumeAuto();
    };

    /* ─ Touch ─ */
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      draggingRef.current = true;
      autoRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      lastRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || e.touches.length !== 1) return;
      e.preventDefault(); // prevent page scroll while rotating
      const dx = e.touches[0].clientX - lastRef.current.x;
      const dy = e.touches[0].clientY - lastRef.current.y;
      rotRef.current.y += dx * 0.010;
      rotRef.current.x = Math.max(-1.1, Math.min(1.1, rotRef.current.x + dy * 0.010));
      lastRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      draggingRef.current = false;
      resumeAuto();
    };

    // Mousedown on wrapper; move/up on window so dragging outside the canvas still works
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resumeAuto]);

  return (
    <div ref={wrapperRef} style={{ position: "absolute", inset: 0, cursor: "grab" }}>
      {/* ── Three.js Canvas ── */}
      <Canvas
        camera={{ position: [0, 0.9, 3.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ position: "absolute", inset: 0 }}
      >
        <ambientLight intensity={0.08} />
        <pointLight position={[2.5,  3,   2]}  intensity={6}   color="#e879f9" />
        <pointLight position={[-2.5,-1.5, 2]}  intensity={4}   color="#38bdf8" />
        <pointLight position={[0,   -3,  -1]}  intensity={2.5} color="#7c3aed" />
        <pointLight position={[0,    2,  -2]}  intensity={2}   color="#f0abfc" />
        <InteractiveJaw rotRef={rotRef} autoRef={autoRef} />
        <CameraController />
      </Canvas>

      {/* ── Processing overlay ── */}
      {processing && (
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 text-white/85 pointer-events-none z-10">
          <div className="h-12 w-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="font-mono text-sm tracking-wide">{processingText}</p>
        </div>
      )}

      {/* ── Idle hint ── */}
      {idle && !processing && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 pointer-events-none z-10">
          <p className="text-white/30 text-sm">
            {patientSelected
              ? "Upload a panoramic image to begin reconstruction"
              : "Select a patient, then upload a panoramic image"}
          </p>
        </div>
      )}

      {/* ── Interaction hint (bottom-right, fades on hover) ── */}
      {!processing && (
        <div className="absolute bottom-3 right-4 pointer-events-none z-10 opacity-30 text-white text-[10px] font-mono space-x-3">
          <span>drag to rotate</span>
          <span>·</span>
          <span>scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
