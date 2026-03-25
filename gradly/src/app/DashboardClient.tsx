"use client";

import React, { useState, useEffect } from "react";

export type DashboardProps = {
  displayName: string;
  semesterName: string;
  week: number;
  degreeProgressPct: number;
  semesterProgressPct: number;
  gpaDisplay: string;
  alerts: number;
};

// ─── System Greeting ────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function SystemGreeting({
  displayName,
  semesterName,
  week,
}: {
  displayName: string;
  semesterName: string;
  week: number;
}) {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");

  useEffect(() => {
    const l1 = `${getGreeting()}, ${displayName}`;
    const l2 = `${semesterName.toLowerCase()}, week ${week}`;
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
    return () => clearInterval(t1);
  }, [displayName, semesterName, week]);

  return (
    <div className="mb-12 w-full max-w-5xl px-4">
      <p className="text-gray-600 text-[15px] tracking-[0.5em] mb-2 ml-1">
        {line2}&nbsp;
      </p>
      <h2 className="text-5xl font tracking-tight text-white ">
        {line1}
        <span className="inline-block w-1.5 h-10 bg-green-500 ml-3 blinking-cursor align-middle" />
      </h2>
      <div
        className="mt-4 w-full h-px opacity-30"
        style={{ background: "linear-gradient(to right, #111, #555, #111)" }}
      />
    </div>
  );
}

// ─── Info Module ─────────────────────────────────────────────────────────────

function InfoModule({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-72 h-56 border-gray-900 px-10">
      <span className="text-[15px] text-gray-600 tracking-[0.5em] mb-8">
        {label}
      </span>
      <div className="flex items-baseline gap-3">
        <span className="text-8xl font text-gray-100">{value}</span>
        {subValue && (
          <span className="text-2xl text-green-500 font-bold">{subValue}</span>
        )}
      </div>
      <div className="mt-10 w-16 h-px" />
    </div>
  );
}

// ─── Circular Progress ───────────────────────────────────────────────────────

function CircularProgress({
  percent,
  label,
  size,
}: {
  percent: number;
  label: string;
  size: number;
}) {
  const radius       = (size - 16) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset       = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#0a0a0a" strokeWidth="16" fill="transparent"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#22c55e" strokeWidth="16" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            className="drop-shadow-[0_0_20px_rgba(34,197,94,0.2)]"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-7xl font">
          {percent}%
        </div>
      </div>
      <span className="text-[15px] text-gray-500 tracking-[0.6em] pt-8 w-full text-center">
        {label}
      </span>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function DashboardClient({
  displayName,
  semesterName,
  week,
  degreeProgressPct,
  semesterProgressPct,
  gpaDisplay,
  alerts,
}: DashboardProps) {
  return (
    <div className="flex-1 relative flex flex-col items-center justify-end pb-12 h-full">
      <SystemGreeting
        displayName={displayName}
        semesterName={semesterName}
        week={week}
      />

      {/* Data cluster */}
      <div className="relative flex items-end justify-center w-full max-w-7xl px-12">
        <div className="mr-auto">
          <CircularProgress
            percent={degreeProgressPct}
            label="Degree Progress"
            size={300}
          />
        </div>

        <div className="flex items-center mx-auto mb-10">
          <InfoModule
            label="Alerts"
            value={String(alerts)}
            subValue={alerts > 0 ? "!!" : undefined}
          />
          <InfoModule
            label="GPA"
            value={gpaDisplay}
            subValue={gpaDisplay !== "N/A" ? "▲" : undefined}
          />
        </div>

        <div className="ml-auto">
          <CircularProgress
            percent={semesterProgressPct}
            label="Sem progress"
            size={300}
          />
        </div>
      </div>
    </div>
  );
}
