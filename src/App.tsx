/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text, Float } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Zap, 
  Layers, 
  RotateCw, 
  Play, 
  RotateCcw, 
  Info,
  Shield,
  AlertTriangle,
  ChevronRight,
  Cpu,
  FlaskConical
} from 'lucide-react';
import { BouligandModel } from './components/BouligandModel';
import { cn } from './utils';

type MaterialType = {
  id: string;
  name: string;
  color: string;
  stiffness: number; // 0-1
  toughness: number; // 0-1
  description: string;
};

const MATERIALS: MaterialType[] = [
  {
    id: 'chitin',
    name: 'Chitin (Bio)',
    color: '#444444',
    stiffness: 0.5,
    toughness: 0.8,
    description: 'Biological mineralized chitin. High toughness and energy dissipation.'
  },
  {
    id: 'carbon',
    name: 'Carbon Fiber',
    color: '#1a1a1a',
    stiffness: 0.9,
    toughness: 0.4,
    description: 'High stiffness, but prone to brittle failure and delamination.'
  },
  {
    id: 'kevlar',
    name: 'Kevlar',
    color: '#d4af37',
    stiffness: 0.4,
    toughness: 0.9,
    description: 'Aramid fiber. Exceptional toughness and impact absorption.'
  },
  {
    id: 'ceramic',
    name: 'Ceramic',
    color: '#e5e5e5',
    stiffness: 1.0,
    toughness: 0.1,
    description: 'Extremely hard and stiff, but shatters easily under impact.'
  }
];

export default function App() {
  const [type, setType] = useState<'stacked' | 'helicoid'>('helicoid');
  const [rotationAngle, setRotationAngle] = useState(15);
  const [layerCount, setLayerCount] = useState(20);
  const [forceMagnitude, setForceMagnitude] = useState(0.8);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(MATERIALS[0]);
  const [impactProgress, setImpactProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      setImpactProgress(0);
      interval = setInterval(() => {
        setImpactProgress(prev => {
          // Speed affected by stiffness (stiffer = faster shockwave)
          const step = 0.01 * (0.5 + forceMagnitude) * (0.5 + selectedMaterial.stiffness);
          if (prev >= 1) {
            setIsSimulating(false);
            return 1;
          }
          return prev + step;
        });
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isSimulating, forceMagnitude, selectedMaterial]);

  const handleSimulate = () => {
    setIsSimulating(true);
  };

  const handleReset = () => {
    setIsSimulating(false);
    setImpactProgress(0);
  };

  return (
    <div className="relative w-full h-screen bg-[#0a0a0a] text-white overflow-hidden scientific-grid">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-orange-500/20 border border-orange-500/50 rounded-lg">
              <Shield className="w-6 h-6 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tighter uppercase font-mono">
              Bouligand <span className="text-orange-500">Bio-Impact</span>
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest ml-12">
            Structural Failure Analysis v1.0.4
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 bg-zinc-900/80 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <Info className="w-5 h-5 text-zinc-400" />
          </button>
          
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl backdrop-blur-md">
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                System Active
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                GPU Accel
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Simulation Area */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={35} />
          <OrbitControls 
            enablePan={false} 
            minDistance={5} 
            maxDistance={25}
            autoRotate={!isSimulating}
            autoRotateSpeed={0.5}
          />
          
          <Suspense fallback={null}>
            <BouligandModel 
              type={type} 
              rotationAngle={rotationAngle} 
              layerCount={layerCount}
              impactProgress={impactProgress}
              forceMagnitude={forceMagnitude}
              material={selectedMaterial}
            />
            
            <Environment preset="night" />
            <ContactShadows 
              position={[0, -4, 0]} 
              opacity={0.6} 
              scale={20} 
              blur={2.5} 
              far={10} 
            />
            
            <ambientLight intensity={1.5} />
            <pointLight position={[10, 10, 10]} intensity={2} />
            <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          </Suspense>
        </Canvas>
      </div>

      {/* Sidebar Controls */}
      <aside className="absolute bottom-6 left-6 w-80 z-10 space-y-4">
        <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
            <Activity className="w-4 h-4 text-orange-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Simulation Parameters</h2>
          </div>

          <div className="space-y-6">
            {/* Structure Type */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Architecture</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setType('stacked')}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                    type === 'stacked' 
                      ? "bg-orange-500 text-white border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]" 
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-750"
                  )}
                >
                  Stacked
                </button>
                <button 
                  onClick={() => setType('helicoid')}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                    type === 'helicoid' 
                      ? "bg-orange-500 text-white border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]" 
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-750"
                  )}
                >
                  Helicoid
                </button>
              </div>
            </div>

            {/* Rotation Angle */}
            <AnimatePresence>
              {type === 'helicoid' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Pitch Angle</label>
                    <span className="text-xs font-mono text-orange-500">{rotationAngle}°</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="90" 
                    step="5"
                    value={rotationAngle}
                    onChange={(e) => setRotationAngle(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Layer Count */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Layer Density</label>
                <span className="text-xs font-mono text-orange-500">{layerCount}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="40" 
                value={layerCount}
                onChange={(e) => setLayerCount(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            {/* Force Magnitude */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Impact Force</label>
                <span className="text-xs font-mono text-red-500">{(forceMagnitude * 100).toFixed(0)} kN</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.05"
                value={forceMagnitude}
                onChange={(e) => setForceMagnitude(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>

            {/* Material Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider flex items-center gap-2">
                <FlaskConical className="w-3 h-3" />
                Material Substrate
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MATERIALS.map((m) => (
                  <button 
                    key={m.id}
                    onClick={() => setSelectedMaterial(m)}
                    className={cn(
                      "px-2 py-2 rounded-lg text-[10px] font-medium transition-all border text-left",
                      selectedMaterial.id === m.id 
                        ? "bg-zinc-100 text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                        : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-750"
                    )}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-zinc-500 italic leading-tight">
                {selectedMaterial.description}
              </p>
            </div>

            {/* Simulation Controls */}
            <div className="pt-4 flex gap-2">
              <button 
                onClick={handleSimulate}
                disabled={isSimulating}
                className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                Run Impact
              </button>
              <button 
                onClick={handleReset}
                className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Telemetry */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[8px] font-mono uppercase text-zinc-500">Stress Load</p>
              <div className="flex items-end gap-1">
                <span className={cn(
                  "text-xl font-mono font-bold transition-colors",
                  impactProgress * forceMagnitude * selectedMaterial.stiffness > 0.7 ? "text-red-500" : "text-white"
                )}>
                  {(impactProgress * forceMagnitude * selectedMaterial.stiffness * 200).toFixed(1)}
                </span>
                <span className="text-[10px] text-zinc-500 mb-1">MPa</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-mono uppercase text-zinc-500">Crack Penetration</p>
              <div className="flex items-end gap-1">
                <span className={cn(
                  "text-xl font-mono font-bold transition-colors",
                  impactProgress * forceMagnitude * (1.1 - selectedMaterial.toughness) > 0.5 ? "text-red-500" : "text-orange-500"
                )}>
                  {(() => {
                    const depthMultiplier = type === 'stacked' ? 1.2 : 0.4;
                    const effectiveImpact = impactProgress * forceMagnitude * (1.2 - selectedMaterial.toughness) * depthMultiplier;
                    return (Math.min(100, (effectiveImpact / 0.8) * 100)).toFixed(0);
                  })()}
                </span>
                <span className="text-[10px] text-zinc-500 mb-1">% Depth</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-mono uppercase text-zinc-500">Energy Dissipation</p>
              <div className="flex items-end gap-1">
                <span className={cn(
                  "text-xl font-mono font-bold transition-colors text-emerald-500"
                )}>
                  {(() => {
                    const base = type === 'helicoid' ? 82 : 12;
                    const variation = Math.sin(impactProgress * 10) * 2;
                    const toughnessBonus = selectedMaterial.toughness * 10;
                    return (base + variation + toughnessBonus).toFixed(1);
                  })()}
                </span>
                <span className="text-[10px] text-zinc-500 mb-1">%</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Comparison Overlay */}
      <div className="absolute top-32 left-6 z-10 space-y-2">
        <AnimatePresence>
          {impactProgress > 0.5 && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl backdrop-blur-md max-w-[240px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-[10px] font-bold uppercase text-red-500 tracking-tighter">Failure Detected</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {type === 'stacked' 
                  ? "Catastrophic linear crack propagation. Delamination occurring between parallel layers."
                  : "Crack deflection observed. Helicoid structure forcing helical path, dissipating impact energy."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter mb-2">The Bouligand Structure</h2>
                  <p className="text-zinc-400 text-sm">Bio-inspired engineering from the Mantis Shrimp.</p>
                </div>
                <button 
                  onClick={() => setShowInfo(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
                <section>
                  <h3 className="text-white font-bold uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    How it works
                  </h3>
                  <p>
                    The dactyl club of the mantis shrimp uses a unique helicoid (Bouligand) arrangement of mineralized chitin fibers. 
                    Unlike traditional laminates where layers are parallel, each layer in a Bouligand structure is rotated by a small angle relative to the one below it.
                  </p>
                </section>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                    <h4 className="text-white font-bold text-xs mb-2 uppercase">Stacked (Standard)</h4>
                    <p className="text-xs text-zinc-400">
                      Cracks follow a straight, vertical path. This leads to rapid splitting and catastrophic failure as energy is concentrated at the crack tip.
                    </p>
                  </div>
                  <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/30">
                    <h4 className="text-orange-500 font-bold text-xs mb-2 uppercase">Helicoid (Bio)</h4>
                    <p className="text-xs text-zinc-400">
                      Cracks are forced to twist and turn as they encounter rotating fiber planes. This "crack shielding" dissipates massive amounts of energy.
                    </p>
                  </div>
                </div>

                <section>
                  <h3 className="text-white font-bold uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-500" />
                    Applications
                  </h3>
                  <ul className="grid grid-cols-2 gap-2">
                    {['Aerospace Panels', 'Body Armor', 'Impact Helmets', 'Sports Equipment', 'Automotive Safety', 'Infrastructure'].map(item => (
                      <li key={item} className="flex items-center gap-2 text-xs">
                        <ChevronRight className="w-3 h-3 text-orange-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <button 
                onClick={() => setShowInfo(false)}
                className="w-full mt-8 bg-orange-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-orange-600 transition-colors"
              >
                Return to Simulation
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <footer className="absolute bottom-6 right-6 z-10 pointer-events-none">
        <div className="flex items-center gap-2 opacity-30">
          <span className="text-[10px] font-mono uppercase tracking-widest">Bio-Mech Labs</span>
          <div className="w-8 h-[1px] bg-white" />
          <span className="text-[10px] font-mono">2026</span>
        </div>
      </footer>
    </div>
  );
}
