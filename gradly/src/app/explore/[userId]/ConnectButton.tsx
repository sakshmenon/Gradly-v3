"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { connect, disconnect } from "../actions";
import { getDemoPhase, isDemoActive, recordDemoMutation } from "@/lib/demo/store";

type Props = {
  targetUserId: string;
  initialState: "none" | "pending" | "connected";
};

export default function ConnectButton({ targetUserId, initialState }: Props) {
  const [state,     setState]     = useState(initialState);
  const [isPending, startTransition] = useTransition();
  /** Bumps when orchestrator sets demo phase “connect” so effects re-run (sessionStorage alone does not re-render). */
  const [phaseConnectPulse, setPhaseConnectPulse] = useState(0);
  const demoConnectNotified = useRef(false);

  const notifyDemoConnect = useCallback(() => {
    if (!isDemoActive() || demoConnectNotified.current) return;
    demoConnectNotified.current = true;
    recordDemoMutation({ kind: "follow", targetUserId });
    window.dispatchEvent(new Event("gradly-demo-connected"));
  }, [targetUserId]);

  useEffect(() => {
    function bump() {
      setPhaseConnectPulse((n) => n + 1);
    }
    window.addEventListener("gradly-demo-phase-connect", bump);
    return () => window.removeEventListener("gradly-demo-phase-connect", bump);
  }, []);

  // Already linked (e.g. re-run demo): still advance the guided flow.
  useEffect(() => {
    if (!isDemoActive() || getDemoPhase() !== "connect") return;
    if (state !== "connected") return;
    notifyDemoConnect();
  }, [state, phaseConnectPulse, notifyDemoConnect]);

  useEffect(() => {
    if (!isDemoActive() || getDemoPhase() !== "connect") return;
    if (state !== "none") return;
    const t = setTimeout(() => {
      startTransition(async () => {
        const result = await connect(targetUserId);
        if (!result.error) {
          setState("connected");
          notifyDemoConnect();
        }
      });
    }, 900);
    return () => clearTimeout(t);
  }, [targetUserId, state, startTransition, notifyDemoConnect, phaseConnectPulse]);

  function handleConnect() {
    startTransition(async () => {
      const result = await connect(targetUserId);
      if (!result.error) {
        setState("connected");
        notifyDemoConnect();
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnect(targetUserId);
      if (!result.error) setState("none");
    });
  }

  if (state === "connected") {
    return (
      <div className="flex flex-col items-end gap-3">
        <button
          className="px-12 py-4 border border-green-500 text-green-500 font-bold text-[10px] tracking-[0.5em] shadow-[0_0_20px_rgba(34,197,94,0.2)] cursor-default"
          disabled
        >
          STATION_LINKED
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={isPending}
          className="text-[9px] text-gray-700 hover:text-red-400 uppercase tracking-widest transition-colors"
        >
          {isPending ? "..." : "[ Disconnect ]"}
        </button>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <button
        className="px-12 py-4 border border-gray-700 text-gray-600 font-bold text-[10px] tracking-[0.5em] cursor-default"
        disabled
      >
        REQUEST_PENDING
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={isPending}
      className="px-12 py-4 border border-white text-white font-bold text-[10px] tracking-[0.5em] hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50"
    >
      {isPending ? "CONNECTING..." : "CONNECT"}
    </button>
  );
}
