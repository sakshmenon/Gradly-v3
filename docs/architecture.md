# Gradly — architecture & design

This document conceptualizes how the Gradly platform fits together: the **client and hosting surface**, the **Next.js application**, and the **Supabase backend** (Auth + PostgreSQL). It reflects the tables and flows used in the app today, aligned with the broader product model in [`PRD.md`](../PRD.md).

---

## 1. System context (platform boundaries)

Students use a **web browser**. The app is a **Next.js** deployment (e.g. Vercel) that talks to **Supabase** for authentication and data. Supabase exposes **PostgREST** over PostgreSQL; **Row Level Security (RLS)** enforces access rules in the database.

```mermaid
flowchart LR
  subgraph User["User environment"]
    Browser["Browser (Chrome, Safari, Firefox, Edge)"]
  end

  subgraph Hosted["Hosted application"]
    Next["Next.js 16 — App Router\nReact 19 + Tailwind"]
  end

  subgraph Supabase["Supabase platform"]
    Auth["Supabase Auth\n(GoTrue / JWT sessions)"]
    PGREST["PostgREST API"]
    PG["PostgreSQL\n+ RLS policies"]
  end

  Browser <-->|"HTTPS — pages, actions,\nserver components"| Next
  Next <-->|"Sign-in, session refresh,\nOAuth callback"| Auth
  Next <-->|"CRUD via @supabase/ssr\n& supabase-js"| PGREST
  PGREST --> PG
  Auth --> PG
```

**Notes**

- Session cookies are managed by `@supabase/ssr` on the server and in middleware-style logic (`src/proxy.ts`) so visits stay authenticated.
- No separate custom API server: the app uses Supabase as the **Backend-as-a-Service** data plane.

---

## 2. Application architecture (Gradly `gradly/` app)

The UI is organized by **App Router** routes. **Server Components** and **server actions** use `src/lib/supabase/server.ts`; interactive views use **client components** with `src/lib/supabase/client.ts`. Domain logic for planning and paths lives under `src/lib/utils/` (e.g. `planning.ts`, `pathfinding.ts`, `pathfinder.ts`, `semester.ts`).

```mermaid
flowchart TB
  subgraph Routes["src/app — routes"]
    Home["/ — Dashboard"]
    Plan["/planning — planner"]
    Rec["/planning/recommend — path recommendation"]
    Exp["/explore — peers"]
    Prof["/profile"]
    Course["/classes/[courseId] — course + reviews"]
    Login["/login"]
    AuthR["/auth/* — callback, signout"]
  end

  subgraph Shared["Shared UI"]
    Layout["layout.tsx + ClientLayout\n(nav, shell)"]
  end

  subgraph Data["Data access"]
    SRV["createClient() — server\n(cookies)"]
    CLI["createClient() — browser"]
  end

  subgraph SB["Supabase"]
    A2["Auth"]
    T2["Tables — see §3"]
  end

  Layout --> Routes
  Home & Plan & Rec & Exp & Prof & Course --> SRV
  Login --> CLI
  AuthR --> SRV
  SRV --> A2
  SRV --> T2
  CLI --> A2
  CLI --> T2
```

**Feature ↔ data (high level)**

| Area | Route(s) | Primary persistence |
|------|-----------|---------------------|
| Dashboard & progress | `/` | `users`, `user_courses` |
| Planner & catalog | `/planning` | `classes`, `user_courses`, `course_ratings` |
| Recommendations | `/planning/recommend` | `degree_requirements`, `user_courses`, `classes` |
| Social | `/explore`, `/explore/[userId]`, schedule | `users`, `follows`, `user_courses` |
| Course intel | `/classes/[courseId]` | `classes`, `user_courses`, `course_ratings` |
| Profile | `/profile` | `users` |

---

## 3. Backend database (PostgreSQL / Supabase)

The product PRD names a **`courses`** entity; the running app uses a **`classes`** table as the course catalog. **`users`** holds app profile fields (linked to Auth user ids). **`user_courses`** is the bridge between users and planned or completed classes. **`degree_requirements`** drives recommendation inputs. Additional PRD tables such as **`path_plans`** may be introduced as the recommendation flow matures.

Public **`users`** rows use the same `id` as **`auth.users`** (Supabase Auth). The catalog table is **`classes`** (referenced as `course_id` from planner and ratings code).

```mermaid
erDiagram
  USERS ||--o{ USER_COURSES : "enrollment"
  CLASSES ||--o{ USER_COURSES : "scheduled"
  USERS ||--o{ COURSE_RATINGS : "author"
  CLASSES ||--o{ COURSE_RATINGS : "subject"
  USERS ||--o{ FOLLOWS : "follower_id / following_id"
  DEGREE_REQUIREMENTS }o--|| CLASSES : "course_id"

  USERS {
    uuid id PK
    text email
    text name
    text university
    text major
    int year
    text visibility
  }

  CLASSES {
    uuid id PK
    text code
    text title
    int credits
    text department
  }

  USER_COURSES {
    uuid id PK
    uuid user_id FK
    uuid course_id FK
    text semester
    int year
    text status
    text grade
  }

  COURSE_RATINGS {
    uuid user_id FK
    uuid course_id FK
    int stars
    text review_text
  }

  FOLLOWS {
    uuid follower_id FK
    uuid following_id FK
    text status
  }

  DEGREE_REQUIREMENTS {
    text major
    uuid course_id FK
    int credits_needed
  }
```

**Security model (conceptual)**

- **Authentication**: Supabase Auth; JWT/session reflected in cookies.
- **Authorization**: **RLS** on tables so users read/write only what policies allow (e.g. own `user_courses`, public profile fields for explore, etc.). Policies live in Supabase, not in this repo’s diagrams.

---

## 4. Auth & session flow (simplified)

```mermaid
sequenceDiagram
  participant B as Browser
  participant N as Next.js
  participant A as Supabase Auth
  participant D as PostgreSQL

  B->>N: Visit protected route
  N->>A: getUser() / refresh session
  alt Not logged in
    N->>B: Redirect to /login
  else Logged in
    N->>D: Query via PostgREST (RLS applied)
    D-->>N: Rows allowed for user
    N-->>B: Render page
  end
```

---

## How to view these diagrams

- **GitHub / GitLab**: Mermaid renders in Markdown previews.
- **VS Code / Cursor**: Use a Mermaid preview extension, or paste into [mermaid.live](https://mermaid.live).

For setup and repo layout, see the [project README](../README.md).
