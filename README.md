# Gradly

**Gradly** is a social academic planning web app for college students. It combines multi-semester course planning, path recommendations, and a social layer (exploring peers, shared schedules, and class reviews) so students can plan degrees with less guesswork.

Product goals and scope are documented in [`PRD.md`](PRD.md). Sprint planning notes live in [`SCHEDULE.md`](SCHEDULE.md). **Architecture diagrams** (platform, Next.js layers, database ER model, auth flow) are in [`docs/architecture.md`](docs/architecture.md).

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) |
| UI | React 19, [Tailwind CSS](https://tailwindcss.com) 4 |
| Backend & auth | [Supabase](https://supabase.com) (PostgreSQL, Auth, SSR cookie helpers via `@supabase/ssr`) |
| Client state / UX | [Zustand](https://github.com/pmndrs/zustand), [Framer Motion](https://www.framer.com/motion/), [react-hot-toast](https://react-hot-toast.com) |

The runnable application lives under **`gradly/`**.

## Getting started

From the repo root:

```bash
cd gradly
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `gradly/.env.local` with your Supabase project values (used by `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Scripts (`gradly/package.json`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Repository layout

High-level map of this repo (files omitted inside leaf folders where the pattern is obvious):

```text
Gradly v3/
├── PRD.md                    # Product requirements
├── SCHEDULE.md               # MVP sprint schedule
├── gradly/                   # Main Next.js application
│   ├── public/               # Static assets (images, favicon)
│   ├── src/
│   │   ├── app/              # App Router routes & UI
│   │   │   ├── layout.tsx    # Root layout, fonts, global shell
│   │   │   ├── page.tsx      # Home / dashboard entry
│   │   │   ├── globals.css
│   │   │   ├── DashboardClient.tsx
│   │   │   ├── login/        # Auth UI
│   │   │   ├── auth/         # e.g. callback, signout routes
│   │   │   ├── profile/      # User profile & server actions
│   │   │   ├── planning/     # Planner, recommendations
│   │   │   │   └── recommend/
│   │   │   ├── explore/      # Discover peers & schedules
│   │   │   │   └── [userId]/
│   │   │   │       └── schedule/
│   │   │   └── classes/
│   │   │       └── [courseId]/  # Course detail, reviews
│   │   ├── components/       # Shared client components (e.g. layout chrome)
│   │   ├── lib/
│   │   │   ├── supabase/     # Browser & server Supabase clients
│   │   │   └── utils/        # Planning, pathfinding, semesters, etc.
│   │   └── proxy.ts          # Supabase session refresh & route protection (middleware-style)
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
└── template/                 # Lightweight Next.js scaffold (reference / experiments)
    └── app/                  # Pages: home, dashboard, explore, planning, profile
```

## Feature map (by route area)

- **`/`** — Dashboard shell and overview (`DashboardClient`).
- **`/planning`** — Semester planning UI; **`/planning/recommend`** — path recommendation flow.
- **`/explore`** — Browse users; **`/explore/[userId]`** — profile and connections; nested **`schedule`** for viewing/copying peer schedules.
- **`/profile`** — Edit profile (backed by server actions in `profile/actions.ts`).
- **`/classes/[courseId]`** — Course information and review submission (`ClassInfoClient`, `ReviewForm*`).
- **`/login`** — Sign-in; **`/auth/*`** — OAuth callback and sign-out.

## License

Private project (`gradly/package.json` marks the package as private).
