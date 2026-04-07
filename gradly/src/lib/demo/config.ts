/**
 * Presentation demo accounts — create with `node scripts/seed-demo-users.mjs` (service role).
 * All five share the same password unless overridden when seeding.
 */

export const DEMO_DEFAULT_PASSWORD = "GradlyDemo2026!";

export type DemoAccount = {
  email: string;
  displayName: string;
  major: string;
  /** Public so explore search + profile resolution work under RLS */
  role: "presenter" | "peer" | "extra";
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "demo.alex.mercer@gradly.demo",
    displayName: "Alex Mercer",
    major: "Computer Science",
    role: "presenter",
  },
  {
    email: "demo.jordan.vale@gradly.demo",
    displayName: "Jordan Vane",
    major: "Computer Science",
    role: "peer",
  },
  {
    email: "demo.sam.reyes@gradly.demo",
    displayName: "Sam Reyes",
    major: "Computer Science",
    role: "extra",
  },
  {
    email: "demo.morgan.ellis@gradly.demo",
    displayName: "Morgan Ellis",
    major: "Computer Science",
    role: "extra",
  },
  {
    email: "demo.riley.cho@gradly.demo",
    displayName: "Riley Cho",
    major: "Computer Science",
    role: "extra",
  },
];

export const DEMO_PRESENTER = DEMO_ACCOUNTS.find((a) => a.role === "presenter")!;
export const DEMO_PEER = DEMO_ACCOUNTS.find((a) => a.role === "peer")!;

/** Explore user search hint for the peer (Jordan) */
export const DEMO_EXPLORE_SEARCH = "Jordan";

/** Class search substring on planning (first hit should be a CS course in catalog) */
export const DEMO_CLASS_SEARCH = "CS";

/** Manual add targets an upcoming empty semester (relative to typical UC-style plan) */
export const DEMO_MANUAL_ADD_TERM = "Fall";
export const DEMO_MANUAL_ADD_YEAR = 2026;

/** Peer semester that has courses to copy from (seed script aligns) */
export const DEMO_PEER_COPY_TERM = "Spring";
export const DEMO_PEER_COPY_YEAR = 2025;

/** Presenter empty semester to receive copied courses */
export const DEMO_COPY_TARGET_TERM = "Spring";
export const DEMO_COPY_TARGET_YEAR = 2027;

export const DEMO_STORAGE_KEY = "gradly_demo";
export const DEMO_PHASE_KEY = "gradly_demo_phase";
export const DEMO_MUTATIONS_KEY = "gradly_demo_mutations";
/** Set before navigating to /planning/recommend so the client can run after mount (avoids lost window events). */
export const DEMO_PENDING_RECOMMEND_KEY = "gradly_demo_pending_recommend";
/** Set before navigating to friend schedule so copy runs after mount (avoids timer reset / phase races). */
export const DEMO_PENDING_COPY_KEY = "gradly_demo_pending_copy";
