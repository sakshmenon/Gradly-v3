# Gradly — 1-Week MVP Sprint Schedule
**Start:** Monday, March 11, 2026  
**Ship Date:** Sunday, March 17, 2026 (EOD)  
**Developer:** Solo  
**Philosophy:** Time-box ruthlessly. Defer anything not on the critical path. Ship working software every day.

---

## Sprint Overview

| Day | Theme | Deliverable |
|---|---|---|
| Mon Mar 11 | Foundation | Repo, stack, DB schema, auth live |
| Tue Mar 12 | Data & Onboarding | Course catalog seeded, onboarding flow complete |
| Wed Mar 13 | Core Features I | Progress HUD + Planner (add/remove courses) |
| Thu Mar 14 | Core Features II | Path Recommendation Algorithm |
| Fri Mar 15 | Social Layer | Explore tab, follow system, shared plan views |
| Sat Mar 16 | UI/UX Polish | Animations, transitions, mobile responsiveness |
| Sun Mar 17 | Hardening & Ship | Bug fixes, RLS audit, deploy to production |

---

## Day 1 — Monday, March 11: Foundation
**Goal:** Everything compiles, deploys, and auth works end-to-end.

| # | Task | Est. Time | Notes |
|---|---|---|---|
| 1.1 | Initialize Next.js project with Tailwind CSS | 30 min | `npx create-next-app` + Tailwind setup |
| 1.2 | Set up Supabase project — enable Auth, create DB | 30 min | Free tier. Save env keys. |
| 1.3 | Define and run all DB migrations (schema v1) | 60 min | `users`, `courses`, `user_courses`, `course_ratings`, `follows`, `path_plans` |
| 1.4 | Implement Supabase RLS policies for all tables | 45 min | Do this NOW before any feature touches data |
| 1.5 | Email login / signup flow (Supabase Auth) | 60 min | Magic link or email+password |
| 1.6 | Protected routing — redirect unauthenticated users | 30 min | Middleware or `useUser` guard |
| 1.7 | Deploy skeleton to Vercel | 30 min | Verify env vars, confirm deploy pipeline |
| 1.8 | Set up global layout, nav shell, design tokens | 45 min | Color palette, typography, spacing scale |

**End-of-day checkpoint:** App is live on Vercel. Users can sign up, log in, and see a blank dashboard.

---

## Day 2 — Tuesday, March 12: Data & Onboarding
**Goal:** Seed a realistic course catalog and get users through onboarding.

| # | Task | Est. Time | Notes |
|---|---|---|---|
| 2.1 | Seed `courses` table with 80–120 sample courses across 3–4 departments | 90 min | Include codes, credits, prerequisites. Use a single university's public catalog as reference. |
| 2.2 | Seed `degree_requirements` — map majors to required course IDs | 45 min | At minimum: CS, Business, Psychology majors |
| 2.3 | Build multi-step onboarding wizard (Steps 1–3) | 90 min | Step 1: University + Major / Step 2: Year + Completed courses / Step 3: GPA + Profile pic |
| 2.4 | Write onboarding data to `users` table on completion | 30 min | Upsert pattern |
| 2.5 | Skip-for-later logic on optional fields | 20 min | |
| 2.6 | Redirect to dashboard after onboarding | 15 min | Detect first-login flag on user record |

**End-of-day checkpoint:** New users can complete onboarding. Profile and academic data are persisted in Supabase.

---

## Day 3 — Wednesday, March 13: Core Features I
**Goal:** Progress HUD and the Course Planner are fully functional.

| # | Task | Est. Time | Notes |
|---|---|---|---|
| 3.1 | Progress HUD — query degree requirements vs. completed courses | 60 min | Compute %complete per category |
| 3.2 | Render completion rings / bars per category (Core, Major, Electives, Gen Ed) | 45 min | Use a lightweight chart lib or pure SVG |
| 3.3 | Semester timeline view — display planned semesters as columns | 60 min | Scrollable horizontal layout |
| 3.4 | Course Planner — browse/search course catalog | 45 min | Filter by department, level, credits |
| 3.5 | Add course to a semester slot (write to `user_courses`) | 45 min | |
| 3.6 | Remove course from a semester | 20 min | |
| 3.7 | Prerequisite validation warning on add | 45 min | Check prereq chain before insert |
| 3.8 | Credit load indicator per semester | 30 min | Show sum, warn if < 12 or > 18 |

**End-of-day checkpoint:** Dashboard shows real degree progress. Users can build a multi-semester plan manually.

---

## Day 4 — Thursday, March 14: Path Recommendation Algorithm
**Goal:** The core differentiator — auto-generate a valid multi-semester plan.

| # | Task | Est. Time | Notes |
|---|---|---|---|
| 4.1 | Implement prerequisite dependency graph builder | 60 min | Parse `prerequisites[]` into directed graph |
| 4.2 | Topological sort of remaining (incomplete) courses | 45 min | Kahn's algorithm |
| 4.3 | Greedy semester bin-packing (12–18 credits/sem) | 60 min | Fill semesters respecting topo order + credit caps |
| 4.4 | API route: `POST /api/generate-path` | 30 min | Takes user_id, returns ordered semester plan |
| 4.5 | Save generated plan to `path_plans` table | 20 min | |
| 4.6 | "Generate My Path" button on dashboard triggers API and renders result | 45 min | Replace existing planner state with generated plan |
| 4.7 | Accept / Reject / Regenerate UI controls | 30 min | Store feedback flag in `path_plans` |
| 4.8 | Write algorithm unit tests for edge cases | 45 min | Circular prereqs (guard), no remaining courses, < 1 semester |

**End-of-day checkpoint:** Users can click one button and receive a complete, valid, prereq-safe course plan. They can regenerate or accept it.

---

## Day 5 — Friday, March 15: Social Layer
**Goal:** Students can find peers, follow them, and see their plans.

| # | Task | Est. Time | Notes |
|---|---|---|---|
| 5.1 | Explore tab — list public profiles (paginated, 20/page) | 45 min | Filter by major, year |
| 5.2 | Search bar — search users by name or major | 30 min | Supabase `ilike` query |
| 5.3 | Follow / Unfollow action (writes to `follows` table) | 45 min | Pending → Accepted flow |
| 5.4 | Following feed — show recently updated plans from followed users | 60 min | Join `follows` + `path_plans` |
| 5.5 | View peer plan (read-only) | 45 min | Render their semester columns, no edit controls |
| 5.6 | "Clone Path" — copy peer's `path_plans` JSON as starting point | 30 min | Prompt confirmation before overwriting |
| 5.7 | Privacy toggle on profile (Public / Friends Only / Private) | 30 min | Gate `follows` and plan visibility queries |
| 5.8 | Course rating submission form (stars, difficulty, workload, professor) | 45 min | On completed courses only |
| 5.9 | Display aggregated ratings on course detail modal | 30 min | Avg star, avg difficulty |

**End-of-day checkpoint:** Social graph is live. Users can find friends, view plans, clone paths, and rate courses.

---

## Day 6 — Saturday, March 16: UI/UX Polish
**Goal:** The app feels fast, fluid, and beautiful. Mobile works.

| # | Task | Est. Time | Notes |
|---|---|---|---|
| 6.1 | Mobile responsiveness audit — all core screens at 375px, 768px, 1280px | 60 min | Fix layout breaks |
| 6.2 | Page transitions — smooth fade/slide between routes | 45 min | `framer-motion` or CSS transitions |
| 6.3 | Micro-animations — course card add/remove, progress ring fill on load | 45 min | |
| 6.4 | Loading states — skeletons on data-fetching screens | 30 min | |
| 6.5 | Empty states — meaningful CTAs when no data (no courses, no friends) | 30 min | |
| 6.6 | Error states — friendly messages for API failures | 30 min | |
| 6.7 | Toast notifications for key actions (course added, plan generated, follow sent) | 30 min | `react-hot-toast` or similar |
| 6.8 | Profile page — editable form, avatar upload to Supabase Storage | 60 min | |
| 6.9 | Typography, spacing, and color consistency pass | 45 min | Align everything to design tokens set on Day 1 |

**End-of-day checkpoint:** App is visually polished, mobile-friendly, and every interaction has appropriate feedback.

---

## Day 7 — Sunday, March 17: Hardening & Ship
**Goal:** Production-ready. No data leaks. Zero critical bugs. Live URL shared.

| # | Task | Est. Time | Notes |
|---|---|---|---|
| 7.1 | Full RLS policy audit — test that users cannot access each other's private data | 60 min | Use Supabase SQL editor to test as different user IDs |
| 7.2 | End-to-end smoke test: sign up → onboard → plan → generate path → follow user → rate course | 45 min | Walk the full critical path manually |
| 7.3 | Fix P0/P1 bugs found in smoke test | 90 min | Time-boxed. Defer P2s to backlog. |
| 7.4 | Performance check — Lighthouse audit on dashboard and planner | 30 min | Target Performance > 85, Accessibility > 90 |
| 7.5 | Environment variable audit — no secrets exposed client-side | 20 min | |
| 7.6 | Set up Vercel production environment (separate from preview) | 20 min | |
| 7.7 | Final production deploy | 15 min | |
| 7.8 | Write a minimal README (setup, env vars, tech stack) | 30 min | |

**End-of-day checkpoint:** Gradly MVP is live, secure, and accessible via a public URL.

---

## Daily Time Budget

| Block | Duration | Content |
|---|---|---|
| Morning sprint | 4h | Core feature work (hardest tasks first) |
| Afternoon sprint | 3h | Integration, secondary tasks |
| Evening review | 1h | Testing, bug fixes, day checkpoint, plan next day |
| **Total** | **~8h/day** | Sustainable solo pace |

---

## Feature Freeze Policy
- After Day 2 ends, no new features are added.
- All new ideas go to the **Post-MVP Backlog** below.
- The only exception: security issues discovered in the Day 7 RLS audit.

---

## Post-MVP Backlog (Do Not Touch This Week)
- Native mobile app
- AI/LLM chatbot academic advisor
- Real-time university registration API integrations
- Email/push notification system
- GPA distribution visualization
- Multi-university course catalog import tooling
- Gamification / degree completion badges
- Paid subscription tier

---

## Definition of Done (MVP)
A feature is "done" when:
1. It works end-to-end with real Supabase data.
2. It is mobile-responsive.
3. It has at least a loading and error state.
4. RLS policies prevent unauthorized data access for that feature.
5. It is deployed and accessible on the production Vercel URL.

---

*Schedule version 1.0 — locked March 11, 2026.*
