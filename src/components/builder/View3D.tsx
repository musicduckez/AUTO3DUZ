import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { buildParts } from '../../lib/compatibility';
import { useShopStore } from '../../store/useShopStore';
import type { Category } from '../../types';

function Box({
  pos,
  size,
  color,
  emissive,
}: {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive?: string;
}) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.4 : 0} metalness={0.4} roughness={0.35} />
    </mesh>
  );
}

function Scene() {
  const products = useShopStore((s) => s.products);
  const slots = useShopStore((s) => s.build);
  const color = useShopStore((s) => s.caseColor);
  const setSlot = useShopStore((s) => s.setSlot);
  const parts = buildParts(products, slots);

  const pick = (cat: Category) => {
    const el = document.getElementById(`slot-${cat}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!slots[cat]) setSlot(cat, undefined);
  };

  return (
    <>
      <ambientLight intensity={0.45} />
      <spotLight position={[6, 8, 6]} angle={0.4} penumbra={0.6} intensity={2} castShadow />
      <pointLight position={[-4, 3, -2]} intensity={0.8} color={color} />
      <Box pos={[0, 0, 0]} size={[3.2, 4.2, 1.8]} color={color} />
      <mesh position={[1.62, 0, 0]}>
        <boxGeometry args={[0.04, 3.9, 1.6]} />
        <meshPhysicalMaterial color="#c4b5fd" transparent opacity={0.18} roughness={0} transmission={0.9} />
      </mesh>
      {parts.mb && (
        <mesh position={[-0.15, 0.15, -0.55]} onClick={() => pick('mb')}>
          <boxGeometry args={[2.2, 2.6, 0.08]} />
          <meshStandardMaterial color="#166534" />
        </mesh>
      )}
      {parts.cpu && <Box pos={[-0.1, 0.5, -0.42]} size={[0.5, 0.5, 0.12]} color="#f59e0b" />}
      {parts.cooler && (
        <mesh position={[-0.1, 0.5, -0.05]}>
          <cylinderGeometry args={[0.42, 0.42, 0.55, 20]} />
          <meshStandardMaterial color="#67e8f9" metalness={0.6} />
        </mesh>
      )}
      {parts.ram && (
        <>
          <Box pos={[0.55, 0.7, -0.4]} size={[0.08, 0.9, 0.28]} color="#38bdf8" emissive="#38bdf8" />
          <Box pos={[0.7, 0.7, -0.4]} size={[0.08, 0.9, 0.28]} color="#38bdf8" emissive="#38bdf8" />
        </>
      )}
      {parts.gpu && <Box pos={[-0.05, -0.55, 0.05]} size={[2.1, 0.38, 0.85]} color="#16a34a" emissive="#14532d" />}
      {parts.storage && <Box pos={[-0.7, -1.1, -0.4]} size={[0.7, 0.08, 0.35]} color="#d4d4d4" />}
      {parts.psu && <Box pos={[0.15, -1.7, 0]} size={[1.6, 0.55, 1.1]} color="#292524" />}
      {parts.fan && (
        <>
          <mesh position={[-1.4, 1.3, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.08, 16]} />
            <meshStandardMaterial color="#e9d5ff" />
          </mesh>
          <mesh position={[-1.4, 0.4, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.08, 16]} />
            <meshStandardMaterial color="#e9d5ff" />
          </mesh>
        </>
      )}
      <gridHelper args={[8, 8, '#4c1d95', '#1e1b4b']} position={[0, -2.2, 0]} />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={10} />
    </>
  );
}

export function View3D() {
  return (
    <div className="h-[420px] overflow-hidden rounded-3xl bg-black">
      <Canvas shadows camera={{ position: [5.2, 2.4, 4.4], fov: 45 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
