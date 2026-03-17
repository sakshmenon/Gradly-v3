'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Sub-Components ---

const SemesterCard = ({ title }: { title: string }) => (
  <div className="flex-1 min-h-[140px] bg-gray-950/40 border border-gray-900 rounded-xl p-5 flex flex-col justify-between group hover:border-gray-600 transition-all backdrop-blur-sm">
    <span className="text-[10px] text-gray-500 tracking-[0.4em] uppercase font-bold">{title}</span>
    <div className="text-[10px] text-gray-800 italic uppercase">Null_Payload</div>
  </div>
);

// --- The Interactive Scroll Wheel Component ---
const ScrollWheel = ({ items, label }: { items: string[], label: string }) => {
  const [index, setIndex] = useState(1);
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] text-gray-700 tracking-widest uppercase mb-2">{label}</span>
      <div className="h-32 w-24 overflow-hidden relative flex flex-col items-center justify-center border-y border-gray-800">
        <motion.div 
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 20) setIndex(Math.max(0, index - 1));
            if (info.offset.y < -20) setIndex(Math.min(items.length - 1, index + 1));
          }}
          className="cursor-grab active:cursor-grabbing"
        >
          <div className="text-gray-800 text-[10px] opacity-40 h-8 flex items-center">{items[index - 1] || ""}</div>
          <div className="text-green-500 font-bold text-lg h-10 flex items-center justify-center">{items[index]}</div>
          <div className="text-gray-800 text-[10px] opacity-40 h-8 flex items-center">{items[index + 1] || ""}</div>
        </motion.div>
      </div>
    </div>
  );
};

export default function PlanningPage() {
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [autoStep, setAutoStep] = useState<'mode' | 'temporal'>('mode');
  const [selectedMode, setSelectedMode] = useState<number | null>(null);

  const terms = ["SUMMER", "FALL", "SPRING"];
  const years = ["2025", "2026", "2027", "2028", "2029", "2030"];

  const resetAuto = () => {
    setIsAutoScheduling(false);
    setAutoStep('mode');
    setSelectedMode(null);
  };

  return (
    <div className="relative h-full w-full flex flex-col px-20 pt-16 overflow-y-auto scrollbar-hide">
      
      {/* --- TOP HEADER SECTION --- */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex-1" /> {/* Spacer for centering the search trigger */}
        
        {/* Centered Search Trigger */}
        <div className="w-full max-w-lg">
          <button className="w-full bg-gray-950/60 border border-gray-800 p-5 text-center text-gray-500 text-[11px] tracking-[0.5em] hover:text-white transition-all uppercase">
            [ INITIATE_MANUAL_SEARCH ]
          </button>
        </div>

        {/* Top Right Auto-Scheduler Trigger */}
        <div className="flex-1 flex justify-end">
          <button 
            onClick={() => setIsAutoScheduling(true)}
            className="group relative flex flex-col items-end"
          >
            <span className="text-[10px] text-green-500 tracking-[0.3em] font-bold mb-1 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] transition-all">
              AUTO_SCHEDULER_V1.0
            </span>
            <div className="w-32 h-[1px] bg-green-500/30 group-hover:bg-green-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* --- YEARLY STACK (Empty default states) --- */}
      <div className="flex flex-col gap-20 pb-32 w-full max-w-5xl mx-auto">
        {['Freshman', 'Sophomore', 'Pre-Junior', 'Junior', 'Senior'].map(y => (
          <div key={y} className="flex flex-col gap-6">
            <h3 className="text-gray-600 text-[10px] tracking-[0.6em] uppercase border-l-2 border-gray-900 pl-4">{y}</h3>
            <div className="flex gap-6">
              {['Fall', 'Spring', 'Summer'].map(t => (
                <div key={t} className="flex-1 min-h-[140px] bg-gray-950/40 border border-gray-900 rounded-xl p-5 backdrop-blur-sm">
                  <span className="text-[10px] text-gray-500 tracking-[0.4em] uppercase font-bold">{t}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* --- AUTO SCHEDULER POP-UP LAYER --- */}
      <AnimatePresence>
        {isAutoScheduling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop: Brightness drop only */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={resetAuto} 
              className="absolute inset-0 bg-black/80" 
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative z-10 w-[500px] bg-gray-950 border border-gray-800 rounded-2xl p-10 shadow-3xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-bold tracking-[0.4em] uppercase italic">Automated_Sequence</h2>
                <button onClick={resetAuto} className="text-[10px] text-gray-600 hover:text-white uppercase tracking-widest">[ EXIT ]</button>
              </div>

              {/* STEP 1: Mode Selection */}
              {autoStep === 'mode' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-500">
                  <p className="text-[10px] text-gray-600 tracking-[0.2em] mb-4">SELECT_ALGORITHM_MODE_FOR_GENERATION:</p>
                  {[1, 2, 3].map((mode) => (
                    <button 
                      key={mode}
                      onClick={() => { setSelectedMode(mode); setAutoStep('temporal'); }}
                      className="w-full py-6 bg-gray-900/40 border border-gray-800 text-gray-400 text-[11px] tracking-[0.5em] hover:border-green-500 hover:text-green-500 transition-all uppercase"
                    >
                      MODE_VARIANT_{mode}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2: Temporal Selection (Semester Selection) */}
              {autoStep === 'temporal' && (
                <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-500">
                  <div className="flex justify-around items-center h-48">
                    <ScrollWheel items={terms} label="Target_Term" />
                    <ScrollWheel items={years} label="Target_Year" />
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={resetAuto}
                      className="w-full py-4 bg-white text-black font-bold text-[10px] tracking-[0.5em] uppercase hover:bg-green-500 transition-colors"
                    >
                      GENERATE_TARGET_SEMESTER
                    </button>
                    <button 
                      onClick={() => setAutoStep('mode')}
                      className="text-[9px] text-gray-700 hover:text-gray-400 uppercase tracking-widest text-center mt-2"
                    >
                      [ BACK_TO_MODES ]
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}