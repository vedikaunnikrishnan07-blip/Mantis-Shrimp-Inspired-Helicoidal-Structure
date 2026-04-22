import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

interface DebrisProps {
  count: number;
  impactProgress: number;
  forceMagnitude: number;
  layerCount: number;
}

const Debris: React.FC<DebrisProps> = ({ count, impactProgress, forceMagnitude, layerCount }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const topY = (layerCount / 2) * (0.15 + 0.02);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = topY; 
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      
      velocities[i * 3] = (Math.random() - 0.5) * 10 * forceMagnitude;
      velocities[i * 3 + 1] = Math.random() * 12 * forceMagnitude;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 10 * forceMagnitude;

      const c = 0.7 + Math.random() * 0.3;
      colors[i * 3] = c;
      colors[i * 3 + 1] = c;
      colors[i * 3 + 2] = c;
    }
    return { positions, velocities, colors };
  }, [count, forceMagnitude, layerCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current || impactProgress === 0 || impactProgress === 1) return;
    
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += particles.velocities[i * 3] * delta;
      pos[i * 3 + 1] += particles.velocities[i * 3 + 1] * delta;
      pos[i * 3 + 2] += particles.velocities[i * 3 + 2] * delta;
      
      particles.velocities[i * 3 + 1] -= 9.8 * delta; // Gravity
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - (impactProgress - 0.2) * 2);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.08} 
        vertexColors
        transparent 
        opacity={0.8} 
      />
    </points>
  );
};

interface ShockwaveProps {
  impactProgress: number;
  forceMagnitude: number;
  layerCount: number;
}

const Shockwave: React.FC<ShockwaveProps> = ({ impactProgress, forceMagnitude, layerCount }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const topY = (layerCount / 2) * (0.15 + 0.02);
  
  useFrame((state) => {
    if (meshRef.current) {
      const jitter = 1 + (Math.random() - 0.5) * 0.1;
      const s = impactProgress * 25 * forceMagnitude * jitter;
      meshRef.current.scale.set(s, s, s);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, 1 - impactProgress * 3);
      mat.emissiveIntensity = Math.max(0, 15 * (1 - impactProgress * 2));
    }
  });

  return (
    <group>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, topY, 0]}>
        <ringGeometry args={[0.8, 1.1, 64]} />
        <meshStandardMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.8} 
          emissive="#ffffff" 
          emissiveIntensity={15} 
          side={THREE.DoubleSide}
        />
      </mesh>
      <Text
        position={[0, topY + 0.2, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        ENERGY WAVE
      </Text>
    </group>
  );
};

interface FiberLayerProps {
  position: [number, number, number];
  rotation: number;
  width: number;
  depth: number;
  thickness: number;
  stress: number;
  isImpacted: boolean;
  crackProgress: number;
  type: 'stacked' | 'helicoid';
  baseColor: string;
}

const FiberLayer: React.FC<FiberLayerProps> = ({
  position,
  rotation,
  width,
  depth,
  thickness,
  stress,
  isImpacted,
  crackProgress,
  type,
  baseColor
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create fiber lines within the layer
  const fiberCount = 12;
  const fibers = useMemo(() => {
    const arr = [];
    for (let i = 0; i < fiberCount; i++) {
      const offset = (i / (fiberCount - 1) - 0.5) * width;
      arr.push(offset);
    }
    return arr;
  }, [width, fiberCount]);

  // Calculate stress color
  const color = useMemo(() => {
    const bColor = new THREE.Color(baseColor);
    const stressColor = new THREE.Color('#ff0000'); // Pure red for highest stress
    return bColor.lerp(stressColor, stress);
  }, [stress, baseColor]);

  // Delamination effect for stacked model
  const delaminationOffset = useMemo(() => {
    if (type === 'stacked' && stress > 0.6) {
      return (stress - 0.6) * 0.2;
    }
    return 0;
  }, [type, stress]);

  // Stable random offsets for crack segments
  const crackOffsets = useMemo(() => {
    return [0, 1, 2].map((i) => ({
      x: (Math.random() - 0.5) * 0.15,
      rotX: (Math.random() - 0.5) * 0.3,
      rotY: (Math.random() - 0.5) * 0.4,
      rotZ: (Math.random() - 0.5) * 0.3,
      microX: (Math.random() - 0.5) * 0.5,
      microZ: (Math.random() - 0.5) * 0.5,
      thicknessMod: 0.8 + Math.random() * 0.4,
      jitterSeed: Math.random() * 100,
    }));
  }, []);

  // Add jitter to crack for "live" fracture feel
  const [jitter, setJitter] = useState(0);
  useFrame((state) => {
    if (isImpacted && crackProgress > 0 && crackProgress < 1) {
      setJitter(Math.sin(state.clock.elapsedTime * 50) * 0.02);
    } else {
      setJitter(0);
    }
  });

  return (
    <group position={[position[0], position[1] + delaminationOffset, position[2]]} rotation={[0, rotation, 0]}>
      {/* Layer Base */}
      <mesh ref={meshRef}>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.7} 
          emissive={color}
          emissiveIntensity={stress > 0 ? stress * 6 : 0.1}
        />
      </mesh>

      {/* Fiber Direction Label (Only for top-most layer for clarity) */}
      {position[1] > 1.5 && (
        <Text
          position={[0, thickness + 0.1, depth / 2 + 0.2]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          rotation={[-Math.PI / 2, 0, 0]}
        >
          FIBER ORIENTATION
        </Text>
      )}

      {/* Fibers */}
      {fibers.map((offset, i) => {
        const distToCenter = Math.abs(offset);
        const displacement = (distToCenter < 0.5 && isImpacted) ? (0.15 * crackProgress) : 0;
        const side = offset > 0 ? 1 : -1;

        return (
          <mesh key={i} position={[offset + (displacement * side), 0, 0]}>
            <boxGeometry args={[0.08, thickness * 1.3, depth]} />
            <meshStandardMaterial 
              color={color} 
              emissive={color}
              emissiveIntensity={stress > 0 ? stress * 8 : 0.3}
            />
          </mesh>
        );
      })}

      {/* Crack Visualization */}
      {isImpacted && crackProgress > 0 && (
        <group>
          {/* Main Crack - Multi-segmented for "jagged" look */}
          {crackOffsets.map((offset, i) => (
            <mesh 
              key={i}
              position={[
                offset.x + jitter, 
                0, 
                (i - 1) * (depth / 3)
              ]} 
              rotation={[
                offset.rotX + jitter, 
                type === 'stacked' ? 0 : -rotation + offset.rotY,
                offset.rotZ
              ]}
            >
               <boxGeometry args={[0.6 * crackProgress * offset.thicknessMod, thickness * 6, depth / 2]} />
               <meshStandardMaterial 
                 color={type === 'stacked' ? "#ff0000" : "#ff6600"} 
                 emissive={type === 'stacked' ? "#ff0000" : "#ff6600"} 
                 emissiveIntensity={40 + jitter * 200 + Math.random() * 20} 
                 transparent
                 opacity={0.98}
                 depthTest={false}
               />
            </mesh>
          ))}
          
          {/* Vertical Crack Depth Indicator (Visualizing the "path") */}
          <mesh position={[0, -thickness * 2, 0]}>
            <boxGeometry args={[0.05, thickness * 8 * crackProgress, 0.05]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={20} />
          </mesh>
          
          {/* Micro-cracks / Fiber Breakage */}
          {stress > 0.4 && crackOffsets.map((offset, i) => (
            <mesh 
              key={`micro-${i}`}
              position={[offset.microX + jitter, 0, offset.microZ]}
              rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
            >
              <boxGeometry args={[0.02, 0.02, 0.4 * crackProgress]} />
              <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={15} transparent opacity={0.6} />
            </mesh>
          ))}
          
          {/* Stress Veins - Spreading out */}
          {stress > 0.5 && (
            <group rotation={[0, rotation + Math.PI / 2, 0]}>
              <mesh position={[width / 3 * crackProgress, 0, 0]}>
                <boxGeometry args={[width / 1.5 * crackProgress, 0.03 + jitter * 0.5, 0.03 + jitter * 0.5]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={15 + jitter * 50} transparent opacity={0.7} />
              </mesh>
              <mesh position={[-width / 3 * crackProgress, 0, 0]}>
                <boxGeometry args={[width / 1.5 * crackProgress, 0.03 + jitter * 0.5, 0.03 + jitter * 0.5]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={15 + jitter * 50} transparent opacity={0.7} />
              </mesh>
            </group>
          )}

          {/* Delamination Glow for Stacked */}
          {type === 'stacked' && stress > 0.7 && (
            <mesh position={[0, thickness, 0]}>
              <boxGeometry args={[width, 0.02, depth]} />
              <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={15} transparent opacity={0.4} />
            </mesh>
          )}

          {/* Secondary Branching Cracks for Helicoid */}
          {type === 'helicoid' && (
            <group rotation={[0, Math.PI / 4, 0]}>
              <mesh position={[0.6 * crackProgress + jitter, 0, 0.6 * crackProgress + jitter]}>
                <boxGeometry args={[0.25 * crackProgress, thickness * 2, depth * 0.6]} />
                <meshStandardMaterial 
                  color="#ffff00" 
                  emissive="#ffff00" 
                  emissiveIntensity={20 + jitter * 100} 
                  depthTest={false}
                />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
};

interface BouligandModelProps {
  type: 'stacked' | 'helicoid';
  rotationAngle: number;
  layerCount: number;
  impactProgress: number;
  forceMagnitude: number;
  material: {
    color: string;
    stiffness: number;
    toughness: number;
  };
}

export const BouligandModel: React.FC<BouligandModelProps> = ({
  type,
  rotationAngle,
  layerCount,
  impactProgress,
  forceMagnitude,
  material
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const width = 4;
  const depth = 4;
  const thickness = 0.15;
  const gap = 0.02;

  const layers = useMemo(() => {
    const arr = [];
    // Effective impact depth based on force AND material toughness
    // Helicoid structures dissipate energy, so penetration is shallower
    const depthMultiplier = type === 'stacked' ? 1.2 : 0.4;
    const effectiveImpact = impactProgress * forceMagnitude * (1.2 - material.toughness) * depthMultiplier;
    
    for (let i = 0; i < layerCount; i++) {
      const rotation = type === 'stacked' ? 0 : (i * rotationAngle * Math.PI) / 180;
      const yPos = (layerCount / 2 - i) * (thickness + gap);
      
      // Calculate stress based on impact progress and layer depth
      // Adding a slight delay per layer for wave effect
      const layerImpactStart = (i / layerCount) * 0.8; 
      
      let stress = 0;
      if (effectiveImpact > layerImpactStart) {
        // Stress also affected by stiffness
        // Helicoid spreads stress more laterally (lower peak stress per layer)
        const stressMultiplier = type === 'stacked' ? 8 : 4;
        stress = Math.min(1, (effectiveImpact - layerImpactStart) * stressMultiplier * material.stiffness);
      }

      // Crack progress affected by toughness and sequential timing with "staccato" steps
      // Helicoid prevents crack propagation through the thickness
      const crackPropagationResistance = type === 'helicoid' ? 0.4 : 1.0;
      const rawProgress = (effectiveImpact - layerImpactStart) * 4 * (1.1 - material.toughness) * crackPropagationResistance;
      const steppedProgress = Math.floor(rawProgress * 5) / 5; // Step-like growth
      
      arr.push({
        id: i,
        position: [0, yPos, 0] as [number, number, number],
        rotation,
        stress,
        isImpacted: effectiveImpact > layerImpactStart,
        crackProgress: Math.max(0, Math.min(1, steppedProgress))
      });
    }
    return arr;
  }, [type, rotationAngle, layerCount, impactProgress, forceMagnitude, material]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {impactProgress > 0 && impactProgress < 0.8 && (
        <>
          <Shockwave impactProgress={impactProgress} forceMagnitude={forceMagnitude} layerCount={layerCount} />
          <Debris count={150} impactProgress={impactProgress} forceMagnitude={forceMagnitude} layerCount={layerCount} />
        </>
      )}
      
      {/* Crack Path Visualization (Connecting Layers) */}
      {impactProgress > 0 && (
        <group>
          {(() => {
            const depthMultiplier = type === 'stacked' ? 1.2 : 0.4;
            const effectiveImpact = impactProgress * forceMagnitude * (1.2 - material.toughness) * depthMultiplier;
            const points: THREE.Vector3[] = [];
            
            for (let i = 0; i < layerCount; i++) {
              const layerImpactStart = (i / layerCount) * 0.8;
              if (effectiveImpact > layerImpactStart) {
                const rotation = type === 'stacked' ? 0 : (i * rotationAngle * Math.PI) / 180;
                const yPos = (layerCount / 2 - i) * (thickness + gap);
                // The crack follows a helical path
                const radius = 0.5;
                points.push(new THREE.Vector3(
                  Math.cos(rotation) * radius,
                  yPos,
                  Math.sin(rotation) * radius
                ));
              }
            }
            
            if (points.length < 2) return null;
            
            return (
              <group>
                <line>
                  <bufferGeometry attach="geometry" onUpdate={self => self.setFromPoints(points)} />
                  <lineBasicMaterial attach="material" color="#ff0000" linewidth={2} transparent opacity={0.6} />
                </line>
                <Text
                  position={points[0].clone().add(new THREE.Vector3(0.5, 0, 0))}
                  fontSize={0.15}
                  color="#ff0000"
                  anchorX="left"
                  anchorY="middle"
                >
                  CRACK PATH
                </Text>
              </group>
            );
          })()}
        </group>
      )}

      {layers.map((layer) => (
        <FiberLayer
          key={layer.id}
          position={layer.position}
          rotation={layer.rotation}
          width={width}
          depth={depth}
          thickness={thickness}
          stress={layer.stress}
          isImpacted={layer.isImpacted}
          crackProgress={layer.crackProgress}
          type={type}
          baseColor={material.color}
        />
      ))}
      
      {/* Impact Point Indicator & Force Vector */}
      {impactProgress > 0 && impactProgress < 1 && (
        <group position={[0, (layerCount / 2) * (thickness + gap) + 0.5, 0]}>
          {/* Impact Sphere */}
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={10} />
          </mesh>
          
          {/* Force Vector Arrow */}
          <group position={[0, 1, 0]}>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
              <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.1, 0.2, 8]} />
              <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
            </mesh>
            <Text
              position={[0, 1.2, 0]}
              fontSize={0.2}
              color="#00ffff"
              anchorX="center"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/jetbrainsmono/v18/t6q243zW_C_mX7v_6CCT6LFUPcZeXmX_6CCT6LFUPcZeXmX_.woff"
            >
              FORCE VECTOR
            </Text>
          </group>
          
          {/* Depth Gauge Line */}
          <mesh position={[width / 2 + 0.5, -(layerCount / 2) * (thickness + gap), 0]}>
            <boxGeometry args={[0.02, layerCount * (thickness + gap), 0.02]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          
          {/* Active Depth Marker */}
          {(() => {
            const depthMultiplier = type === 'stacked' ? 1.2 : 0.4;
            const effectiveImpact = impactProgress * forceMagnitude * (1.2 - material.toughness) * depthMultiplier;
            const currentDepthY = -(effectiveImpact / 0.8) * (layerCount * (thickness + gap));
            
            return (
              <group position={[width / 2 + 0.5, currentDepthY, 0]}>
                <mesh>
                  <boxGeometry args={[0.2, 0.05, 0.1]} />
                  <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={5} />
                </mesh>
                <Text
                  position={[0.5, 0, 0]}
                  fontSize={0.15}
                  color="#ff4444"
                  anchorX="left"
                  anchorY="middle"
                >
                  CRACK DEPTH
                </Text>
              </group>
            );
          })()}
        </group>
      )}
    </group>
  );
};
