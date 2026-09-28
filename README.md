# MIRA

MIRA is a calm, parent-first learning companion for families with young children. It turns everyday moments into age-aware learning invitations and will eventually adapt weekly plans from parent observations, family priorities, languages, and a reviewed activity library.

This repository currently implements **Milestones 1–7**: secure family onboarding, a reviewed weekly learning loop, transparent adaptation, flexible planning, persistent multi-child support, role-aware shared caregiving, and family-controlled profile data.

## What is working

- Responsive MIRA landing page
- Supabase email/password authentication
- Atomic family + first-child onboarding
- A persisted, personalized Today view
- A family learning profile with rhythm, languages, and aspirations
- Seven-day plans drawn from a reviewed, age-aware activity library
- Activity guidance, safety notes, and quick caregiver feedback
- A learning-insights journal that treats observations as signals rather than scores
- Deterministic next-week adaptation with visible selection reasons
- An age-filtered reviewed activity library
- Caregiver-controlled activity swaps and penalty-free skipping
- Mobile navigation for the complete learning loop
- A Family workspace with secure additional-child creation
- Persistent active-child selection across Today, Week, Library, Insights, and Profile
- Email-specific, expiring invitation links for trusted family members
- Caregiver and read-only viewer roles with database-enforced permissions
- Owner controls for revoking invitations and removing family members
- Editable family and child profile details
- Reversible child-profile archiving that preserves learning history
- Authenticated JSON exports of a child's profile, plans, activities, and observations
- PostgreSQL Row Level Security across family, planning, and observation data
- Server-side auth and data access through `@supabase/ssr`

AI is intentionally not part of these milestones. Authentication, persistence, planning, adaptation, and access control are ordinary deterministic software.

## Run locally

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and enter the project URL and publishable key:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. In the Supabase SQL Editor, run the migrations in filename order from `supabase/migrations/`.

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

The deterministic learning loop and shared household model now work end to end. A future AI layer can help phrase reflections or suggest reviewed variations, but it must remain bounded by family preferences, the curated activity library, and explicit caregiver control.
