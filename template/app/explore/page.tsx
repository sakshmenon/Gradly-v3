'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Components ---

const SemesterCard = ({ semester, isConnected, onView }: { semester: string; isConnected: boolean; onView: () => void }) => {
  return (
    <div className="relative group min-w-[300px] flex-1 bg-gray-950/40 border border-gray-900 rounded-2xl p-8 transition-all duration-500 h-64 flex flex-col backdrop-blur-md overflow-hidden">
      
      {/* Content Layer: Always blurred if not connected; blurs on hover if connected */}
      <div className={`transition-all duration-500 flex flex-col h-full 
        ${!isConnected ? 'blur-lg opacity-20' : 'group-hover:blur-md group-hover:opacity-30'}`}>
        
        <div className="flex justify-between items-start mb-6">
          <span className="text-xl font-bold tracking-widest">{semester}</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-800'}`} />
        </div>

        <ul className="space-y-4">
          {['DATA_STRUCTURES', 'LINEAR_ALGEBRA', 'SYS_ARCH'].map((course) => (
            <li key={course} className="text-[11px] text-gray-400 tracking-[0.2em] uppercase flex items-center gap-3">
              <div className="w-1 h-[1px] bg-gray-700" />
              {course}
            </li>
          ))}
        </ul>
      </div>

      {/* Overlay Logic */}
      {!isConnected ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-gray-600 tracking-[0.5em] uppercase font-bold border border-gray-900 px-4 py-2">Restricted_Access</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            onClick={onView}
            className="px-8 py-3 bg-white text-black text-[10px] font-bold tracking-[0.4em] uppercase hover:bg-green-500 transition-colors"
          >
            View_Schedule
          </button>
        </div>
      )}
    </div>
  );
};

const CompactSemesterCard = ({ term }: { term: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    // Reset back to 'copy' after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 min-h-[120px] bg-gray-900/40 border border-gray-900 rounded-xl p-6 flex flex-col justify-between backdrop-blur-sm relative group/card">
      
      {/* Copy Button - Top Right */}
      <button 
        onClick={handleCopy}
        className={`absolute top-4 right-4 text-[8px] tracking-[0.3em] uppercase px-2 py-1 border transition-all duration-300 ${
          copied 
          ? 'border-green-500 text-green-500 bg-green-500/10' 
          : 'border-gray-800 text-gray-600 hover:border-gray-400 hover:text-white'
        }`}
      >
        {copied ? 'SUCCESS' : 'COPY'}
      </button>

      <span className="text-[9px] text-gray-700 tracking-widest uppercase">{term}</span>
      
      <div className="space-y-1">
        <div className="text-[11px] text-gray-500 tracking-wider font-medium">
          {/* Mock course data */}
          {term === 'FALL' ? 'DATA_STRUCTURES' : term === 'SPRING' ? 'OPERATING_SYSTEMS' : 'INTERNSHIP_CREDIT'}
        </div>
        <div className="w-full h-[1px] bg-gray-800 mt-2" />
      </div>
    </div>
  );
};


export default function ExplorePage() {
  const [view, setView] = useState<'SEARCH' | 'USER_PROFILE'>('SEARCH');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);

  const mockUsers = ["ALEX_VOGEL", "SARAH_CHEN", "MARCUS_WRIGHT", "ELENA_RODRIGUEZ", "KEVIN_DANE"];

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden relative">
      {/* Background Grid & Radial Fade */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`, backgroundSize: '20px 20px' }}/>
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, #000000 95%)' }}/>


      {/* Main Viewport */}
      <main className="flex-1 relative z-20 flex flex-col overflow-hidden">
        
        {/* --- SEARCH VIEW --- */}
        {view === 'SEARCH' && (
          <div className="flex-1 flex flex-col items-center justify-center relative px-10">
            {!isSearching && (
              <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} className="text-9xl font-bold tracking-[0.6em] uppercase mb-12 italic select-none">
                EXPLORE
              </motion.h1>
            )}
            
            <div className={`w-full max-w-lg transition-all duration-700 ${isSearching ? 'absolute top-32' : ''}`}>
              <button 
                onClick={() => setIsSearching(true)}
                className="w-full bg-gray-950/40 border border-gray-900 p-6 text-center text-gray-600 text-[11px] tracking-[0.5em] hover:text-white hover:border-gray-500 transition-all uppercase"
              >
                {isSearching ? searchQuery || '[ NODE_ID_ENTRY ]' : '[ INITIATE_SCAN ]'}
              </button>
            </div>

            {isSearching && (
              <div className="fixed inset-0 z-30 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/80" onClick={() => setIsSearching(false)} />
                <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-[450px] bg-gray-950 border border-gray-800 rounded-xl p-10 shadow-2xl">
                  <input autoFocus className="w-full bg-transparent border-b border-gray-800 text-2xl py-4 outline-none focus:border-green-500 uppercase font-bold text-white mb-6" placeholder="USER_SEARCH" onChange={(e) => setSearchQuery(e.target.value)} />
                  <div className="space-y-1">
                    {searchQuery.length > 0 && mockUsers.map(user => (
                      <button 
                        key={user} 
                        onClick={() => { setSelectedUser(user); setView('USER_PROFILE'); setIsSearching(false); }}
                        className="w-full text-left p-4 text-[10px] tracking-[0.4em] text-gray-500 border border-transparent hover:border-gray-800 hover:bg-white/5 hover:text-white transition-all"
                      >
                        {user}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* --- USER PROFILE VIEW --- */}
        {view === 'USER_PROFILE' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col px-24 pt-24 overflow-hidden">
            <header className="flex items-center justify-between pb-12">
              <div className="flex items-center gap-12">
                <div className="w-36 h-36 rounded-full border border-gray-900 flex items-center justify-center bg-gray-900/10 backdrop-blur-sm">
                  <span className="text-7xl font-bold">{selectedUser?.charAt(0)}</span>
                </div>
                <div>
                  <h1 className="text-6xl font-bold tracking-tighter uppercase italic mb-4">{selectedUser}</h1>
                  <div className="flex gap-8 text-[10px] tracking-[0.3em] text-gray-500 uppercase">
                    <span className="flex flex-col"><b className="text-gray-700 mb-1">Year</b>Junior</span>
                    <span className="flex flex-col"><b className="text-gray-700 mb-1">Major</b>Comp_Sci</span>
                    <span className="flex flex-col"><b className="text-gray-700 mb-1">Grad_Term</b>Spring_2027</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsConnected(true)}
                disabled={isConnected}
                className={`px-12 py-4 border font-bold text-[10px] tracking-[0.5em] transition-all duration-500 ${isConnected ? 'border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'border-white text-white hover:bg-white hover:text-black'}`}
              >
                {isConnected ? 'STATION_LINKED' : 'CONNECT'}
              </button>
            </header>

            <div className="w-full h-[1px] bg-gray-900" />

            {/* Schedule Section */}
            <div className="flex-1 flex flex-col pt-12 overflow-hidden">
               <h3 className="text-gray-700 text-[10px] tracking-[0.6em] uppercase mb-10 pl-2">Temporal_Data_Feed</h3>
               <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide">
                  <SemesterCard semester="FALL 2025" isConnected={isConnected} onView={() => setShowFullPlan(true)} />
                  <SemesterCard semester="SPRING 2026" isConnected={isConnected} onView={() => setShowFullPlan(true)} />
                  <SemesterCard semester="FALL 2026" isConnected={isConnected} onView={() => setShowFullPlan(true)} />
               </div>
               
               <button onClick={() => { setView('SEARCH'); setIsConnected(false); }} className="mt-auto mb-12 text-[9px] text-gray-800 tracking-[0.5em] hover:text-white uppercase transition-colors self-start underline underline-offset-8">Return_to_Network</button>
            </div>
          </motion.div>
        )}

        {/* --- FULL PLAN POPUP (5 YEAR) --- */}
        <AnimatePresence>
          {showFullPlan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-16">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFullPlan(false)} className="absolute inset-0 bg-black/95" />
              <motion.div 
                initial={{ y: 30, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0, scale: 0.98 }}
                className="relative z-10 w-full max-w-6xl h-full bg-gray-950 border border-gray-900 rounded-2xl p-16 overflow-y-auto scrollbar-hide shadow-3xl"
              >
                <div className="flex justify-between items-center mb-20">
                  <div>
                    <h2 className="text-3xl font-bold tracking-[0.2em] uppercase mb-2">{selectedUser}</h2>
                    <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase">Academic_Trajectory_Full_Access</p>
                  </div>
                  <button onClick={() => setShowFullPlan(false)} className="text-[10px] text-gray-500 hover:text-white uppercase border border-gray-800 px-6 py-3 tracking-widest transition-all hover:border-white">Exit_Log</button>
                </div>
                
                <div className="grid grid-cols-1 gap-16">
                  {['Freshman', 'Sophomore', 'Pre-Junior', 'Junior', 'Senior'].map(y => (
                    <div key={y} className="flex flex-col gap-6">
                      <h4 className="text-[10px] text-green-500 tracking-[0.8em] uppercase border-l border-green-500 pl-4">{y}</h4>
                      <div className="flex gap-6">
                        {['FALL', 'SPRING', 'SUMMER'].map(term => (
                          <CompactSemesterCard key={term} term={term} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}