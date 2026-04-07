"use client";

import { useEffect } from "react";
import { DEMO_PENDING_COPY_KEY } from "@/lib/demo/config";
import { isDemoActive } from "@/lib/demo/store";

/**
 * If the demo copy UI never mounts (e.g. peer has no courses in the source term),
 * avoid leaving the guided demo stuck — clear the pending flag and advance.
 */
export default function DemoCopyFallback() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isDemoActive()) return;
    if (sessionStorage.getItem(DEMO_PENDING_COPY_KEY) !== "1") return;

    const t = window.setTimeout(() => {
      if (sessionStorage.getItem(DEMO_PENDING_COPY_KEY) === "1") {
        sessionStorage.removeItem(DEMO_PENDING_COPY_KEY);
        window.dispatchEvent(new Event("gradly-demo-copy-done"));
      }
    }, 8000);

    return () => window.clearTimeout(t);
  }, []);

  return null;
}
