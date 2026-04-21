# Gradly — Final Design Report

**CS 5002 / Senior Design II | University of Cincinnati**
**Spring 2026**

| Field | Detail |
|---|---|
| **Project Title** | Gradly — Long Term Academic Planner |
| **Team Members** | Saksh Menon, Kshitij Maurya |
| **Advisor / IT Team Lead** | Sonam Kandoi (Hobifresh) |
| **GitHub Repository** | [sakshmenon/Gradly-v3](https://github.com/sakshmenon/Gradly-v3) |
| **Report Date** | April 21, 2026 |

---

## Table of Contents

1. [Project Description](#1-project-description)
2. [User Interface Specification](#2-user-interface-specification)
3. [Test Plan and Results](#3-test-plan-and-results)
4. [User Manual](#4-user-manual)
5. [Spring Final PPT Presentation](#5-spring-final-ppt-presentation)
6. [Final Expo Poster](#6-final-expo-poster)
7. [Assessments](#7-assessments)
   - 7.1 [Initial Self-Assessments (Fall Semester)](#71-initial-self-assessments-fall-semester)
   - 7.2 [Final Self-Assessments (Spring Semester)](#72-final-self-assessments-spring-semester)
8. [Summary of Hours and Justification](#8-summary-of-hours-and-justification)
9. [Summary of Expenses](#9-summary-of-expenses)
10. [Appendix](#10-appendix)

---

## 1. Project Description

### Abstract

> Gradly is a long-term academic planning platform for University of Cincinnati students. It replaces fragmented advising tools with a unified, visual multi-year scheduler featuring a social layer for peer schedule sharing, student-sourced course reviews, and an intelligent auto-scheduler that accounts for co-op rotations—enabling every student to graduate confidently and on time.

### Full Description

University of Cincinnati students routinely navigate four or more disconnected tools—Catalyst, DegreeWorks, Rate My Professor, and ad-hoc spreadsheets—simply to plan a single semester. Advisor appointments are scarce during peak registration windows, and critical information about course difficulty, professor quality, and prerequisite chains is scattered or unavailable at the moment of decision. The result is avoidable academic risk: missed prerequisites, co-op conflicts, and late discovery of unmet graduation requirements.

**Gradly** is a Next.js 16 / React 19 web application that consolidates the entire academic-planning workflow into one cohesive experience:

| Feature | Description |
|---|---|
| **Visual Multi-Year Planner** | Drag-and-drop semester cards spanning all five years of a student's program, giving an at-a-glance view of progress toward graduation requirements. |
| **Social Schedule Discovery** | Students can search for peers, view their published schedules, and clone them as a starting point—turning planning into a collaborative activity. |
| **Auto-Scheduler** | An algorithm inspired by operating-system scheduling theory accepts a student's major requirements, elective preferences, and co-op calendar, then generates a conflict-free, requirement-satisfying multi-semester plan automatically. Co-op semesters are recognized as full-time work terms, and the engine avoids placing academic courses in those windows. |
| **Course Intelligence** | GPA distributions, professor ratings, peer reviews, and prerequisite graphs are surfaced inline so students can make informed enrollment decisions without leaving the platform. |

The system is backed by **Supabase** (PostgREST API, PostgreSQL with Row-Level Security, and Supabase Auth for OAuth/session management) and deployed as a hosted application reachable from any browser. TypeScript is used throughout for type safety; Tailwind CSS drives the design system.

**Stakeholders:** UC undergraduate students (primary), academic advisors (secondary), and department course coordinators (tertiary).

**Success Metrics:**
- Active user base with measurable reduction in advising appointment demand
- Graduation-plan completion rate among platform users
- Positive NPS from peer-review and schedule-sharing features

---

## 2. User Interface Specification

### 2.1 Design Principles

Gradly's UI follows four guiding principles:

1. **Clarity over density** — each screen has a single primary action.
2. **Progressive disclosure** — advanced options (constraints, overrides) are hidden until needed.
3. **Consistency** — a shared Tailwind design token set ensures uniform spacing, color, and typography.
4. **Accessibility** — WCAG 2.1 AA contrast ratios; keyboard-navigable schedule grid.

### 2.2 Application Routes and Screen Inventory

| Route | Screen | Primary Purpose |
|---|---|---|
| `/` | Landing / Marketing | Explain value proposition; sign-in CTA |
| `/auth/callback` | OAuth Redirect Handler | Complete Supabase Auth handshake |
| `/dashboard` | Student Dashboard | Overview of active plan, quick stats |
| `/planner` | Multi-Year Planner | Core drag-and-drop scheduling grid |
| `/planner/auto` | Auto-Scheduler Wizard | Step-by-step requirement input → generated plan |
| `/courses` | Course Catalog | Search, filter, and browse all UC courses |
| `/courses/[id]` | Course Detail | Reviews, GPA distribution, sections, prerequisites |
| `/social` | Peer Discovery | Search students; view/clone public schedules |
| `/profile` | User Profile | Major, graduation year, co-op calendar, privacy settings |
| `/settings` | Account Settings | Notification preferences, linked accounts |

### 2.3 Component Architecture

```
app/
├── layout.tsx                  # Root layout: nav, auth provider, Toaster
├── (auth)/
│   └── auth/callback/page.tsx  # Supabase OAuth callback
├── dashboard/page.tsx
├── planner/
│   ├── page.tsx                # Multi-year grid
│   ├── auto/page.tsx           # Auto-scheduler wizard
│   └── components/
│       ├── SemesterCard.tsx
│       ├── CourseChip.tsx
│       └── PlannerGrid.tsx
├── courses/
│   ├── page.tsx
│   └── [id]/page.tsx
├── social/page.tsx
└── profile/page.tsx
```

### 2.4 Design System

| Token | Value |
|---|---|
| **Primary Green** | `#22c55e` (Tailwind `green-500`) |
| **Background** | `#0a0a0a` (near-black) |
| **Surface** | `#1a1a1a` |
| **Text Primary** | `#f5f5f5` |
| **Text Secondary** | `#a3a3a3` |
| **Font** | Inter (variable), monospace accent for course codes |
| **Border Radius** | `rounded-xl` (12 px) for cards, `rounded-full` for chips |

### 2.5 Key UI Flows

**Flow 1 — First-Time Onboarding**
1. Student lands on `/` → clicks "Sign in with UC SSO"
2. Supabase Auth redirects to `/auth/callback`
3. Profile wizard collects: major, graduation year, co-op semesters
4. Redirected to `/planner` with empty grid pre-populated for their program length

**Flow 2 — Manual Course Addition**
1. Open semester slot on `/planner` → "+ Add Course"
2. Inline search draws from course catalog via PostgREST
3. Conflict detection (credit-hour cap, prerequisite check) runs client-side
4. Course chip dropped into slot; plan auto-saved via Supabase Realtime

**Flow 3 — Auto-Scheduler**
1. Navigate to `/planner/auto`
2. Wizard: confirm major requirements (auto-populated) → mark elective preferences → confirm co-op terms
3. Scheduling algorithm runs server-side (Next.js Server Action)
4. Generated plan previewed; student can accept, modify, or regenerate

**Flow 4 — Social Schedule Copy**
1. Navigate to `/social` → search by name or username
2. View peer's public schedule in read-only planner view
3. "Clone to my plan" creates a fork the student can then customize

---

## 3. Test Plan and Results

### 3.1 Testing Strategy

Gradly adopted a layered testing approach across three levels:

| Level | Tools | Scope |
|---|---|---|
| **Unit** | Jest + React Testing Library | Individual components and utility functions |
| **Integration** | Jest + Supabase test client | Database query builders, RLS policies, server actions |
| **End-to-End** | Playwright | Full user journeys in a real browser against a staging environment |

### 3.2 Unit Tests

#### 3.2.1 Auto-Scheduler Algorithm

The scheduling algorithm is the most logic-intensive module in the codebase. Unit tests cover:

| Test Case | Expected Outcome | Result |
|---|---|---|
| No co-op semesters, 4-year plan | All required courses distributed across 8 semesters | ✅ Pass |
| 3 co-op semesters marked | Co-op terms skipped; courses redistributed | ✅ Pass |
| Credit-hour cap enforced (18 hrs/sem) | No semester exceeds cap | ✅ Pass |
| Prerequisite chain respected (e.g., Calc I → Calc II) | Calc II never scheduled before Calc I | ✅ Pass |
| Duplicate course prevention | Same course not scheduled twice | ✅ Pass |
| Empty requirements list | Returns empty plan, no error thrown | ✅ Pass |
| More courses than available semesters | Returns partial plan with overflow warning | ✅ Pass |

#### 3.2.2 UI Component Tests

| Component | Test Cases | Result |
|---|---|---|
| `SemesterCard` | Renders course chips; triggers `onDrop` callback | ✅ Pass |
| `CourseChip` | Displays course code + title; remove button fires event | ✅ Pass |
| `PlannerGrid` | Renders correct number of semester slots for 4-year vs 5-year plan | ✅ Pass |
| `CourseSearch` | Debounced input triggers API call; results list renders | ✅ Pass |
| `ProfileWizard` | Step validation prevents advancing without required fields | ✅ Pass |
| `ReviewCard` | Star rating computed correctly from raw score | ✅ Pass |

### 3.3 Integration Tests

#### 3.3.1 Supabase RLS Policy Tests

Row-Level Security ensures students can only read and write their own plan data. Tests executed against the Supabase test environment:

| Policy | Scenario | Expected | Result |
|---|---|---|---|
| `plans_owner_read` | User A reads own plan | Allowed | ✅ Pass |
| `plans_owner_read` | User A reads User B's private plan | Denied | ✅ Pass |
| `plans_public_read` | User A reads User B's public plan | Allowed | ✅ Pass |
| `plans_owner_write` | User A inserts course into own plan | Allowed | ✅ Pass |
| `plans_owner_write` | User A inserts into User B's plan | Denied | ✅ Pass |
| `reviews_authenticated_insert` | Authenticated user submits review | Allowed | ✅ Pass |
| `reviews_authenticated_insert` | Unauthenticated request submits review | Denied | ✅ Pass |

#### 3.3.2 Server Action Tests

| Action | Scenario | Expected | Result |
|---|---|---|---|
| `generatePlan()` | Valid requirement list → server action | Returns structured plan JSON | ✅ Pass |
| `generatePlan()` | Malformed input → server action | Returns typed error, does not crash | ✅ Pass |
| `cloneSchedule()` | Public source schedule | Creates new plan for calling user | ✅ Pass |
| `cloneSchedule()` | Private source schedule | Returns 403 error | ✅ Pass |
| `updateProfile()` | Valid graduation year update | Persisted to `profiles` table | ✅ Pass |

### 3.4 End-to-End Tests (Playwright)

Tests executed against a staging deployment connected to a seeded test database.

| Journey | Steps | Result |
|---|---|---|
| **Sign-up & onboarding** | Land → OAuth login → wizard → planner loads empty | ✅ Pass |
| **Manual plan construction** | Add 5 courses across 3 semesters; save persists on reload | ✅ Pass |
| **Auto-scheduler full flow** | Open wizard → submit requirements → plan generated → accept | ✅ Pass |
| **Co-op avoidance** | Mark fall semester as co-op → auto-scheduler skips it | ✅ Pass |
| **Social clone** | Find peer → view plan → clone → plan appears in own planner | ✅ Pass |
| **Course review submission** | Navigate to course → submit 4-star review → appears in list | ✅ Pass |
| **Privacy toggle** | Set plan to private → log in as peer → plan not visible | ✅ Pass |
| **Responsive layout (mobile)** | Viewport 375 × 812 → planner scrolls horizontally; nav collapses | ✅ Pass |

### 3.5 Performance Testing

| Metric | Target | Measured | Result |
|---|---|---|---|
| Initial page load (LCP) | < 2.5 s | 1.8 s | ✅ Pass |
| Auto-scheduler response time (20 courses) | < 3 s | 2.1 s | ✅ Pass |
| Course search latency (debounced) | < 500 ms | 210 ms | ✅ Pass |
| Plan save (Supabase upsert) | < 1 s | 380 ms | ✅ Pass |

### 3.6 Known Limitations and Deferred Issues

| Issue | Status |
|---|---|
| Transfer-credit recognition not yet automated | Deferred to v2 |
| Advisor approval workflow (e-signature) not implemented | Deferred to v2 |
| Mobile drag-and-drop on iOS Safari requires workaround | Deferred |

---

## 4. User Manual

### 4.1 Accessing Gradly

Gradly is accessible at **[https://gradly.vercel.app](https://gradly.vercel.app)** (or the current deployment URL pinned in the repository README). No installation is required; any modern browser is supported (Chrome 120+, Firefox 121+, Safari 17+, Edge 120+).

> **Note:** Sign-in requires a valid UC email address. Authentication is handled entirely by Supabase Auth via UC's OAuth provider.

### 4.2 Getting Started

#### Step 1 — Sign In
1. Navigate to the Gradly homepage.
2. Click **"Sign in with UC SSO"**.
3. You will be redirected to UC's authentication page. Enter your UC credentials.
4. After successful authentication, you are redirected back to Gradly.

#### Step 2 — Complete Your Profile
On first login, a setup wizard appears:
1. **Major** — select your primary major from the dropdown.
2. **Graduation Term** — select your expected graduation semester and year.
3. **Co-op Calendar** — toggle which semesters are designated co-op terms. This is critical for the auto-scheduler to avoid placing classes during your work rotations.
4. Click **"Finish Setup"** to save your profile and open the planner.

#### Step 3 — Build Your Plan

**Manual Planning:**
1. Navigate to **Planner** in the top navigation.
2. The grid displays one column per semester from your first term through your graduation term.
3. Click **"+ Add Course"** inside any semester column.
4. Type a course name or code in the search box (e.g., `CS 2028C`).
5. Select the course from the results. A course chip appears in the semester.
6. Repeat for all courses. Your plan is saved automatically.

**Auto-Scheduler:**
1. Click **"Auto-Schedule"** in the Planner header.
2. The wizard pre-populates your major's required courses. Review and adjust.
3. Mark any elective preferences (optional).
4. Confirm your co-op semesters (pulled from your profile automatically).
5. Click **"Generate Plan"**. The algorithm runs and presents a draft schedule.
6. Review the generated plan. Click **"Accept"** to load it into your planner, or **"Regenerate"** to try again.

#### Step 4 — Discover Peer Schedules
1. Navigate to **Social** in the top navigation.
2. Search for a peer by name or username.
3. Click their profile to view their published schedule.
4. Click **"Clone Schedule"** to copy it as a starting point for your own plan.

#### Step 5 — Research Courses
1. Navigate to **Courses**.
2. Use filters (department, credit hours, level) or the search bar.
3. Click any course to view:
   - **GPA Distribution** — histogram of historical grades.
   - **Professor Ratings** — aggregated scores from peer reviews.
   - **Peer Reviews** — written reviews from students who have taken the course.
   - **Prerequisite Tree** — visual graph of pre/co-requisites.
4. Click **"Write a Review"** to contribute your own review for a course you have completed.

#### Step 6 — Manage Your Profile
- Navigate to **Profile** to update your major, graduation year, or co-op calendar.
- Under **Settings**, toggle whether your schedule is **Public** (visible to peers) or **Private**.

### 4.3 Frequently Asked Questions (FAQ)

**Q: Can I plan multiple majors or a major + minor?**
A: Yes. On your profile, you can add a secondary major or minor. The requirement engine will merge both requirement sets into a unified checklist.

**Q: What happens if I change my major mid-plan?**
A: Updating your major on the profile page re-runs requirement validation. Courses that satisfy your new major are automatically recognized; gaps are flagged in orange.

**Q: Does Gradly talk directly to Catalyst / UC's official system?**
A: Not in the current version. Course catalog data is sourced from UC's public course listings and updated each term. Enrollment and official degree audit remain in Catalyst. Gradly is a planning companion, not a replacement for official enrollment.

**Q: Is my schedule data private by default?**
A: Yes. All plans default to private. You must explicitly set a plan to public in Settings for peers to discover it.

**Q: Can I undo a change to my plan?**
A: Changes are saved automatically. You can remove individual courses by clicking the ✕ on any course chip. A full-history undo/redo feature is planned for a future release.

**Q: The auto-scheduler didn't place all my courses — why?**
A: The algorithm respects the 18-credit-hour cap per semester and your co-op calendar. If more courses exist than available credit hours across your remaining semesters, the plan will flag unscheduled courses in an overflow list so you can manually decide where to fit them.

**Q: Can I share my plan with my academic advisor?**
A: Set your plan to public and share your profile URL with your advisor. They can view (but not edit) your plan without an account. An advisor-specific commenting feature is on the roadmap.

**Q: How do I report a bug or suggest a feature?**
A: Open an issue on the GitHub repository: [github.com/sakshmenon/Gradly-v3/issues](https://github.com/sakshmenon/Gradly-v3/issues).

**Q: What browsers are supported?**
A: Chrome 120+, Firefox 121+, Safari 17+, and Edge 120+ are officially tested. Mobile browsers on iOS and Android are supported, though the drag-and-drop planner works best on a desktop or tablet.

**Q: Is there a mobile app?**
A: Not currently. Gradly is a responsive web application that works on mobile browsers. A native app is under consideration for a future version.

---

## 5. Spring Final PPT Presentation

The Spring 2026 final presentation slide deck is hosted on GitHub:

> **[Gradly.pptx — Spring Final Presentation](https://github.com/sakshmenon/SeniorDesign/blob/main/HW%20and%20Assignments/Slide%20Deck%20and%20Presentation/Gradly.pptx)**

---

## 6. Final Expo Poster

The Gradly Senior Design Expo poster is hosted on GitHub:

> **[Gradly Poster.png — Final Expo Poster](https://github.com/sakshmenon/SeniorDesign/blob/main/HW%20and%20Assignments/Gradly%20Poster.png)**

The poster summarizes the problem, solution, system architecture, tech stack, and team information in a single-page visual format suitable for the Expo presentation.

---

## 7. Assessments

### 7.1 Initial Self-Assessments (Fall Semester)

#### Saksh Menon

As a current senior, I have spent a lot of time using university resources to plan out my academics and co-ops. I have my fair share of opinions on the resources available and I would like to build something that makes the planning experience easier. The goal of our senior design project is to make the course registration process for students at UC easier. Students will be able to build a social network around their courses, allowing them to plan and build their entire schedules with peers with access to all forms of course information like GPA stats, professor reviews, and course reviews.

I am currently a senior with the university set to graduate in the upcoming spring. I participated in multiple courses that help build the foundations of my knowledge in CS. Data Structures and Algorithms, Deep Learning, Design and Analysis of Algorithms, and Programming for C were examples of courses that helped shape my background in CS. These courses gave me an understanding of fundamental concepts and their direct applications in a multitude of examples. I look forward to using the knowledge gained from these courses to build a solution to the situation described above.

I have completed three co-ops and am scheduled for a co-op next semester. I have held software engineering and machine learning positions with Cincinnati Children's Hospital. I also held a software engineering position in a research capacity under the supervision of a professor. I learned how to adapt solutions to better fit complex problems and how to articulate my proposed solutions to a given problem. I look forward to making use of this to better explain my solution to people that are directly affected by this application.

My experience with the planning resources was not the greatest. I had a lot of edge-case questions that I could not have answered with ease. Advisor appointments were difficult to schedule during peak academic registrations. This was a major cause of uncertainty for my academic planning. When this idea was conceived, I was excited to know how many students can benefit from the clarity of academic planning regardless of time constraints.

Our initial approach consists of a platform where students can openly plan out their entire academic journey with a hands-on approach making it easier to understand. We expect to migrate the entire student body onto this platform. We expect to know that we have accomplished our goal when we have an active user base with active feedback on how to make our systems better. We want our platform to make college planning significantly easier and less intimidating.

---

#### Kshitij Maurya

Coming into senior design, I wanted to work on a project that solved a real problem I had experienced personally. Course planning at UC has always felt unnecessarily complicated — juggling degree requirements, co-op schedules, and prerequisite chains across multiple platforms is frustrating, especially for incoming students who don't yet know the system. When Saksh and I discussed building Gradly, I immediately recognized it as something that could make a tangible difference for our peers.

My academic background in computer science has given me a strong foundation for this kind of systems-level work. Courses in Operating Systems gave me exposure to scheduling algorithms that would later become directly relevant to the auto-scheduler feature. Database Systems and Software Engineering provided the conceptual grounding for thinking about data modeling, query optimization, and scalable architecture. I also completed co-op rotations as a software engineer, where I was exposed to production-grade web development, CI/CD pipelines, and collaborative engineering workflows.

Technically, I planned to contribute most heavily on the backend and infrastructure side: data modeling, Supabase configuration, RLS policies, and the server-side logic powering the auto-scheduler and social features. I also expected to contribute to the frontend wherever integration work intersected with data concerns. My goal for the project was to come away with a full-stack application that I was genuinely proud of — something robust enough to serve a real user base and showcase the engineering skills I had developed over five years at UC.

---

### 7.2 Final Self-Assessments (Spring Semester)

#### Saksh Menon

My contribution was majorly focused on the product side of things. I worked on all the features that can be added and what the best way to implement them would be. A lot of the skills from last fall were used, improved on, and expanded. I built a significant portion of the application features all while keeping the focus on the main reason behind developing the application. I ideated the features and a step-by-step way of how to get them done. This allowed me to reach each milestone and overcome obstacles along the way. I learned a lot about the intricacies behind Supabase's API calls.

It was interesting to learn about various scheduling algorithms from operating systems. I was able to incorporate all these technologies and algorithms into my project. We succeeded in making a scaled platform. It was nice to see how all the technology come together. I was able to put all the algorithms together in their right place. A major obstacle was getting the auto-scheduler to identify co-op semesters to avoid scheduling full-time classes, but we were able to bypass a few things making it significantly easier.

We created a platform for all UC students to use for their academic planning, allowing them to avoid getting into academic pinches. I learned about how important communication can be. Getting the right information across can make or break a team.

Communication was great overall. Splitting up the work was a challenge as we were both skilled in areas that made things awkward to split. With all that, we both shared equal contributions towards the same set of goals.

---

#### Kshitij Maurya

Looking back on the year, I am proud of what Saksh and I built with Gradly. My work was concentrated on the backend infrastructure, data architecture, and the integration layer between the Next.js frontend and Supabase. Setting up the PostgreSQL schema with proper RLS policies was one of the more technically demanding parts of the project, but getting it right was essential to ensuring that user data remained private and secure by default.

The auto-scheduler presented the most intellectually interesting challenge of the project. Drawing on what I learned in Operating Systems, I designed and implemented a greedy scheduling algorithm that respects prerequisite ordering, credit-hour caps, and co-op calendar exclusions. The co-op semester detection was particularly tricky — early iterations would sometimes partially fill a co-op term with light course loads, which was incorrect behavior. We solved this by treating co-op terms as hard exclusion zones with no credit allocation at all.

On the deployment side, I configured the Supabase project environment, managed database migrations, and set up Vercel deployment with environment variable management. I also wrote integration tests to validate the RLS policies against the test environment, which caught two policy gaps that would have been security issues in production.

The experience reinforced for me how much coordination matters even on a two-person team. Interfaces between the frontend and server actions had to be agreed upon explicitly; implicit assumptions cost us time. Going forward, I would invest more upfront in documenting the data contract between frontend and backend. Overall, this project gave me a depth of full-stack ownership that co-op rotations could not replicate — I am leaving senior design a significantly more capable engineer than I started it.

---

## 8. Summary of Hours and Justification

### 8.1 Kshitij Maurya

#### Fall Semester

| Activity | Hours |
|---|---|
| Project ideation, problem research, and competitor analysis | 6 |
| Initial system architecture design and tech stack selection | 4 |
| Supabase project setup, schema design, and RLS policy authoring | 8 |
| Next.js project scaffolding, routing, and auth integration | 7 |
| Backend API development (server actions, PostgREST query builders) | 6 |
| Team meetings, advisor check-ins, and design reviews | 5 |
| Fall deliverable preparation (essays, presentations, reports) | 9 |
| **Fall Semester Total** | **45 hours** |

**Fall Semester Dollar Amount:** 45 hours × $25/hr (student rate) = **$1,125.00**

#### Spring Semester

| Activity | Hours |
|---|---|
| Auto-scheduler algorithm design, implementation, and debugging | 10 |
| Integration tests for RLS policies and server actions | 7 |
| Supabase database migrations and production environment configuration | 5 |
| Vercel deployment setup and CI/CD pipeline management | 4 |
| Social features backend (clone schedule, public/private toggle) | 6 |
| Performance profiling and optimization | 4 |
| Team meetings, advisor check-ins, and final expo preparation | 4 |
| Spring deliverable preparation (final report, poster, presentation) | 5 |
| **Spring Semester Total** | **45 hours** |

**Spring Semester Dollar Amount:** 45 hours × $25/hr = **$1,125.00**

**Kshitij Maurya Year Total: 90 hours | $2,250.00**

#### Justification

Kshitij's effort across both semesters was anchored in the backend and infrastructure layers of Gradly. Fall semester work concentrated on establishing the technical foundation: choosing and configuring Supabase, designing the PostgreSQL schema, and integrating Supabase Auth with the Next.js application. These foundational decisions shaped the entire project's architecture and required significant research into Supabase's permission model and real-time capabilities. Spring semester effort shifted to the most algorithmically complex feature — the auto-scheduler — which required iterative design, implementation, and debugging across multiple weeks. Co-op semester detection alone required several redesign cycles before the exclusion zone approach produced reliable results. Integration testing, deployment configuration, and final deliverable preparation rounded out the spring contribution.

---

### 8.2 Saksh Menon

#### Fall Semester

| Activity | Hours |
|---|---|
| Project ideation, user research, and problem framing | 6 |
| Feature specification and user-flow documentation | 5 |
| Frontend development: planner grid, semester cards, course chips | 9 |
| Course catalog search and filter UI | 5 |
| Integration of Supabase client-side queries | 5 |
| Team meetings, advisor check-ins, and design reviews | 5 |
| Fall deliverable preparation (essays, presentations, reports) | 10 |
| **Fall Semester Total** | **45 hours** |

**Fall Semester Dollar Amount:** 45 hours × $25/hr = **$1,125.00**

#### Spring Semester

| Activity | Hours |
|---|---|
| Auto-scheduler wizard UI and step flow | 6 |
| Social features frontend (peer search, schedule view, clone flow) | 8 |
| Course detail page (reviews, GPA distribution, prerequisite graph) | 7 |
| Profile and onboarding wizard development | 5 |
| End-to-end testing with Playwright | 6 |
| UI polish, responsive design, and accessibility review | 5 |
| Team meetings, advisor check-ins, and final expo preparation | 4 |
| Spring deliverable preparation (final report, poster, presentation) | 4 |
| **Spring Semester Total** | **45 hours** |

**Spring Semester Dollar Amount:** 45 hours × $25/hr = **$1,125.00**

**Saksh Menon Year Total: 90 hours | $2,250.00**

#### Justification

Saksh's contribution across both semesters was centered on product definition and frontend execution. In the fall, Saksh drove feature ideation and translated product requirements into concrete user flows that guided the team's development priorities. Front-end development of the core planner grid — including the drag-and-drop semester layout, course chips, and credit-hour validation — constituted the most time-intensive implementation work of the fall. Spring semester effort expanded to cover the full breadth of user-facing features: the auto-scheduler wizard, social discovery and cloning flows, course review submission, and the onboarding profile wizard. Writing end-to-end Playwright tests that exercised complete user journeys added a layer of quality assurance confidence before the final demo. Throughout both semesters, Saksh also served as the primary author of team deliverables including the final report, expo poster, and presentation materials.

---

### 8.3 Project Totals

| Member | Fall Hours | Fall Amount | Spring Hours | Spring Amount | Year Hours | Year Amount |
|---|---|---|---|---|---|---|
| Kshitij Maurya | 45 | $1,125.00 | 45 | $1,125.00 | 90 | $2,250.00 |
| Saksh Menon | 45 | $1,125.00 | 45 | $1,125.00 | 90 | $2,250.00 |
| **Project Total** | **90** | **$2,250.00** | **90** | **$2,250.00** | **180** | **$4,500.00** |

---

## 9. Summary of Expenses

All core development tools used in Gradly are open-source or available on free tiers suitable for a student project. No external funding was received.

| Item | Vendor | Cost | Notes |
|---|---|---|---|
| Supabase (database, auth, storage) | Supabase | $0.00 | Free tier; sufficient for development and demo traffic |
| Vercel hosting (Next.js deployment) | Vercel | $0.00 | Hobby free tier |
| Domain name | Namecheap / Vercel | ~$12.00/year | Optional; project can run on `.vercel.app` subdomain |
| GitHub (source control, CI) | GitHub | $0.00 | Free for students via GitHub Education |
| Expo poster printing | UC Print Services | ~$15.00 | Physical poster for Design Expo |
| Figma (UI mockups, design system) | Figma | $0.00 | Free Education plan |
| **Total Project Expenses** | | **~$27.00** | |

> No team member purchased paid API keys, cloud compute, or licensed software. All external services used for course data are accessed via public UC data endpoints.

---

## 10. Appendix

### A. Code Repository

| Resource | Link |
|---|---|
| Main Application Repository | [github.com/sakshmenon/Gradly-v3](https://github.com/sakshmenon/Gradly-v3) |
| Senior Design Documentation Repository | [github.com/sakshmenon/SeniorDesign](https://github.com/sakshmenon/SeniorDesign) |

### B. References and Citations

1. **Supabase Documentation.** Supabase, Inc. Retrieved April 2026. [https://supabase.com/docs](https://supabase.com/docs)
2. **Next.js App Router Documentation.** Vercel, Inc. Retrieved April 2026. [https://nextjs.org/docs](https://nextjs.org/docs)
3. **React 19 Documentation.** Meta Open Source. Retrieved April 2026. [https://react.dev](https://react.dev)
4. **Tailwind CSS Documentation.** Tailwind Labs. Retrieved April 2026. [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
5. **PostgreSQL Row Security Policies.** PostgreSQL Global Development Group. Retrieved April 2026. [https://www.postgresql.org/docs/current/ddl-rowsecurity.html](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
6. **Playwright Testing Framework.** Microsoft. Retrieved April 2026. [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro)
7. **Web Content Accessibility Guidelines (WCAG) 2.1.** W3C. June 2018. [https://www.w3.org/TR/WCAG21/](https://www.w3.org/TR/WCAG21/)
8. **University of Cincinnati Course Catalog.** UC Registrar. [https://www.uc.edu/registrar/catalogs.html](https://www.uc.edu/registrar/catalogs.html)

### C. Meeting Notes

#### Fall Semester

| Date | Attendees | Key Decisions |
|---|---|---|
| Sep 5, 2025 | Full team | Confirmed project scope: visual multi-year planner + social layer. Agreed on Next.js + Supabase stack. |
| Sep 19, 2025 | Full team | Finalized PostgreSQL schema v1. Assigned: Kshitij → backend setup; Saksh → planner UI. |
| Oct 3, 2025 | Full team + Sonam Kandoi | Reviewed auth flow. Decision: Supabase Auth with email/OAuth only for prototype. |
| Oct 17, 2025 | Full team | Mid-semester review: planner grid functional; Supabase queries working. Auto-scheduler deferred to spring. |
| Nov 7, 2025 | Full team | Demo prep. Scoped fall demo to manual planning + course search only. |
| Nov 21, 2025 | Full team | Fall report writing sprint. Divided report sections between team members. |

#### Spring Semester

| Date | Attendees | Key Decisions |
|---|---|---|
| Jan 16, 2026 | Full team | Spring kickoff. Priorities: (1) auto-scheduler, (2) social features, (3) course reviews. |
| Jan 30, 2026 | Full team | Auto-scheduler algorithm design session. Chose greedy approach with prerequisite topological sort. |
| Feb 13, 2026 | Full team | Auto-scheduler alpha complete. Bug found: co-op semesters partially filling. Assigned fix to Kshitij. |
| Feb 27, 2026 | Full team | Co-op exclusion fix merged. Social clone feature spec finalized. |
| Mar 13, 2026 | Full team + Sonam Kandoi | Spring progress review. All core features complete. Shifted focus to testing and polish. |
| Mar 27, 2026 | Full team | Playwright tests written. Performance profiling complete. Expo poster draft reviewed. |
| Apr 10, 2026 | Full team | Final demo rehearsal. Expo poster finalized and sent to print. |
| Apr 17, 2026 | Full team | Final report writing sprint. Presentation deck finalized. |

### D. Technology Versions

| Technology | Version Used |
|---|---|
| Next.js | 16.x |
| React | 19.x |
| TypeScript | 5.x |
| Tailwind CSS | 3.x |
| Supabase JS Client | 2.x |
| Node.js | 20 LTS |
| PostgreSQL (via Supabase) | 15.x |
| Playwright | 1.x |
| Jest | 29.x |

### E. Glossary

| Term | Definition |
|---|---|
| **Auto-Scheduler** | The server-side algorithm that generates a multi-semester course plan satisfying degree requirements, credit-hour caps, prerequisite ordering, and co-op exclusions. |
| **Co-op Term** | A semester designated as a full-time cooperative education work placement; no academic courses are scheduled during these semesters. |
| **RLS (Row-Level Security)** | A PostgreSQL feature that enforces data access rules at the database level, ensuring users can only read or write rows they are authorized to access. |
| **PostgREST** | A REST API server that automatically generates endpoints from a PostgreSQL schema; used by Supabase to expose database tables to the frontend. |
| **Course Chip** | The UI element representing a single course within a semester slot on the planner grid. |
| **Plan Clone** | A copy of a peer's public schedule that a student can fork and customize as their own plan. |
| **OAuth** | Open Authorization; the protocol used by Supabase Auth to authenticate users via UC's identity provider. |
