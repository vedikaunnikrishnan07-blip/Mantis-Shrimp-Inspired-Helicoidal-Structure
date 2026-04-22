import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, Stars, Environment, ContactShadows, Line as DreiLine } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, ChevronRight, ChevronLeft, Info, Activity, Zap, ShieldAlert } from 'lucide-react';

// --- Constants ---
const NUM_LAYERS = 24;
const LAYER_HEIGHT = 0.15;
const LAYER_WIDTH = 4;
const LAYER_DEPTH = 4;
const ROTATION_STEP = Math.PI / 12; // 15 degrees per layer

// --- Types ---
type AnimationStep = 
  | 'IDLE'
  | 'BUILDING'
  | 'IMPACT_READY'
  | 'IMPACT_FORCE'
  | 'STRESS_CONCENTRATION'
  | 'CRACK_INITIATION'
  | 'CRACK_PROPAGATION'
  | 'ENERGY_DISSIPATION'
  | 'FINAL_FAILURE';

const STEPS: AnimationStep[] = [
  'IDLE',
  'BUILDING',
  'IMPACT_READY',
  'IMPACT_FORCE',
  'STRESS_CONCENTRATION',
  'CRACK_INITIATION',
  'CRACK_PROPAGATION',
  'ENERGY_DISSIPATION',
  'FINAL_FAILURE'
];

const STEP_LABELS: Record<AnimationStep, string> = {
  IDLE: 'Ready to Start',
  BUILDING: '1. Building Helicoidal Stack',
  IMPACT_READY: 'Ready for Impact',
  IMPACT_FORCE: '2. Applying Impact Force',
  STRESS_CONCENTRATION: '3. Stress Concentration',
  CRACK_INITIATION: '4. Crack Initiation',
  CRACK_PROPAGATION: '5. Crack Propagation',
  ENERGY_DISSIPATION: '6. Energy Dissipation & Twisting',
  FINAL_FAILURE: '7. Final Failure State'
};

// --- Components ---

const Layer = ({ index, visible, stress, rotation }: { index: number, visible: boolean, stress: number, rotation: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Base color is a nice pearlescent white/blue
  const baseColor = new THREE.Color('#e2e8f0');
  const stressColor = new THREE.Color('#ef4444');
  
  useFrame(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.color.lerpColors(baseColor, stressColor, stress);
      material.emissive.lerpColors(new THREE.Color(0, 0, 0), stressColor, stress * 0.5);
      
      // Fixed rotation for the layer
      meshRef.current.rotation.y = rotation;
    }
  });

  if (!visible) return null;

  return (
    <mesh 
      ref={meshRef}
      position={[0, index * LAYER_HEIGHT - (NUM_LAYERS * LAYER_HEIGHT) / 2, 0]}
    >
      <boxGeometry args={[LAYER_WIDTH, LAYER_HEIGHT * 0.9, LAYER_DEPTH]} />
      <meshStandardMaterial 
        roughness={0.1} 
        metalness={0.2} 
        transparent 
        opacity={0.9}
      />
    </mesh>
  );
};

const ImpactStriker = ({ active, onHit }: { active: boolean, onHit: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hitTriggered, setHitTriggered] = useState(false);

  useFrame((state) => {
    if (!active) {
      if (meshRef.current) meshRef.current.position.y = 10;
      setHitTriggered(false);
      return;
    }

    if (meshRef.current) {
      const targetY = (NUM_LAYERS * LAYER_HEIGHT) / 2 + 0.5;
      if (meshRef.current.position.y > targetY) {
        meshRef.current.position.y -= 0.5;
      } else if (!hitTriggered) {
        setHitTriggered(true);
        onHit();
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 10, 0]}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.1} />
    </mesh>
  );
};

const Crack = ({ progress, active }: { progress: number, active: boolean }) => {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < NUM_LAYERS; i++) {
      const y = (NUM_LAYERS * LAYER_HEIGHT) / 2 - i * LAYER_HEIGHT;
      const angle = i * ROTATION_STEP;
      // The crack follows the fiber orientation, which is helicoidal
      const radius = 1.5;
      pts.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
    }
    return pts;
  }, []);

  const visiblePoints = useMemo(() => {
    const count = Math.max(2, Math.floor(progress * points.length));
    return points.slice(0, count);
  }, [progress, points]);

  if (!active || visiblePoints.length < 2) return null;

  return (
    <DreiLine
      points={visiblePoints}
      color="#ef4444"
      lineWidth={3}
    />
  );
};

const Scene = ({ step, setStep }: { step: AnimationStep, setStep: (s: AnimationStep) => void }) => {
  const [buildProgress, setBuildProgress] = useState(0);
  const [stressLevel, setStressLevel] = useState(0);
  const [crackProgress, setCrackProgress] = useState(0);

  useFrame((state, delta) => {
    if (step === 'BUILDING') {
      setBuildProgress(prev => Math.min(prev + delta * 0.6, 1));
      if (buildProgress >= 1) setStep('IMPACT_READY');
    }
    
    if (step === 'IDLE') {
      setBuildProgress(0);
      setStressLevel(0);
      setCrackProgress(0);
    }

    if (step === 'STRESS_CONCENTRATION') {
      setStressLevel(prev => Math.min(prev + delta * 1.5, 1));
      if (stressLevel >= 1) setStep('CRACK_INITIATION');
    }

    if (step === 'CRACK_INITIATION') {
      setCrackProgress(prev => Math.min(prev + delta * 0.5, 0.1));
      if (crackProgress >= 0.1) setStep('CRACK_PROPAGATION');
    }

    if (step === 'CRACK_PROPAGATION') {
      setCrackProgress(prev => Math.min(prev + delta * 0.8, 0.7));
      if (crackProgress >= 0.7) setStep('ENERGY_DISSIPATION');
    }

    if (step === 'ENERGY_DISSIPATION') {
      setCrackProgress(prev => Math.min(prev + delta * 0.3, 1));
      if (crackProgress >= 1) setStep('FINAL_FAILURE');
    }
  });

  const layers = Array.from({ length: NUM_LAYERS }).map((_, i) => {
    const isVisible = i / NUM_LAYERS < buildProgress;
    // Stress is higher at the top and propagates down
    const layerStress = step === 'IDLE' || step === 'BUILDING' || step === 'IMPACT_READY' 
      ? 0 
      : Math.max(0, stressLevel * (1 - i / NUM_LAYERS * 0.8));
    
    return (
      <Layer 
        key={i} 
        index={i} 
        visible={isVisible} 
        stress={layerStress} 
        rotation={i * ROTATION_STEP}
      />
    );
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 8, 8]} />
      <OrbitControls enableDamping dampingFactor={0.05} />
      
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />

      <group position={[0, 0, 0]}>
        {layers}
        <Crack 
          active={['CRACK_INITIATION', 'CRACK_PROPAGATION', 'ENERGY_DISSIPATION', 'FINAL_FAILURE'].includes(step)} 
          progress={crackProgress} 
        />
        <ImpactStriker 
          active={step === 'IMPACT_FORCE'} 
          onHit={() => setStep('STRESS_CONCENTRATION')} 
        />
      </group>

      <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
      <Environment preset="city" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </>
  );
};

export default function HelicoidalFailureAnimation() {
  const [step, setStep] = useState<AnimationStep>('IDLE');
  const [infoOpen, setInfoOpen] = useState(false);

  const nextStep = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
    }
  };

  const reset = () => {
    setStep('IDLE');
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              BOULIGAND IMPACT SIMULATOR
            </h1>
            <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">
              Helicoidal Stack Failure Analysis
            </p>
          </div>
          <button 
            onClick={() => setInfoOpen(!infoOpen)}
            className="p-2 rounded-full bg-slate-900/50 border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Info Panel */}
        <AnimatePresence>
          {infoOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-24 right-8 w-80 p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 pointer-events-auto shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                Scientific Context
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed space-y-4">
                The Bouligand structure is a series of stacked, mineralized fiber layers, each rotated slightly relative to the one below. 
                <br /><br />
                This helicoidal arrangement forces cracks to follow a twisted path, significantly increasing the energy required for propagation and preventing catastrophic failure.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Controls */}
        <div className="flex flex-col items-center gap-6 pointer-events-auto">
          {/* Status Indicator */}
          <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${step !== 'IDLE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-sm font-medium min-w-[200px]">{STEP_LABELS[step]}</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-700" />
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <div 
                  key={s} 
                  className={`h-1 w-4 rounded-full transition-colors ${i <= STEPS.indexOf(step) ? 'bg-emerald-500' : 'bg-slate-800'}`} 
                />
              ))}
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-4">
            <button 
              onClick={reset}
              className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all group"
              title="Reset Simulation"
            >
              <RotateCcw className="w-6 h-6 group-hover:rotate-[-45deg] transition-transform" />
            </button>
            
            <button 
              onClick={nextStep}
              disabled={step === 'FINAL_FAILURE'}
              className={`px-8 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all shadow-xl ${
                step === 'IDLE' 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 scale-110' 
                  : 'bg-slate-100 hover:bg-white text-slate-950'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {step === 'IDLE' ? (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  START SIMULATION
                </>
              ) : (
                <>
                  NEXT PHASE
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 2]}>
        <Scene step={step} setStep={setStep} />
      </Canvas>

      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600 rounded-full blur-[120px]" />
      </div>

      {/* Data Readout */}
      <div className="absolute top-24 left-8 z-10 pointer-events-none space-y-4">
        <DataCard 
          icon={<Activity className="w-4 h-4" />} 
          label="Energy Dissipation" 
          value={['ENERGY_DISSIPATION', 'FINAL_FAILURE'].includes(step) ? '94.2%' : step === 'IDLE' ? '0.0%' : 'Calculating...'} 
          color="text-emerald-400"
        />
        <DataCard 
          icon={<Zap className="w-4 h-4" />} 
          label="Stress Peak" 
          value={['STRESS_CONCENTRATION', 'CRACK_INITIATION'].includes(step) ? '1.2 GPa' : step === 'IDLE' ? '0.0 GPa' : 'Stable'} 
          color="text-blue-400"
        />
      </div>
    </div>
  );
}

function DataCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 flex items-center gap-4 min-w-[200px]">
      <div className={`p-2 rounded-lg bg-slate-800 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</p>
        <p className={`text-sm font-mono font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
