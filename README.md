# MIRA

MIRA is a calm, parent-first learning companion for families with young children. It turns everyday moments into age-aware learning invitations and will eventually adapt weekly plans from parent observations, family priorities, languages, and a reviewed activity library.

This repository currently implements **Milestone 1**:

> Sign up → create a family → add a child → reload → the child still exists → another account cannot access that child.

## What is working

- Responsive MIRA landing page
- Supabase email/password authentication
- Atomic family + first-child onboarding
- A persisted, personalized Today view
- PostgreSQL Row Level Security for `families`, `family_members`, and `children`
- Server-side auth and data access through `@supabase/ssr`

AI is intentionally not part of this milestone. Authentication, persistence, age calculation, and access control are ordinary deterministic software.

## Run locally

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and enter the project URL and publishable key:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. In the Supabase SQL Editor, run the complete migration at:

   `supabase/migrations/202609270001_initial_family_setup.sql`

4. In Supabase Authentication, set the Site URL to `http://localhost:3000`. For hosted environments, add the production URL to Redirect URLs as well.
5. Start the app:

   ```bash
   npm run dev
   ```

Then open [http://localhost:3000](http://localhost:3000).

## Verify family isolation

1. Create account A, create a family and child, then confirm the Today page survives a refresh.
2. Log out and create account B.
3. Account B should be sent to its own onboarding page and must not see account A's family or child.
4. The guarantee is enforced by database policies, not just hidden UI.

## Useful commands

```bash
npm run dev
npm run lint
npm run build
```

## Product direction

The next milestone expands the persisted skeleton with family preferences, aspirations, caregivers and languages, a small reviewed activity library, weekly plans, and quick parent feedback. AI should only enter after that loop works deterministically.
