import {
  DEMO_MUTATIONS_KEY,
  DEMO_PHASE_KEY,
  DEMO_PENDING_COPY_KEY,
  DEMO_PENDING_RECOMMEND_KEY,
  DEMO_STORAGE_KEY,
} from "./config";

export type DemoCourseMutation = {
  kind: "courses";
  term: string;
  year: number;
  courseIds: string[];
};

export type DemoFollowMutation = {
  kind: "follow";
  targetUserId: string;
};

export type DemoMutation = DemoCourseMutation | DemoFollowMutation;

function parseMutations(raw: string | null): DemoMutation[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as DemoMutation[]) : [];
  } catch {
    return [];
  }
}

export function isDemoActive(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DEMO_STORAGE_KEY) === "1";
}

export function setDemoActive(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) {
    sessionStorage.setItem(DEMO_STORAGE_KEY, "1");
    sessionStorage.setItem(DEMO_MUTATIONS_KEY, "[]");
    window.dispatchEvent(new Event("gradly-demo-started"));
  } else {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    sessionStorage.removeItem(DEMO_PHASE_KEY);
    sessionStorage.removeItem(DEMO_MUTATIONS_KEY);
    sessionStorage.removeItem(DEMO_PENDING_RECOMMEND_KEY);
    sessionStorage.removeItem(DEMO_PENDING_COPY_KEY);
    window.dispatchEvent(new Event("gradly-demo-ended"));
  }
}

export function getDemoPhase(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(DEMO_PHASE_KEY);
}

export function setDemoPhase(phase: string | null) {
  if (typeof window === "undefined") return;
  if (phase == null) sessionStorage.removeItem(DEMO_PHASE_KEY);
  else sessionStorage.setItem(DEMO_PHASE_KEY, phase);
}

export function readDemoMutations(): DemoMutation[] {
  if (typeof window === "undefined") return [];
  return parseMutations(sessionStorage.getItem(DEMO_MUTATIONS_KEY));
}

export function recordDemoMutation(m: DemoMutation) {
  if (typeof window === "undefined") return;
  const list = readDemoMutations();
  list.push(m);
  sessionStorage.setItem(DEMO_MUTATIONS_KEY, JSON.stringify(list));
}
