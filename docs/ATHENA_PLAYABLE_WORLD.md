# Athena playable world — 8 October 2026

## Second pass — owner-approved direction, richer world and motion

The owner explicitly accepted the explorable world direction and requested further craft. This pass keeps that interaction model and refines the same route. It does not promote the unfinished voice/search prototype to production.

| Before | After | Why |
| --- | --- | --- |
| High, distant camera | Closer third-person composition, with a wider-view toggle | Makes the adult avatar central while preserving orientation |
| Angular box architecture and flat pyramid roofs | Shared beveled geometry, pitched tiled roofs, gables, shutters, corner trim, wood/plaster bump detail and tone-mapped lighting | More tactile stylized realism without photoreal assets |
| Limbs rotating at their centers; instant turns | Shoulder/hip pivots, acceleration, damped turning, settling limbs and subtle gait weight | More natural walking and stopping |
| Static surroundings | Two rabbits, two ducks, three butterflies, foliage breeze, pond ripples and companion motion | A visibly inhabited village; decorative and never a task requirement |
| Plain overlay bars | Rounded dimensional buttons, destination icon dock, compact location badge and daily card | A cohesive game interface with clearer hierarchy |

Motion: continuous Three.js simulation for spatial gameplay and explicitly requested wildlife; CSS transform/opacity feedback at 100–160ms and pointer-triggered dialog entry at 220ms using `cubic-bezier(.23,1,.32,1)`. Keyboard UI transitions are disabled. OS reduced motion freezes wildlife/breeze and removes gait/interpolation. A visible Pause wildlife control freezes the ambient simulation; user movement still works. No additional animation library or third-party assets introduced.

Performance: shared box geometries, simpler meshes for tiny props, pixel ratio capped at 1.5, render loop capped at 30 fps, shadows refreshed at most 10 fps, hidden-document render skipped, scene resources disposed on mode changes. These are implemented controls, not measured performance guarantees. A browser session interruption occurred during verification; reconnected to the same in-app browser after its ID changed. Do not attribute that interruption conclusively to rendering.

Verification for this pass: navigation regression test passed; standalone TypeScript and scoped ESLint passed; production webpack build passed (existing metadataBase warning only). In-browser checked close/wide toggle, wildlife pause/resume including mobile, walking to Movement Garden, entry, Sam approach/dialogue, Escape and exit. At 390px and 320px document width equaled scroll width; mobile controls remained accessible. Console capture after the revised world loaded had no errors/warnings. Physical touch hardware, sustained frame-rate benchmarks and an OS reduced-motion test remain unverified. Screenshots: `polished-world.jpg`, `polished-sam.jpg`, `polished-mobile.jpg` in `docs/athena-preview/`.

The following sections record the initial slice and its original evidence; later camera/material/motion refinements supersede their visual descriptions.

Owner-directed replacement for the static immersive interpretation. Preview: `/auth/prototypes/athena-world`. This is an isolated playable slice, not an approved final art direction or a completed Athena integration.

## What works

- Entry choice between immersive world and focused day. Both use the same temporary plan focus, accepted route choice and saved collection flag. Switching modes preserves those choices; reloading resets them.
- Actual rendered 3D space, not a background image: a parent avatar, following Athena starfish, terrain, paths, trees, pond, five physical buildings, furniture and guides.
- WASD/arrows, held on-screen direction buttons and click/tap-to-walk. Destination controls navigate through the scene using bounded grid A*. Building footprints and pond block traversal; decorative props are not all colliders.
- Proximity-based entry and interaction, furnished interior, physical NPC and dialogue. All five destinations are reachable by the navigation solver. Sam encounter and room transition observed in the browser.
- Daily board focus, explicit alternate-format acceptance and reversal; source collection save/remove; genuine UNICEF collection link. The cover is a typographic source label, not a claimed screenshot or resource thumbnail.
- Focused mode uses a paper daily plan and direct destination directory. It avoids downloading/starting the 3D engine until immersive mode is selected.

## Craft review

| Before | After | Why |
| --- | --- | --- |
| Single town image with hotspots | Mesh world with camera-follow movement, obstacles and enterable spaces | Implements the owner's literal exploration requirement |
| Guide as only a panel label | Physical NPC encountered inside a furnished room | Makes interaction spatial and intentional |
| One interpretation of gamification | Two entry modes with shared temporary state | Supports parents who want exploration or efficiency |
| Generic dashboard access | Paper plan, destination seals, serif headings and warm material palette | A distinct efficient direction for evaluation |

Applied Emil design-engineering, motion, mobile and break-UI guidance. The user's two-mode direction replaces the prior three-way layout comparison for this slice. React review: heavy engine imported on demand, one lifecycle with cleanup, no per-frame React position updates, effect dependencies stable, native dialog focus/Escape, no provider calls. Continuous rendering is essential to the playable world; reduced motion removes gait animation and camera/follower interpolation. Physical-device performance and reduced-motion behavior have not been verified.

## Executed verification

- `node scripts/test-athena-world.mjs`: PASS. Reachability for all five approaches; obstacle detour; blocked target; enclosed start; no diagonal corner cutting.
- `node node_modules/typescript/bin/tsc --noEmit`: exit 0.
- Scoped ESLint for the new route and test: exit 0.
- `npm run build -- --webpack`: exit 0, with the existing metadataBase warning. No deployment.
- Browser: choose immersive, route to Movement Garden, enter, walk to Sam, open conversation, show collection, save, open plan, choose shorter reading, close with Escape and switch to focused. Focused mode showed accepted route and saved collection. Returned to immersive and used the daily board.
- 390px focused and immersive, 320px immersive: measured document width equals scroll width. Tap-to-walk observed changing to walking state. This is desktop viewport testing, not real touch-device certification.
- Fixed a current Three.js shadow-map deprecation found in the console, and a literal line-break rendering bug found in the focused heading. Final screenshots are in `docs/athena-preview/`: `playable-world.jpg`, `sam-encounter.jpg`, `focused-world-alternative.jpg`, `focused-mobile.jpg`, `playable-mobile.jpg`, `world-entry.jpg`.

## Boundaries and follow-through

Dialogue is explicitly scripted. Deepgram, live resource search, age-specific recommendations, real thumbnails, reading/video playback and durable family plans are not connected in this slice. No voice capture, inference or save to a real family record occurs. Native browser WebGL failure offers focused mode; this branch is code-inspected, not fault-injection tested. Keyboard/touch hardware, long-running GPU load, 200% zoom and screen-reader experience still require testing. Some decorative objects have no collision, all interiors share a base room and mode switching resets avatar position. These are visible prototype limits, not finished-game claims.

Next bounded milestone: owner evaluates world/character/control direction, followed by a polished resource-room slice with real resource contracts and authorized voice/search integration. The existing broad G0 reset audit remains incomplete; this isolated owner-requested prototype does not bypass production gates.

## Dependency and source notes

Added `three` 0.186.1 and `@types/three` 0.186.0 from npm, preserving existing stack and prior uncommitted work. Geometry and material textures authored in code; no Roblox/Minecraft assets or third-party game models copied. Three.js is MIT licensed (notice in installed package). Official [renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html) and [raycasting documentation](https://threejs.org/docs/pages/Raycaster.html) consulted. Renderer requires WebGL2. Install reported 12 audit findings in the overall dependency tree (2 moderate, 10 high); no broad or forced dependency upgrades were attempted, and this is not a security-audit completion claim.
