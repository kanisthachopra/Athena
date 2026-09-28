# MIRA

MIRA is a calm, parent-first learning companion for families with young children. It protects relationships, autonomy, play, and family capacity while helping parents notice and shape rich learning across ordinary life.

This repository currently implements **Milestones 1–13**: secure family onboarding, a low-pressure weekly opportunity portfolio, transparent deterministic adaptation, flexible planning, persistent multi-child support, role-aware shared caregiving, family-controlled profile data, an everyday learning journal, editable observations, and the source-grounded capability, enrichment, safety, provenance, and Parent Mode foundations.

## What is working

- Responsive MIRA landing page
- Supabase email/password authentication
- Atomic family + first-child onboarding
- A persisted, personalized Today view
- A family learning profile with rhythm, languages, and aspirations
- Weekly portfolios that combine intentional invitations, embedded moments, communication, and protected open time
- Parent Mode guidance with preparation, adult role, support ladder, autonomy, adaptations, stop signals, and safety
- A learning-insights journal that treats observations as signals rather than scores
- Deterministic next-week adaptation with visible selection reasons
- A secondary idea shelf filtered by age, family time ceiling, and screen approach
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
- Caregiver-recorded everyday learning moments alongside planned-activity observations
- Role-aware deletion and JSON export of spontaneous learning notes
- Faithful editing of family rhythm, child hopes, languages, and primary caregiver details
- Stable current-week plans when profile preferences change
- Caregiver-controlled day changes with safe activity swapping inside a weekly plan
- Child-specific saved ideas with a filtered library and full standalone activity guides
- Saved activities included in authenticated family exports
- Completed observations can be reopened and corrected without creating duplicates
- Viewers can read saved feedback while caregivers retain edit control
- Nine core capabilities kept separate from fourteen optional enrichment tracks
- Versioned activity content, hazard taxonomy, and an evidence-claim registry that stays empty until sources are reviewed
- A Family Education Constitution schema that puts protected conditions above aspirations
- Auditable portfolio types, parent-effort estimates, recent-exposure balancing, and visible selection reasons
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

The deterministic learning loop and shared household model now work end to end. The next deterministic work is to make the Family Education Constitution and household constraints editable, audit seed coverage, and strengthen planner tests. Only then should AI help with linguistic extraction, reflection, or bounded selection; it must remain constrained by deterministic eligibility and explicit caregiver control.

Development is governed by the source-grounded [MIRA product specification](docs/MIRA_PRODUCT_SPEC.md). The [current-state audit](docs/CURRENT_STATE_AUDIT.md) identifies prototype drift, and the [development roadmap](docs/DEVELOPMENT_ROADMAP.md) defines the corrected path from deterministic foundations to bounded AI.
