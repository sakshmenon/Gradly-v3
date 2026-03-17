"use client";

import { useState, useTransition } from "react";
import { connect, disconnect } from "../actions";

type Props = {
  targetUserId: string;
  initialState: "none" | "pending" | "connected";
};

export default function ConnectButton({ targetUserId, initialState }: Props) {
  const [state,     setState]     = useState(initialState);
  const [isPending, startTransition] = useTransition();

  function handleConnect() {
    startTransition(async () => {
      const result = await connect(targetUserId);
      if (!result.error) setState("connected");
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
