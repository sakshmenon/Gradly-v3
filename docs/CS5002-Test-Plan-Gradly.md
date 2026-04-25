# Test Plan and Results — Gradly

## Part I. Description of Overall Test Plan

Gradly is a student academic-planning and social web application (Next.js, Supabase). Testing combines **isolated checks of domain logic** with **end-to-end validation** against a real or staging Supabase project and anonymized catalog data. Pure functions (e.g. semester ordering, pathfinder modes, co-op vs. study course partitioning) are suitable for **white-box unit tests** with fixed inputs. **Black-box tests** are applied to user-visible flows: authentication, profile completion gates, planning and auto-scheduler behavior, and explore/connect/copy, exercised manually or via scriptable browser sessions. **Supabase Row Level Security (RLS)** and **server actions** that enforce co-op and placement rules are verified with authenticated integration tests (same user, controlled rows in `user_courses` and `classes`).

A **seeded “presentation demo”** and optional **SQL migrations** in CI or local `supabase db` runs provide **repeatable integration** checks (demo users, co-op sequence, connect/copy). We do not currently target formal load or latency SLAs; **performance** is limited to a single optional smoke check. Where automated unit coverage is not yet present in the repo, tests below are defined as **manual or future-automation** with clear pass/fail criteria.

## Part II. Test Case Descriptions

| Field | Grading note |
|-------|----------------|
| 1. Identifier | Unique ID |
| 2. Purpose | One line |
| 3. Description | Steps / scope |
| 4. Inputs | Data / preconditions |
| 5. Expected outputs / results | Pass criteria |
| 6. Case type | **One of:** normal / abnormal / boundary |
| 7. Box type | **One of:** blackbox / whitebox |
| 8. Test kind | **One of:** functional / performance |
| 9. Level | **One of:** unit / integration |

---

**GR-1**  
- **1.** `GR-1`  
- **2.** Ensure valid users can sign in.  
- **3.** On `/login`, submit email and password for an account that exists in Supabase Auth; confirm session is created and app navigates to the home dashboard.  
- **4.** Valid `email`, `password`; user exists, email confirmed (if required).  
- **5.** No auth error; `GET` home (`/`) returns 200; dashboard greeting visible.  
- **6.** normal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results (when run):** _Record here._

---

**GR-2**  
- **1.** `GR-2`  
- **2.** Ensure invalid credentials are rejected.  
- **3.** On `/login`, submit wrong password for a known user; no session; error surfaced.  
- **4.** Valid email, **incorrect** password.  
- **5.** Supabase error message (or app message); user remains on login; unauthenticated `GET` `/` redirects to login.  
- **6.** abnormal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-3**  
- **1.** `GR-3`  
- **2.** Ensure unauthenticated access to app routes is blocked.  
- **3.** With no session, request `/planning`, `/profile`, `/explore` (browser or `curl` following redirects).  
- **4.** No `Cookie` / no bearer session.  
- **5.** Redirect to `/login` (or auth flow) for protected content.  
- **6.** normal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-4**  
- **1.** `GR-4`  
- **2.** Ensure profile completion gates planning when required fields are missing.  
- **3.** Log in as user with incomplete profile (no `starting_semester` / `expected_graduation`); open `/planning`.  
- **4.** User row missing one or both fields.  
- **5.** “Profile incomplete” message and link to `/profile`; no semester planner grid.  
- **6.** boundary  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-5**  
- **1.** `GR-5`  
- **2.** Ensure a study-semester course can be added and appears in the planner.  
- **3.** With complete profile, class exists in `classes`, add a non–co-op course to an upcoming **study** term via planner UI; refresh.  
- **4.** Valid `course_id`, study `term`/`year`, `planned` (or in-progress for current term as designed).  
- **5.** Row in `user_courses`; course listed under correct semester; no error toast.  
- **6.** normal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-6**  
- **1.** `GR-6`  
- **2.** Ensure co-op catalog courses cannot be placed on a **study** semester.  
- **3.** Attempt to add a class with `class_kind = 'coop'` or `COOP*`-style `course_id` to a term not marked co-op (server or UI).  
- **4.** Co-op course id, study semester.  
- **5.** `validateCoursePlacementForSemester` (or UI) returns error; no insert.  
- **6.** abnormal  
- **7.** whitebox (asserted via `planning/actions.ts` and `coopPlacement` rules, or server action return)  
- **8.** functional  
- **9.** integration  
- **Note:** Reclassify as **blackbox** if the test is UI-only with no review of server implementation.

---

**GR-7**  
- **1.** `GR-7`  
- **2.** Ensure co-op semester allows at most one co-op course in catalog order.  
- **3.** Mark a plan term as co-op (after the first two terms); add next `coop_sequence` course; try a second course or wrong sequence.  
- **4.** Toggled `user_semester_modes.is_coop`, catalog rows with `coop_sequence`.  
- **5.** First valid co-op course succeeds; second course or wrong sequence fails with clear error.  
- **6.** boundary  
- **7.** whitebox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-8**  
- **1.** `GR-8`  
- **2.** Ensure pathfinder “mode 1” orders queued courses by numeric course id before packing credits.  
- **3.** Call `runPathfinder` (or its ordering helper) with a fixed `PlannerCourse[]` array; compare order to expected lowest-first.  
- **4.** Curated `course_id` list (e.g. `CS3000`, `CS1000`, `MATH2000`).  
- **5.** Scheduled subset respects mode-1 ordering policy up to `MAX_CREDITS`.  
- **6.** normal  
- **7.** whitebox  
- **8.** functional  
- **9.** unit  
- **Results:** _Record here._

---

**GR-9**  
- **1.** `GR-9`  
- **2.** Ensure `approveSemester` persists only after validation matches planner rules.  
- **3.** From `/planning/recommend`, approve a generated semester; verify `user_courses` rows in Supabase.  
- **4.** Logged-in user, non-empty queue, study semester.  
- **5.** Rows inserted; `revalidatePath` effective on refresh; co-op terms reject wrong counts.  
- **6.** normal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-10**  
- **1.** `GR-10`  
- **2.** Ensure another user’s schedule is not visible before connection.  
- **3.** As user A, open `/explore/<userB_id>` when not connected; check preview blur / restricted state.  
- **4.** Two distinct users, no `follows` row or pending only.  
- **5.** Schedule preview shows restricted; no full course list without connect (per product rules).  
- **6.** normal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-11**  
- **1.** `GR-11`  
- **2.** Ensure “Connect” results in accepted relationship for MVP (auto-accept).  
- **3.** As user A, connect to B; confirm `follows.status = 'accepted'` and schedule becomes visible.  
- **4.** Two users, public or friends-only visibility as applicable.  
- **5.** Connected UI; can open `/explore/B/schedule` without “connection required” wall.  
- **6.** normal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-12**  
- **1.** `GR-12`  
- **2.** Ensure “copy schedule” creates planner rows under placement rules.  
- **3.** As connected user, copy a peer’s semester into your empty term.  
- **4.** `course_id[]` from peer; target term/year.  
- **5.** New rows in `user_courses` or `ignoreDuplicates` for conflicts; co-op-invalidation same as manual add.  
- **6.** normal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-13**  
- **1.** `GR-13`  
- **2.** Ensure RLS blocks reading another user’s `user_courses` when policy forbids.  
- **3.** Use Supabase client as user A, `select` on B’s `user_courses` without follow/public rule.  
- **4.** SQL or client query under A’s JWT.  
- **5.** Empty or error per policy, not the full set of B’s courses.  
- **6.** abnormal (policy denial is expected)  
- **7.** whitebox (policy and query known)  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-14**  
- **1.** `GR-14`  
- **2.** Ensure `partitionPlannerCoursesForStudyScheduling` never feeds co-op courses to the study pathfinder.  
- **3.** Pass a mixed `PlannerCourse[]` with a `COOP*` or `class_kind: coop` entry; assert study queue excludes them.  
- **4.** Mixed queue in test harness.  
- **5.** `coopCatalogOnly` / study queue split matches rules.  
- **6.** boundary  
- **7.** whitebox  
- **8.** functional  
- **9.** unit  
- **Results:** _Record here._

---

**GR-15**  
- **1.** `GR-15`  
- **2.** Ensure “Start guided demo” sign-in and demo session flag work end-to-end.  
- **3.** On `/login`, use demo flow; `sessionStorage` demo key set; steps advance through planning → recommend → explore (manual checklist).  
- **4.** Seeded `demo.alex.mercer@…` and password.  
- **5.** No stall at autoscheduler or copy; thank-you and sign-out at end.  
- **6.** normal  
- **7.** blackbox  
- **8.** functional  
- **9.** integration  
- **Results:** _Record here._

---

**GR-16**  
- **1.** `GR-16`  
- **2.** Optional: cold-load performance smoke for dashboard.  
- **3.** Measure time-to-interactive or `LCP` for `/` after login in dev/Chrome once; record approximate ms (no hard SLA).  
- **4.** Warm cache off; throttled or local network.  
- **5.** Page usable under ~N s (team-defined N, e.g. 5s local).  
- **6.** boundary  
- **7.** blackbox  
- **8.** performance  
- **9.** integration  
- **Omission note:** Omitted in minimal submissions; **performance** is optional for this course. Include only if you run a trace.

---

## Part III. Test Case Matrix

| ID | Case type (6) | Black/whitebox (7) | Functional/performance (8) | Unit/integration (9) |
|----|-----------------|----------------------|----------------------------|----------------------|
| GR-1 | normal | blackbox | functional | integration |
| GR-2 | abnormal | blackbox | functional | integration |
| GR-3 | normal | blackbox | functional | integration |
| GR-4 | boundary | blackbox | functional | integration |
| GR-5 | normal | blackbox | functional | integration |
| GR-6 | abnormal | whitebox | functional | integration |
| GR-7 | boundary | whitebox | functional | integration |
| GR-8 | normal | whitebox | functional | unit |
| GR-9 | normal | blackbox | functional | integration |
| GR-10 | normal | blackbox | functional | integration |
| GR-11 | normal | blackbox | functional | integration |
| GR-12 | normal | blackbox | functional | integration |
| GR-13 | abnormal | whitebox | functional | integration |
| GR-14 | boundary | whitebox | functional | unit |
| GR-15 | normal | blackbox | functional | integration |
| GR-16 (opt.) | boundary | blackbox | performance | integration |

**Coverage summary:** 15 core functional cases (GR-1–GR-15) plus one optional performance smoke (GR-16). Mix of **normal**, **abnormal**, and **boundary**; **blackbox** (user/system behavior) and **whitebox** (rule-level / policy / unit modules); **unit** for pure schedulers and co-op queue split; **integration** for auth, RLS, planner, and explore flows. **Omitted with justification:** formal stress/load testing, security penetration, and cross-browser matrix (out of scope unless required by the syllabus).

---

_This document is aligned in structure with the sample “Test Plan and Results” style (e.g. CS5002 sample) while tailored to the Gradly repository. Fill “Results” after each test run for traceability._
