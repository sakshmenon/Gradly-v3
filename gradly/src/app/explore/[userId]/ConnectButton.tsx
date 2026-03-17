"use client";

import { useState, useTransition } from "react";
import { connect, disconnect } from "../actions";

type Props = {
  targetUserId: string;
  initialState: "none" | "pending" | "connected";
};

export default function ConnectButton({ targetUserId, initialState }: Props) {
  const [state,   setState]   = useState(initialState);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConnect() {
    setMessage(null);
    startTransition(async () => {
      const result = await connect(targetUserId);
      if (result.error) { setMessage(`Error: ${result.error}`); return; }
      setState("connected");
    });
  }

  function handleDisconnect() {
    setMessage(null);
    startTransition(async () => {
      const result = await disconnect(targetUserId);
      if (result.error) { setMessage(`Error: ${result.error}`); return; }
      setState("none");
    });
  }

  return (
    <>
      {state === "none" && (
        <button type="button" onClick={handleConnect} disabled={isPending}>
          {isPending ? "Connecting…" : "Request to Connect"}
        </button>
      )}
      {state === "pending" && (
        <span>Request Pending</span>
      )}
      {state === "connected" && (
        <>
          <span>Connected</span>
          {" "}
          <button type="button" onClick={handleDisconnect} disabled={isPending}>
            {isPending ? "…" : "Disconnect"}
          </button>
        </>
      )}
      {message && <p>{message}</p>}
    </>
  );
}
