'use client';
import React, { useState, useEffect } from 'react';


// Refined NavLink with subtle hover state
// Adjusted System Greeting to sit above the data row
const SystemGreeting = () => {
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');

  useEffect(() => {
    const l1 = 'good morning, user';
    const l2 = 'spring 2026, week 10';
    let i = 0;
    const t1 = setInterval(() => {
      setLine1(l1.slice(0, i + 1));
      if (++i === l1.length) {
        clearInterval(t1);
        let j = 0;
        const t2 = setInterval(() => {
          setLine2(l2.slice(0, j + 1));
          if (++j === l2.length) clearInterval(t2);
        }, 50);
      }
    }, 100);
    return () => { clearInterval(t1); };
  }, []);

  return (
    <div className="mb-12 w-full max-w-5xl px-4">
      <p className="text-gray-600 text-[10px] tracking-[0.5em] uppercase mb-2 ml-1">
        {line2}
      </p>
      <h2 className="text-5xl font-bold tracking-tight text-white uppercase">
        {line1}<span className="inline-block w-1.5 h-10 bg-green-500 ml-3 animate-pulse align-middle" />
      </h2>
      <div className="mt-4 w-full h-[1px] bg-gradient-to-right from-gray-900 via-gray-700 to-gray-900 opacity-30" />
    </div>
  );
};

const InfoModule = ({ label, value, subValue }: { label: string, value: string, subValue?: string }) => (
  <div className="flex flex-col items-center justify-center w-72 h-56 border-x border-gray-900 px-10">
    <span className="text-[10px] text-gray-600 tracking-[0.5em] uppercase mb-8">{label}</span>
    <div className="flex items-baseline gap-3">
      <span className="text-8xl font-bold text-gray-100">{value}</span>
      {subValue && <span className="text-2xl text-green-500 font-bold">{subValue}</span>}
    </div>
    <div className="mt-10 w-16 h-[1px] bg-gray-800" />
  </div>
);

export default function Dashboard() {
    return (
      <div className="flex h-screen w-full bg-black overflow-hidden relative">
        
        {/* --- BACKGROUND LAYERS --- */}
        <div className="absolute inset-0 z-0 opacity-10" style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
        }}/>
  
        <div className="absolute inset-0 z-10 pointer-events-none" style={{
            background: 'radial-gradient(circle at center, transparent 0%, #000000 95%)'
        }}/>
  
        {/* --- DASHBOARD UI --- */}
        <div className="relative z-20 flex w-full h-full">
          
          {/* Navigation Sidebar: Split Layout */}
          
  
          {/* Main Interface Content */}
          <main className="flex-1 relative flex flex-col items-center justify-end pb-12">
            
            <SystemGreeting />
  
            {/* The Data Cluster Row */}
            <div className="relative flex items-end justify-center w-full max-w-7xl px-12">
              
              <div className="mr-auto">
                <CircularProgress percent={88} label="Academic_Load" size={300} />
              </div>
  
              <div className="flex items-center mx-auto mb-10">
                <InfoModule label="Live_Alerts" value="12" subValue="!!" />
                <InfoModule label="Cumulative_GPA" value="3.9" subValue="▲" />
              </div>
  
              <div className="ml-auto">
                <CircularProgress percent={64} label="Completion_Rate" size={300} />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }// Support Components
// const NavLink = ({ label, active }: { label: string, active?: boolean }) => (
//     <button className={`-rotate-90 origin-center whitespace-nowrap tracking-[0.4em] text-[10px] transition-all duration-300 font-medium
//       ${active ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'text-gray-500 hover:text-white'}`}>
//       {label}
//     </button>
//   );
  
const CircularProgress = ({ percent, label, size }: { percent: number, label: string, size: number }) => {
  const radius = (size - 16) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} stroke="#0a0a0a" strokeWidth="16" fill="transparent" />
          <circle cx={size/2} cy={size/2} r={radius} stroke="#22c55e" strokeWidth="16" fill="transparent"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="butt"
            className="drop-shadow-[0_0_20px_rgba(34,197,94,0.2)]" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-7xl font-bold">{percent}%</div>
      </div>
      <span className="text-[10px] text-gray-500 tracking-[0.6em] uppercase border-t border-gray-900 pt-8 w-full text-center">{label}</span>
    </div>
  );
};