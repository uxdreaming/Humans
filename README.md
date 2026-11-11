# HUMANS

Life simulator and open-world 3D browser game centered on people, their stories, and the
consequences of the player's decisions.

## What is HUMANS?

HUMANS is an open-world 3D life-simulation browser game. The player starts by observing an
original fictional village, walks its streets, selects an inhabitant, follows them, learns
who they are, what they do, who they relate to, and what their goals are. Whenever they
want, they can **take control of that character and live their life from the inside**.

There is no single correct path and no mandatory story. The player decides how to live:
finding a partner, making friends, getting a better job, building contacts, traveling,
buying a house or a car, decorating, throwing parties, starting businesses, or pursuing
their own goals. Important decisions leave **persistent changes in the world** and can
affect later lives.

## Lives and freedom of choice

- Each new life offers a different person, story, and circumstances.
- Characters can age; when the controlled character dies, the player returns to observation
  mode and chooses another inhabitant for a new life.
- Played lives are recorded, along with **lessons, skills, or knowledge** that can carry
  over from one life to the next.
- Each life feels different because of the chosen person, their resources, relationships,
  and opportunities — not the same experience with a renamed character.

## Platform and architecture

- 3D web application in **pure HTML, CSS, and JavaScript**, runnable in a modern browser
  with WebGL. No build step: native ES modules.
- 3D engine: **Three.js**, stored inside the repo at `vendor/three/` (vendored), so the game
  runs without external runtime dependencies.
- Modular structure designed to grow:

  ```
  index.html            entry page + importmap (three -> vendor/three/three.module.js)
  css/style.css         HUD, panel and boot screen styles
  package.json          ES modules + scripts (serve / test), no dependencies
  js/
    main.js             entry point and game loop
    core/
      config.js         all tuning constants (world seed, 30x50 blocks, time scale...)
      rng.js            seeded deterministic RNG
      names.js          procedural name generator (people, streets, ads, cities)
      i18n.js           UI strings, Spanish (default) + English
    world/
      layout.js         pure world layout: block grid, streets, landmarks, names
      town.js           chunk-streamed 3D town (houses, roads, lamps, billboards)
      sky.js            day/night cycle: sun, moon, stars, fog, lamp lights
    npc/
      data.js           NPC definitions: identity, personality, schedule, relations
      agents.js         schedule-driven agents: movement, needs, mood (pure logic)
      characters.js     low-poly humanoid meshes + walk/sit animation
    player/
      camera.js         observation camera (free orbit + follow mode)
      picking.js        click-to-select NPC raycasting
    ui/
      hud.js            top bar: clock, time controls, quality, language, fullscreen
      panel.js          NPC inspector panel
  test/logic.test.mjs   Node tests for the pure modules (npm test)
  vendor/three/         vendored Three.js r160 (three.module.js + LICENSE)
  ```

- **No API keys or secrets in the client.** If an AI API is connected for conversations,
  calls and keys will live in a backend. Until then there will be a local demo mode that
  works without external services.
- Built with the future in mind: accounts, online saves, sync, and multiplayer will be
  studied later. Multiplayer will not be tackled before the single-player version is fun
  and stable.

## The village and its inhabitants

- The first game takes place in a **fictional, original village**, not copied from any real
  city. The long-term goal is around 400 inhabitants and several cities; it starts with a
  few test NPCs and systems ready to scale.
- Inhabitants have their own routines and lives: they go to work, rest, shop, stroll,
  chat, have coffee, form relationships, and react to events even when the player is not
  controlling them.
- Each important NPC has:
  - stable data: story, personality, values, occupation, skills, and goals;
  - current state: location, activity, mood, and needs;
  - relationships with other characters and memories of important events;
  - routines and places they frequent.
- The player can observe, select, follow, and inspect each NPC's profile, and then take
  control of that character.

### Agent architecture

1. Stable character data (story, personality, values, goals).
2. Current state (location, activity, needs, mood).
3. Relationships and memories.
4. Daily routines and decisions (game systems, **without** AI).
5. Conversations with the AI agent (only in dialogues and important situations).
6. Validation and application of consequences by the game.

The agent proposes responses or consequences, but **the game validates changes**: the agent
cannot arbitrarily modify money, items, relationships, or rules, and its responses must
respect the NPC's personality and memories.

## Conversation and voice

- Social interaction prioritizes the **microphone**, with the keyboard always available as a
  typing alternative. No fixed list of phrases: you can say "Hi, how are you?" or "May I
  sit here?" and the NPC responds according to the situation.
- Modular flow: 1) the player activates the microphone; 2) speech to text; 3) the text and
  context are given to the agent; 4) the agent generates a coherent reply; 5) the game
  shows it and, if available, plays it aloud; 6) the game validates and applies the
  consequences.
- The microphone only activates with an explicit player action, clearly shows when it is
  listening, and can be stopped at any time. If the microphone, speech recognition, or audio
  output is unavailable, there is a functional text alternative. No feature depends on a
  single service.

## Work, economy, and activities

- Work is playable and varied: for example, in a supermarket you can restock products,
  arrange shelves, serve customers, organize inventory, and handle shift situations.
- Arriving late, skipping work, or doing a good job makes the boss and coworkers react
  according to context and history, influencing trust, responsibilities, warnings, and job
  opportunities.
- Income, expenses, purchases, and inventory make sense inside the game; money does not
  appear for free. Later on: creating, buying, or managing businesses (supermarkets,
  factories) with costs, supplies, employees, customers, income, and community impact.
- Includes an **optional fictional lottery**, with visible cost and odds; never with real
  money and never as a requirement to progress.

## Relationships, phone, home, and parties

- Contacts in an in-game **phone**: relationships, messages, notices, invitations, and
  opportunities. NPCs can text or call on their own initiative.
- Buy or rent homes, buy and place furniture, decorate, and invite contacts.
- Organize meetings and parties, choosing when and whom to invite; what happens influences
  memories and relationships.

## Cars, travel, and fuel

- Buy, own, and use cars, with a cost and, later, condition, capacity, fuel consumption, and
  maintenance. Driving and traveling consume **fuel**, which costs money; there are gas
  stations and clear warnings, without tedious management.

## Day, night, and world continuity

- Visible day/night cycle: dawn, day, dusk, and night with stars. Lighting, sky, and
  atmosphere change, and the hour affects shop hours, activities, and NPC schedules.
- **1 game hour = 10 real minutes**, with options to pause and to speed up or slow down time.
- When the game is closed, the moment is saved; on return, the elapsed time is simulated in
  a controlled way (work, basic income, needs, preserved relationships) and summarized.
  No big expenses, moves, breakups, or irreversible changes without the player's
  authorization.

## Geographic progression (proposal; configurable requirements)

- **1st life:** starting village, no travel; the village is open within its limits, without
  rigid mission sequences.
- **From the 2nd life:** travel to other cities by gathering the money and meeting
  configurable requirements (not unlocked just by accumulating lives: skills, contacts, and
  decisions also matter).
- **From the 4th life:** metropolises and distant regions, with airports, ports, goods
  transport between cities, more neighborhoods, jobs, shops, and businesses.
- Cities are fictional and distinct from each other (neighborhoods, architecture, atmosphere,
  activities, jobs, and opportunities of their own). Travel shows duration and costs and
  uses vehicles or other means of transport.

## Heroes, villains, and secret identity

- After living at least four lives, a new life can start with inherited lessons; in it the
  character can develop **extraordinary powers** and choose to be a hero, a villain, or
  follow their own path, protecting their secret identity.
- Using powers can raise suspicion and affect relationships, jobs, and events, integrated
  with everyday life (needs, bonds, and personal decisions).

## Visual quality and controls

- Polished 3D game with a coherent art direction (world, characters, buildings, materials,
  lighting, and environments), without copying real cities.
- **Third-person** control and, when viable, switch to **first person**; fluid movement:
  walk, run, turn, stop, sit, talk, and use objects.
- NPCs with understandable movement and interactions; shadows, skies, lighting cycles, and
  environmental effects added gradually.
- Runs in a window and offers **fullscreen** on demand. Adjustable graphics quality to
  protect performance. A small, polished vertical slice is prioritized before expanding the
  map.

## Current status and staged plan

Actual repository status: Stage 0 (docs) and **Stage 1 (playable 3D village prototype)**
are implemented and tested; stages 2-7 are plan, not code.

| Stage | Description | Status |
|-------|-------------|--------|
| 0 | Project documentation | ✅ done |
| 1 | Visual village prototype: explorable 3D world, NPCs with routines and personalities, day/night cycle, observation mode (select/follow NPC) and character profile | ✅ done |
| 2 | First playable life: third-person control, game clock, playable supermarket job, boss/coworker reactions | ⏳ pending |
| 3 | Relationships, contacts, and memories; contextual text conversations; café scene; modular architecture for AI and voice; basic phone | ⏳ pending |
| 4 | Daily life: shopping, inventory, basic economy, housing and decoration, parties, save system and offline simulation, fictional lottery | ⏳ pending |
| 5 | Lives and persistent world: aging, death, new life, inheritable lessons, persistent consequences | ⏳ pending |
| 6 | Travel and expansion: cities from the 2nd life, metropolises from the 4th, cars and fuel, airports, ports, new jobs and businesses | ⏳ pending |
| 7 | Heroes/villains with secret identity after 4 lives, more cities, and preparation to study multiplayer | ⏳ pending |

## Working rules

- Inspect the project before editing; do not replace files without reading them first.
- Incremental work: each stage is finished and tested before expanding scope.
- Modular, documented, easy-to-extend code; always distinguish what is implemented from what
  is planned.
- Never API keys or secrets in the browser's HTML/JS or in public files.
- The core of the game is observing lives, choosing a person, talking to the inhabitants,
  living their story, and affecting the world — not a generic management demo.

## How to run

The game is a static web app (no build step). From the repository root:

```bash
npm run serve          # = python3 -m http.server 8000
# then open http://localhost:8000
```

Any static file server works (it will also be deployable as-is on static hosting).
Requirement: a modern browser with WebGL.

Run the logic tests (no browser needed):

```bash
npm test               # = node test/logic.test.mjs
```

### Stage 1 controls

- **Click an NPC** to open its inspector panel (identity, personality, occupation,
  current activity, location, mood, needs, goals, relationships).
- **Follow** button or **F**: camera follows the selected NPC. **Esc**: deselect / stop following.
- **WASD**: move the camera focus · **drag**: orbit · **wheel**: zoom.
- Top bar: **pause / 1x / 2x / 4x** time controls (1 game hour = 10 real minutes),
  **quality** (low/medium/high: shadows + pixel ratio), **ES/EN** language toggle,
  **fullscreen**.

### Stage 1 — implemented vs. known limitations

Implemented: procedural town of 30x50 blocks (seeded, always the same town) with plaza
and fountain, café, church, supermarket, park, bar, bakery and a bus stop; up to 4
houses/gardens per block (bigger houses filling the lot, pyramid and gable roofs,
chimneys, doors, windows that glow at night, fences around many lots, bushes, street
trees), streets with zebra crossings near the centre, parked cars plus moving traffic on
the central avenue, lamps and generated billboards; seeded name generator (people,
streets, billboards, city list; the starting town is generated too); 27 NPCs with
schedules, personalities, needs, moods, goals and relationships that live their routines
on their own — including nocturnal ones that are out at night (the game starts at 10:00
so most are already out); day/night cycle with sun, moon, stars, drifting clouds, fog,
street lamps and real point lights at the plaza/café/market/bar at night; an inhabitant
dropdown in the HUD that jumps the camera to any NPC, plus a pulsing marker over each
NPC; chunk streaming so only the visible area is rendered; observation mode with select +
follow + live inspector panel; bilingual UI (ES/EN); quality settings; fullscreen.

Known limitations (by design, next stages): NPCs walk but don't yet talk (Stage 3), there
is no "take control" of a character yet (Stage 2 — the button is visible but disabled),
no saving/offline simulation yet (Stage 4), cars are parked/traffic only — no drivable
car or travel yet (Stage 6), population is 27 of the planned 400, and only the chunks
around the camera are rendered.

## Deployment

The long-term goal is to publish the game so other people can play it. A hosting platform
called "Homestinger" has been mentioned; its correct name and requirements have **not** been
confirmed yet, so no compatibility with any specific platform is claimed here. Since it is
a static web app (HTML/CSS/JS, no mandatory backend), any static file hosting with HTTPS is
a candidate; when deployment time comes, the actual requirements of the chosen provider
(probably Hostinger) will be verified before announcing it.

## License

MIT — see [LICENSE](LICENSE).
