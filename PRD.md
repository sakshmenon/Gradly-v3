# Gradly — Product Requirements Document
**Version:** 1.0  
**Date:** March 11, 2026  
**Author:** Solo Developer  
**Status:** Approved for Development

---

## 1. Executive Summary

### Product Vision
Gradly is a social academic planning web application designed to eliminate the uncertainty and decision fatigue college students face when managing long-term course schedules. The platform combines intelligent path recommendation with community-driven insights — professor reviews, peer GPA data, and shared schedules — to empower students to make confident, informed academic decisions from Day 1.

College freshmen frequently lack visibility into the sequencing of courses required for their degree. This gap leads to delayed graduation, prerequisite conflicts, academic probation, and — for international students — potential visa violations. Gradly closes this gap by giving every student a personalized, dynamic academic roadmap anchored in real peer data.

### Strategic Alignment
| Objective | How Gradly Addresses It |
|---|---|
| User growth | Viral social loop: students discover peers, share plans, invite friends |
| Retention | Persistent progress tracking creates habitual return visits each semester |
| Monetization (future) | Premium path recommendation tiers, university partnerships |
| Competitive advantage | Peer-sourced class intel + AI path scheduler in a minimalist UI |

### Key Differentiators
- **Path Recommendation Algorithm** — generates a multi-semester course plan that satisfies all degree requirements, respects prerequisites, and is tunable by user preference.
- **Social Layer** — students can browse anonymized or shared peer schedules, view crowdsourced professor ratings, and get grade distribution context before enrolling.
- **Minimalist, Mobile-Aware UI** — frictionless experience that does not overwhelm an already-stressed student.

### Resource Summary
| Item | Detail |
|---|---|
| Team | Solo developer |
| Timeline | 1 week (MVP) |
| Budget | $0 — all free-tier services only |
| Tech Stack | Modern web framework (React/Next.js), Supabase (DB + Auth), Vercel (hosting) |

---

## 2. Problem Statement & Opportunity

### User Pain Points
1. **Decision Fatigue** — Hundreds of course combinations with unclear optimal paths leave students paralyzed.
2. **Lack of Prerequisite Visibility** — Students discover prerequisite chains too late, pushing graduation back by one or more semesters.
3. **Scheduling Conflicts** — Without a holistic multi-semester view, students accidentally block themselves from required courses.
4. **Information Deficit** — Grade distributions, professor quality, and workload are scattered across Rate My Professor, Reddit, and word-of-mouth.
5. **Isolation in Planning** — Academic advising is time-limited and often generic; peer collaboration is ad-hoc and unstructured.

### Quantified Impact
- Delayed graduation affects an estimated 40–60% of four-year college students in the US.
- International students on F-1 visas risk status violations if full-time enrollment is not properly maintained.
- Students who drop courses without a plan can lose financial aid eligibility.

### Market Opportunity
Every enrolled college student is a potential user. The US alone has ~19 million undergraduates. Even at a narrow 1% addressable share, that represents ~190,000 users. Network effects within a single campus accelerate organic growth.

### Competitive Landscape
| Competitor | Gap Gradly Fills |
|---|---|
| Google Sheets / manual planners | No intelligence, no social layer |
| Rate My Professor | No schedule planning, no degree-path context |
| University portals (e.g., DegreeWorks) | No social features, poor UX, no recommendations |
| Coursicle | Limited social features, no path recommendation |

---

## 3. User Personas

### Persona 1 — The Freshman (Primary)
- **Name:** Maya, 18, Computer Science Freshman
- **Context:** Just declared her major. Has no idea which classes to take beyond the first semester.
- **Goals:** Understand what classes she needs, in what order, and which professors to avoid.
- **Frustrations:** Advisor appointments are booked weeks out. The degree audit tool is confusing.
- **Behavior:** Heavily influenced by peer recommendations. Active on social media. Wants validation from others who've been through it.

### Persona 2 — The Planner (Secondary)
- **Name:** James, 21, Junior studying Economics
- **Context:** Has a rough plan but wants to optimize it. Considering a minor and needs to see if it fits.
- **Goals:** Ensure he graduates on time while adding an optional minor. Wants to see if any electives overlap.
- **Frustrations:** Re-doing his plan every semester. Doesn't know if peers in his situation chose the same path.
- **Behavior:** Detail-oriented. Will engage deeply with scheduling tools. Willing to share his plan if it helps others.

---

## 4. Functional Requirements

### 4.1 Authentication & Onboarding
| ID | Requirement | Priority |
|---|---|---|
| F-01 | Users register and log in with email (Supabase Auth) | Must Have |
| F-02 | Onboarding flow captures: university, major/degree, year, completed courses, GPA | Must Have |
| F-03 | Users can skip optional fields and complete profile later | Should Have |
| F-04 | Session persistence — users stay logged in across browser sessions | Must Have |

### 4.2 Progress HUD (Dashboard)
| ID | Requirement | Priority |
|---|---|---|
| F-05 | Display overall degree completion percentage | Must Have |
| F-06 | Show categorized credit progress (Core, Major, Electives, General Ed) | Must Have |
| F-07 | Highlight upcoming prerequisites for unmet requirements | Should Have |
| F-08 | Semester-level timeline view showing planned vs. completed semesters | Must Have |

### 4.3 Course Planner
| ID | Requirement | Priority |
|---|---|---|
| F-09 | Browse searchable catalog of courses filtered by department, credits, level | Must Have |
| F-10 | Drag-and-drop (or tap-to-assign) courses into future semester slots | Must Have |
| F-11 | Prerequisite validation — warn user if a course is added without prerequisites met | Must Have |
| F-12 | Credit load indicator per semester with recommended min/max guardrails | Should Have |
| F-13 | Save and persist plan to Supabase in real time | Must Have |

### 4.4 Path Recommendation Algorithm
| ID | Requirement | Priority |
|---|---|---|
| F-14 | On demand, generate a full multi-semester course plan that satisfies all degree requirements | Must Have |
| F-15 | Algorithm respects prerequisite chains and credit load limits | Must Have |
| F-16 | User can accept, reject, or regenerate the recommended path | Must Have |
| F-17 | Thumbs up / thumbs down feedback on the generated path stored for future tuning | Should Have |
| F-18 | Algorithm factors in community-rated course difficulty when ordering courses (optional toggle) | Nice to Have |

### 4.5 Social & Explore Features
| ID | Requirement | Priority |
|---|---|---|
| F-19 | Users can set their schedule visibility to Public, Friends Only, or Private | Must Have |
| F-20 | Explore tab: browse public profiles filtered by major, year, university | Must Have |
| F-21 | Follow / friend request system | Must Have |
| F-22 | View a followed user's course plan (read-only) | Must Have |
| F-23 | "Clone path" — copy a peer's plan as a starting template for your own | Should Have |

### 4.6 Community Course Intelligence
| ID | Requirement | Priority |
|---|---|---|
| F-24 | Users can rate a completed course (1–5 stars, difficulty, workload) | Must Have |
| F-25 | Display aggregated community ratings on course detail pages | Must Have |
| F-26 | Professor name tagging on completed courses with optional review text | Should Have |
| F-27 | GPA distribution indicator (user-reported, anonymized) per course | Nice to Have |

### 4.7 Profile Management
| ID | Requirement | Priority |
|---|---|---|
| F-28 | Edit all profile fields post-onboarding | Must Have |
| F-29 | Profile picture upload | Should Have |
| F-30 | Display public profile with degree, year, completion progress | Must Have |

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Initial page load < 2s on standard broadband.
- Planner interactions (add/remove course) respond in < 300ms.
- Path recommendation generation completes in < 5s.

### 5.2 Security & Privacy
- Authentication via Supabase Auth (industry-standard JWT).
- All user academic data stored under Row Level Security (RLS) policies in Supabase — users can only read/write their own data.
- GPA data anonymized when surfaced to other users (aggregated only, never individual).
- GDPR/FERPA-aligned data handling: no sale of personal academic data.
- Passwords never stored in plaintext (delegated to Supabase Auth).

### 5.3 Scalability
- Supabase free tier supports up to 500MB DB and 50,000 MAU — sufficient for MVP.
- Stateless frontend on Vercel enables horizontal scaling with zero configuration.

### 5.4 Accessibility
- WCAG 2.1 AA compliance target.
- Keyboard-navigable planning interface.
- Sufficient color contrast ratios across all UI components.

### 5.5 Browser Support
- Chrome, Safari, Firefox, Edge — latest two major versions.
- Mobile-responsive design (min supported width: 375px).

---

## 6. Technical Architecture

### Stack
| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js (React) | SSR/SSG, file-based routing, Vercel-native |
| Styling | Tailwind CSS | Rapid utility-first styling, consistent design tokens |
| Database & Auth | Supabase | Postgres + real-time + auth, generous free tier |
| Hosting | Vercel | Zero-config deploys, free tier, CDN-backed |
| State Management | Zustand or React Context | Lightweight for MVP |

### Core Data Models
```
users
  id, email, name, university, major, degree_type, year, gpa, avatar_url, visibility

courses
  id, code, name, credits, department, description, prerequisites[]

user_courses
  user_id, course_id, semester, year, status (planned/completed), grade

course_ratings
  user_id, course_id, stars, difficulty, workload, professor_name, review_text

follows
  follower_id, following_id, status (pending/accepted)

path_plans
  user_id, plan_data (JSON), created_at, feedback (thumbs_up/thumbs_down)
```

### Path Recommendation Algorithm (MVP)
1. Load all degree requirements for the user's declared major.
2. Remove already-completed courses.
3. Topologically sort remaining courses by prerequisite dependency graph.
4. Bin courses into semesters respecting credit load limits (12–18 credits/sem).
5. Optional: weight ordering by community difficulty ratings (easiest-first for early semesters).
6. Output ordered semester plan. Store as JSON in `path_plans`.

---

## 7. UX & Design Principles

1. **Minimalism first** — every screen should have one primary action. No clutter.
2. **Progressive disclosure** — show complexity only when the user asks for it.
3. **Confidence through clarity** — use color and progress indicators to make academic status feel manageable, not overwhelming.
4. **Social without pressure** — following and sharing are opt-in; privacy defaults to friends-only.
5. **Delight in the details** — smooth transitions and micro-animations reward interaction.

### Key Screens
- **Onboarding Flow** (3–4 steps, wizard-style)
- **Dashboard / Progress HUD** (degree completion rings, semester timeline)
- **Planner** (semester columns, course cards, drag-to-assign)
- **Explore / Social Feed** (peer profiles, search, follow)
- **Course Detail** (ratings, prerequisites, community reviews)
- **Profile** (editable, shareable)

---

## 8. Success Metrics

| Metric | Target (End of Week 1 MVP) | Long-Term Target |
|---|---|---|
| Onboarding completion rate | > 70% of signups | > 85% |
| Path recommendation adoption | > 50% of active users generate a path | > 65% |
| DAU/MAU ratio | — (pre-launch) | > 30% |
| User-to-user connections | — (pre-launch) | Avg 3+ follows per user |
| Degree plan saved | > 80% of onboarded users | > 90% |

---

## 9. Out of Scope (MVP)

- Native mobile apps (iOS/Android)
- Real-time university registration system integration
- AI/LLM-generated course descriptions or chatbot advisor
- Paid subscription tiers
- Notification system (email/push)
- Multi-language support

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Course catalog data availability | High | High | Seed DB manually with sample university data; build import tooling later |
| Algorithm complexity overrun | Medium | High | Implement greedy topological sort for MVP; defer optimization |
| Scope creep within 1 week | High | High | Strict feature freeze after Day 2; all extras go to backlog |
| Supabase RLS misconfiguration | Medium | High | Implement and test RLS policies before any social features |
| Solo developer burnout | Medium | Medium | Time-boxed sprints with mandatory breaks; daily progress checkpoints |

---

*Document end. Version 1.0 — ready for development.*
