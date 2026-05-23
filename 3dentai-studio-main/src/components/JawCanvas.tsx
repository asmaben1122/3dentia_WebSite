import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Arch geometry constants ──────────────────────────────────────────────────
const ARCH_W  = 1.05;   // half-width of the dental arch
const ARCH_D  = 0.72;   // depth of the arch (front-to-back)
const N_TEETH = 14;     // teeth per arch (upper + lower)

// Returns [width, height, depth] for a tooth based on its position on the arch
function toothSize(i: number): [number, number, number] {
  const fromCenter = Math.abs(i - (N_TEETH - 1) / 2) / ((N_TEETH - 1) / 2);
  if (fromCenter > 0.78) return [0.19, 0.19, 0.17]; // molars
  if (fromCenter > 0.55) return [0.15, 0.24, 0.14]; // premolars
  if (fromCenter > 0.38) return [0.13, 0.28, 0.12]; // canines
  return [0.115, 0.31, 0.105];                        // incisors
}

// x, z position along the elliptical arch for tooth index i
function archXZ(i: number): [number, number] {
  const t = (i / (N_TEETH - 1)) * Math.PI;
  return [-ARCH_W * Math.cos(t), ARCH_D * Math.sin(t)];
}

// ── One arch (upper or lower) ────────────────────────────────────────────────
function Arch({
  isUpper,
  toothColor, toothEmissive,
  boneColor,  boneEmissive,
}: {
  isUpper:      boolean;
  toothColor:   string;
  toothEmissive:string;
  boneColor:    string;
  boneEmissive: string;
}) {
  const yBone = isUpper ? 0.40 : -0.40;

  // Jaw-bone tube following the arch curve
  const boneCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI;
      pts.push(new THREE.Vector3(-ARCH_W * Math.cos(t), yBone, ARCH_D * Math.sin(t)));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [yBone]);

  const boneMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color:             new THREE.Color(boneColor),
        emissive:          new THREE.Color(boneEmissive),
        emissiveIntensity: 0.6,
        roughness:         0.10,
        metalness:         0.45,
        transparent:       true,
        opacity:           0.78,
      }),
    [boneColor, boneEmissive]
  );

  const toothMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color:             new THREE.Color(toothColor),
        emissive:          new THREE.Color(toothEmissive),
        emissiveIntensity: 0.50,
        roughness:         0.06,
        metalness:         0.20,
        transparent:       true,
        opacity:           0.92,
      }),
    [toothColor, toothEmissive]
  );

  // Pre-compute all tooth transforms
  const teethData = useMemo(
    () =>
      Array.from({ length: N_TEETH }, (_, i) => {
        const t   = (i / (N_TEETH - 1)) * Math.PI;
        const [x, z] = archXZ(i);
        const [tw, th, td] = toothSize(i);
        // Upper teeth hang down from yBone; lower teeth push up
        const y = isUpper ? yBone - th / 2 - 0.015 : yBone + th / 2 + 0.015;
        const ry = -(t - Math.PI / 2); // rotate each tooth to face arch centre
        return {
          position: [x, y, z] as [number, number, number],
          rotation: [0, ry, 0] as [number, number, number],
          size:     [tw, th, td] as [number, number, number],
        };
      }),
    [isUpper, yBone]
  );

  return (
    <group>
      {/* Jaw-bone arch tube */}
      <mesh material={boneMat}>
        <tubeGeometry args={[boneCurve, 64, 0.068, 8, false]} />
      </mesh>

      {/* Teeth */}
      {teethData.map((d, i) => (
        <mesh key={i} position={d.position} rotation={d.rotation} material={toothMat}>
          <boxGeometry args={d.size} />
        </mesh>
      ))}
    </group>
  );
}

// ── Animated jaw group ───────────────────────────────────────────────────────
function Jaw() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Continuous Y rotation + gentle X bob
    ref.current.rotation.y = clock.elapsedTime * 0.38;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.45) * 0.13 - 0.08;
  });

  return (
    <group ref={ref}>
      {/* Upper arch — warmer pink */}
      <Arch
        isUpper
        toothColor="#f0abfc"
        toothEmissive="#a855f7"
        boneColor="#e879f9"
        boneEmissive="#c026d3"
      />
      {/* Lower arch — cooler purple */}
      <Arch
        isUpper={false}
        toothColor="#d8b4fe"
        toothEmissive="#7c3aed"
        boneColor="#c084fc"
        boneEmissive="#6d28d9"
      />
    </group>
  );
}

// ── Exported canvas ──────────────────────────────────────────────────────────
export function JawCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.9, 3.3], fov: 48 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* Low ambient + coloured point lights for the glow effect */}
      <ambientLight intensity={0.08} />
      <pointLight position={[2.5,  3,   2]}  intensity={6}   color="#e879f9" />
      <pointLight position={[-2.5,-1.5, 2]}  intensity={4}   color="#38bdf8" />
      <pointLight position={[0,   -3,  -1]}  intensity={2.5} color="#7c3aed" />
      <pointLight position={[0,    2,  -2]}  intensity={2}   color="#f0abfc" />
      <Jaw />
    </Canvas>
  );
}
