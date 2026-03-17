'use client';
import React, { useState } from 'react';
import Link from 'next/link';



const SemesterCard = ({ semester, status, courses }: { semester: string, status: string, courses: string[] }) => {
  return (
    <div className="relative group min-w-[300px] flex-1 bg-gray-950/30 border border-gray-900 rounded-2xl p-8 transition-all duration-500 hover:border-gray-700 h-full flex flex-col">
      
      {/* Blurred Content on Hover */}
      <div className="transition-all duration-500 group-hover:blur-md group-hover:opacity-20 flex flex-col h-full">
        <div className="flex justify-between items-center mb-8">
          <span className="text-xl font-bold tracking-widest">{semester}</span>
          <span className={`text-[9px] tracking-[0.3em] px-2 py-1 border ${
            status === 'ACTIVE' ? 'border-green-500 text-green-500' : 'border-gray-800 text-gray-600'
          }`}>
            [{status}]
          </span>
        </div>

        <ul className="space-y-4">
          {courses.map((course) => (
            <li key={course} className="text-[12px] text-gray-400 tracking-wider uppercase flex items-center gap-3">
              <div className="w-1 h-1 bg-gray-800 group-hover:bg-green-500" />
              {course}
            </li>
          ))}
        </ul>
      </div>

      {/* Center Overlay Button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
        <Link href="/planning">
          <button className="px-8 py-3 bg-white text-black text-[10px] font-extrabold tracking-[0.4em] uppercase hover:bg-green-500 transition-colors shadow-2xl">
            VIEW_SCHEDULE
          </button>
        </Link>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const [userName] = useState("STUDENT_NAME");

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden relative">
      
      {/* 1. Background Grid */}
      <div className="absolute inset-0 z-0 opacity-10" style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
      }}/>
      
      {/* 2. Radial Gradation Overlay (Maintained) */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{
          background: 'radial-gradient(circle at center, transparent 0%, #000000 95%)'
      }}/>

      {/* 3. DASHBOARD UI */}
      <div className="relative z-20 flex w-full h-full">
        
        {/* Main Interface Content */}
        <main className="flex-1 flex flex-col px-20 pt-20 overflow-hidden">
          
          {/* Top Section */}
          <section className="flex items-center gap-10 pb-10">
            <div className="w-32 h-32 rounded-full border border-gray-800 flex items-center justify-center bg-gray-900/20">
              <span className="text-6xl font-bold">{userName.charAt(0)}</span>
            </div>
            <div>
              <p className="text-gray-600 text-[10px] tracking-[0.5em] uppercase mb-2">User_Registry</p>
              <h1 className="text-5xl font-bold tracking-tight uppercase italic">{userName}</h1>
            </div>
          </section>

          <div className="w-full h-[1px] bg-gray-900" />

          {/* Bottom Content Area */}
          <div className="flex-1 flex flex-col pt-12 pb-10 overflow-hidden">
            
            <div className="flex gap-16 h-full">
              {/* User Info Column (Narrower) */}
              <section className="w-1/4 flex flex-col gap-8">
                <h3 className="text-gray-600 text-[10px] tracking-[0.5em] uppercase">Identity_Parameters</h3>
                <div className="space-y-8">
                  {['Major', 'Student_ID', 'Terminal_Email'].map((field) => (
                    <div key={field}>
                      <label className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">{field}</label>
                      <input className="w-full bg-transparent border-b border-gray-900 py-2 outline-none focus:border-green-500 transition-colors placeholder:text-gray-800" placeholder="UNDEFINED" />
                    </div>
                  ))}
                </div>
              </section>

              {/* User Schedule Section (Side-by-Side Cards) */}
              <section className="flex-1 flex flex-col gap-8 overflow-hidden">
                <h3 className="text-gray-600 text-[10px] tracking-[0.5em] uppercase">Temporal_Logs</h3>
                
                {/* Horizontal Container for Cards */}
                <div className="flex gap-6 h-full overflow-x-auto pb-4 pr-4 scrollbar-hide">
                  <SemesterCard 
                    semester="FALL 2025" 
                    status="ARCHIVED" 
                    courses={['Database Systems', 'Physics II', 'Linear Algebra']} 
                  />
                  <SemesterCard 
                    semester="SPRING 2026" 
                    status="ACTIVE" 
                    courses={['Operating Systems', 'Cyber-Security', 'Frontend Arch']} 
                  />
                  <SemesterCard 
                    semester="FALL 2026" 
                    status="PLANNING" 
                    courses={['Advanced AI', 'Cloud Computing', 'Capstone_B']} 
                  />
                </div>
              </section>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}