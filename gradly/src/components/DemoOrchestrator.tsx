"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  isDemoActive,
  setDemoPhase,
  readDemoMutations,
  setDemoActive,
} from "@/lib/demo/store";
import { DEMO_PENDING_COPY_KEY, DEMO_PENDING_RECOMMEND_KEY } from "@/lib/demo/config";
import { undoDemoMutations, getDemoPeerUserId } from "@/app/demo/actions";
import { createClient } from "@/lib/supabase/client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Overlay = { title: string; body: string };

const OVERLAYS: Record<string, Overlay> = {
  dashboard: {
    title: "Dashboard",
    body: "Overview of degree progress, GPA, and alerts — your home base after sign-in.",
  },
  planning: {
    title: "Planning",
    body: "Your semester timeline: past, current, and upcoming. We add one course to an open term via search.",
  },
  scheduler: {
    title: "Auto-scheduler",
    body: "Mode 1 (Lowest First) packs the queue into this semester up to the credit cap — then approve to save.",
  },
  explore: {
    title: "Explore",
    body: "Find classmates by name. Connect to unlock their schedule.",
  },
  schedule: {
    title: "Friend schedule",
    body: "Copy a semester from their plan into one of your open terms.",
  },
};

/**
 * Drives the presentation demo after login (session flag). Dispatches window events
 * for page-specific automation; shows short captions between major routes.
 */
export default function DemoOrchestrator() {
  const router = useRouter();
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [, startTransition] = useTransition();
  const stepRef = useRef(0);
  const peerIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const sync = () => setOn(isDemoActive());
    sync();
    window.addEventListener("gradly-demo-started", sync);
    return () => window.removeEventListener("gradly-demo-started", sync);
  }, []);

  // Bootstrap sequence once when demo turns on
  useEffect(() => {
    if (!on) {
      startedRef.current = false;
      stepRef.current = 0;
      peerIdRef.current = null;
      setOverlay(null);
      setDemoPhase(null);
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    void (async () => {
      const path = typeof window !== "undefined" ? window.location.pathname : "/";
      if (path !== "/") {
        router.push("/");
        await sleep(450);
      }
      if (cancelled) return;

      setOverlay(OVERLAYS.dashboard);
      await sleep(2800);
      if (cancelled) return;
      setOverlay(null);

      setDemoPhase("planning");
      stepRef.current = 1;
      router.push("/planning");
      await sleep(650);
      if (cancelled) return;

      setOverlay(OVERLAYS.planning);
      await sleep(1200);
      if (cancelled) return;

      window.dispatchEvent(new Event("gradly-demo-planning-add"));
    })();

    return () => {
      cancelled = true;
    };
  }, [on, router]);

  useEffect(() => {
    if (!on) return;

    function onPlanningDone() {
      if (stepRef.current !== 1) return;
      stepRef.current = 2;
      setOverlay(null);
      void (async () => {
        await sleep(900);
        setOverlay(OVERLAYS.scheduler);
        await sleep(900);
        setOverlay(null);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(DEMO_PENDING_RECOMMEND_KEY, "1");
        }
        router.push("/planning/recommend");
      })();
    }

    function onRecommendDone() {
      if (stepRef.current !== 2) return;
      stepRef.current = 3;
      void (async () => {
        const peer = await getDemoPeerUserId();
        if (peer.id) peerIdRef.current = peer.id;
        await sleep(800);
        setOverlay(OVERLAYS.explore);
        await sleep(1200);
        setOverlay(null);
        router.push("/explore");
        await sleep(600);
        window.dispatchEvent(new Event("gradly-demo-explore-search"));
      })();
    }

    function onExploreNav(e: Event) {
      if (stepRef.current !== 3) return;
      const id = (e as CustomEvent<{ peerId?: string }>).detail?.peerId;
      if (id) peerIdRef.current = id;
      stepRef.current = 4;
    }

    function onConnected() {
      if (stepRef.current !== 4) return;
      stepRef.current = 5;
      void (async () => {
        await sleep(1000);
        const id = peerIdRef.current ?? (await getDemoPeerUserId()).id;
        if (!id) return;
        setOverlay(OVERLAYS.schedule);
        await sleep(900);
        setOverlay(null);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(DEMO_PENDING_COPY_KEY, "1");
        }
        router.push(`/explore/${id}/schedule`);
      })();
    }

    function onCopyDone() {
      if (stepRef.current !== 5) return;
      stepRef.current = 6;
      void (async () => {
        await sleep(600);
        setOverlay(null);
        const mutations = readDemoMutations();
        startTransition(async () => {
          await undoDemoMutations(mutations);
          setThankYouOpen(true);
          await sleep(3800);
          setSigningOut(true);
          const supabase = createClient();
          await supabase.auth.signOut();
          setDemoActive(false);
          setDemoPhase(null);
          setThankYouOpen(false);
          setSigningOut(false);
          startedRef.current = false;
          stepRef.current = 0;
          peerIdRef.current = null;
          router.replace("/login");
          router.refresh();
        });
      })();
    }

    window.addEventListener("gradly-demo-planning-done", onPlanningDone);
    window.addEventListener("gradly-demo-recommend-done", onRecommendDone);
    window.addEventListener("gradly-demo-explore-nav", onExploreNav as EventListener);
    window.addEventListener("gradly-demo-connected", onConnected);
    window.addEventListener("gradly-demo-copy-done", onCopyDone);

    return () => {
      window.removeEventListener("gradly-demo-planning-done", onPlanningDone);
      window.removeEventListener("gradly-demo-recommend-done", onRecommendDone);
      window.removeEventListener("gradly-demo-explore-nav", onExploreNav as EventListener);
      window.removeEventListener("gradly-demo-connected", onConnected);
      window.removeEventListener("gradly-demo-copy-done", onCopyDone);
    };
  }, [on, router, startTransition]);

  useEffect(() => {
    if (!on) return;
    const id = peerIdRef.current;
    if (
      stepRef.current === 4 &&
      id &&
      pathname === `/explore/${id}` &&
      !pathname.includes("/schedule")
    ) {
      setDemoPhase("connect");
      // ConnectButton’s auto-connect effect does not re-run when only sessionStorage changes — ping it.
      window.dispatchEvent(new Event("gradly-demo-phase-connect"));
    }
  }, [on, pathname]);

  if (!on && !thankYouOpen) return null;

  return (
    <>
      <AnimatePresence>
        {thankYouOpen && (
          <motion.div
            key="demo-thank-you"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/88 backdrop-blur-md px-8"
          >
            <div className="max-w-md w-full border border-green-900/60 rounded-2xl bg-gray-950/95 px-10 py-12 text-center shadow-[0_0_60px_rgba(34,197,94,0.15)]">
              <p className="text-[10px] tracking-[0.55em] text-green-500 uppercase mb-6">
                Gradly
              </p>
              <p className="text-xl text-white tracking-wide leading-relaxed">
                This is gradly. Thank you for your time.
              </p>
              {signingOut && (
                <p className="text-[10px] text-gray-600 mt-8 tracking-[0.35em] uppercase">
                  Signing out…
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {on && !thankYouOpen && (
        <AnimatePresence>
          {overlay && (
            <motion.div
              key={overlay.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none fixed bottom-24 left-1/2 z-[100] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-green-900/50 bg-black/85 px-6 py-4 shadow-[0_0_40px_rgba(34,197,94,0.12)] backdrop-blur-md"
            >
              <p className="text-[9px] tracking-[0.45em] text-green-500 uppercase mb-2">
                {overlay.title}
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">{overlay.body}</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
