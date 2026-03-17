'use client';
import React, { useState, useEffect } from 'react';

export default function LandingPage() {
  const [text, setText] = useState('');
  const [subText, setSubText] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const fullTitle = 'gradly';
    const fullSub = 'made for students, by students';
    let i = 0;
    const t = setInterval(() => {
      setText(fullTitle.slice(0, i + 1));
      if (++i === fullTitle.length) {
        clearInterval(t);
        let j = 0;
        const s = setInterval(() => {
          setSubText(fullSub.slice(0, j + 1));
          if (++j === fullSub.length) clearInterval(s);
        }, 40);
      }
    }, 120);
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-8xl font-bold mb-2">
          {text}<span className="inline-block w-1 h-12 bg-white ml-2 animate-pulse" />
        </h1>
        <p className="text-gray-500 tracking-[0.3em] uppercase">{subText}</p>

        <div className="mt-16 flex flex-col items-center gap-4">
          <button onClick={() => setShowAuth(true)} className="w-48 py-3 bg-white text-black font-bold hover:invert transition-all">
            ACCESS_SYSTEM
          </button>
        </div>
      </div>

      {/* Simplified Auth Overlay */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-gray-800 p-10 bg-black relative">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-[10px] text-gray-600">READY</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <h2 className="text-lg tracking-widest mb-8 text-gray-400 uppercase">Authenticate</h2>
            <div className="space-y-6">
              <input className="w-full bg-transparent border-b border-gray-800 py-2 outline-none focus:border-white transition-colors" placeholder="STUDENT_ID" />
              <input type="password" className="w-full bg-transparent border-b border-gray-800 py-2 outline-none focus:border-white transition-colors" placeholder="ACCESS_KEY" />
              <button onClick={() => window.location.href = '/dashboard'} className="w-full py-4 bg-white text-black font-bold uppercase text-xs tracking-widest mt-4">Initialize_Uplink</button>
              <button onClick={() => setShowAuth(false)} className="w-full text-[10px] text-gray-600 uppercase tracking-widest mt-2">Abort</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}