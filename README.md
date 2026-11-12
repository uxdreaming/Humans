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
  css/style.css         HUD, panel, chat, boot screen styles
  package.json          ES modules + scripts (serve / test), no dependencies
  serve.py / play.sh / stop.sh / HUMANS.desktop   dev server + double-click launchers
  js/
    main.js             entry point, game loop, interaction wiring (E key), self-test hooks
    core/
      config.js         all tuning constants (world seed, 60x80 blocks, time scale...)
      rng.js            seeded deterministic RNG
      names.js          procedural name generator (people, streets, ads, cities)
      i18n.js           UI strings, Spanish (default) + English
      unlocks.js        achievement/unlock definitions and checks
    world/
      layout.js         pure world layout: block grid, streets, landmarks, cars, stations
      textures.js       procedural canvas textures (noise, signs, price tags)
      town.js           chunk-streamed 3D mini-city (houses, landmarks, lamps, traffic)
      sky.js            day/night cycle: sun, moon, stars, clouds, fog
      cars.js           car meshes + drivable CarEntity (fuel, price)
      interiorSpecs.js  pure enterable-room data (sizes, furniture, collision)
      interior.js       builds the enterable rooms (one per building kind, off-map)
    npc/
      data.js           NPC definitions: identity, personality, schedule, relations
      agents.js         schedule-driven agents: movement, needs, mood (pure logic)
      work.js           work/economy state: shifts, lateness, salary, tasks (pure)
      characters.js     low-poly humanoid meshes + walk/sit/chat poses
    player/
      camera.js         cameras: free / follow / control / drive / interior
      picking.js        click-to-select NPC raycasting
    ai/
      dialogue.js       rule-based contextual dialogue engine (ES/EN, local demo mode)
      voice.js          microphone (Web Speech API) + spoken replies (speechSynthesis)
    ui/
      hud.js            top bar: clock, time controls, quality, language, fullscreen
      panel.js          NPC inspector panel (follow / take control / talk)
      start.js          start screen with searchable NPC list
      chat.js           chat panel: text input + mic button + listening badge
      work.js           work bar (task, progress, money, approval, salary)
      toast.js          transient notifications
  test/                 Node tests for the pure modules (npm test)
  vendor/three/         vendored Three.js r160 (+ bloom postprocessing + LICENSE)
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

**Implemented in v0.6.0 (local demo mode, no external service):** press **E next to an NPC**
(or the Talk button in its panel) while controlling a character to open the chat. Type
freely, or press the mic button to talk with your voice — recognition only runs while the
button is on (a red "listening" badge is shown) and the recognized text is sent as a
message. Replies come from the rule-based engine `js/ai/dialogue.js` (greetings, mood,
work, name, help, romance by relationship strength, insults, farewells, personality-based
fallbacks) in ES/EN, are shown in the chat, spoken aloud via `speechSynthesis` when
available, and their relationship deltas are applied by the game. No API keys in the
client; an external AI backend can later be plugged into `js/ai/`.

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

Actual repository status: Stage 0 (docs), **Stage 1 (playable 3D village prototype)**,
**Stage 2 (first playable life: control an NPC + playable job, money, cars, unlocks)** and
the first part of **Stage 3 (contextual conversations by text and voice + enterable
buildings)** are implemented and tested (current build **v0.7.0**); the rest of stages
3-7 is plan, not code.

| Stage | Description | Status |
|-------|-------------|--------|
| 0 | Project documentation | ✅ done |
| 1 | Visual village prototype: explorable 3D world, NPCs with routines and personalities, day/night cycle, observation mode (select/follow NPC) and character profile | ✅ done |
| 2 | First playable life: start screen with NPC search (pick a life to play, or observe), third-person control (V = first person), game clock, playable job at supermarket/cafe/bar/school/town hall (4 task types with E), lateness/abandonment and boss approval, money and salary, hunger slows work; plus drivable/buyable cars with fuel and gas station, bus pass, unlock system (promotion, car discount), mini-city map 60x80 with plazas/town hall/school, bloom + procedural textures | ✅ done |
| 3 | Relationships and memories; contextual conversations (free text + microphone voice with visible listening state, spoken replies; local rule-based demo mode, no API keys); enterable buildings/homes (interiors); relationship strength changes with what you say; café table scene; modular AI architecture; basic phone | 🟡 v0.6.0: chat + voice + interiors done; café scene and phone pending |
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
npm run serve          # = python3 serve.py 8000  (dev server with no-store cache headers)
# then open http://localhost:8000
```

**No terminal needed (Linux desktop):** double-click `play.sh` in the file
manager — it starts the server in the background and opens the game in your
browser. `stop.sh` stops the server. `HUMANS.desktop` is a ready-made desktop
launcher (edit the `Exec=` path if you cloned the repo somewhere other than
`/home/aru/Humans`, then copy it to your Desktop and double-click once, choosing
"Allow launching" if asked). Opening `index.html` directly via `file://` does
**not** work (browsers block ES modules there) — always use `play.sh` / a server.

Tip: the HUD shows the build version (e.g. `HUMANS v0.7.0`) and the population
(e.g. `46/400`) — if you ever see old numbers, hard-reload with **Ctrl+Shift+R**;
`serve.py` already sends `no-store` so a normal reload is enough.

Any static file server works (it will also be deployable as-is on static hosting).
Requirement: a modern browser with WebGL.

Run the logic tests (no browser needed):

```bash
npm test               # = logic + work + dialogue + interior tests (pure modules, no browser)
```

### Controls

Observation mode:
- **Click an NPC** (or pick it in the **inhabitants dropdown**) to open its inspector
  panel (identity, personality, occupation, activity, location, mood, needs, money,
  boss approval, goals, relationships) and jump the camera to it.
- **Follow** button or **F**: camera follows the selected NPC. **Esc**: deselect.
- **WASD**: move the camera focus · **drag**: orbit · **wheel**: zoom.

Starting the game: a **start screen with a searchable NPC list** appears over the live
town (search by name, job or trait). Click **Play as …** to start that life in control
mode, or **Just watch the town** to observe. The clock stays paused until you choose.

Playing a life (stage 2):
- In the NPC panel, **Take control** to play that person (GTA-style): **WASD** move,
  **Shift** run (camera follows you), **Space** jump, **drag** orbit camera, **V**
  first/third person, **Esc** or **Release control** to go back to observation.
  **N** jumps to the nearest NPC. A controls toast appears when you take control.
- If that NPC works and you are on shift there, a work bar appears: go to a station
  (shelves / counter / storage / cleaning zone) and press **E** repeatedly to do the
  task (restock, serve, organize, clean). Tasks pay money and raise boss approval;
  arriving 25+ min late lowers it. Salary is paid per worked hour when the shift ends.

Talking and entering places (v0.6.0+, works while controlling AND while observing):
- Stand next to an NPC and press **E** (or the Talk button in its panel) to open the
  chat: type freely or use the **mic button** to speak (it only records while on; a red
  badge shows "listening"). Replies appear in the chat and are spoken aloud when the
  browser supports it. What you say changes the relationship: greetings and offers of
  help raise it, insults lower it, romance only works at high relationship.
- Stand in front of a building (cafe, supermarket, bar, bakery, church, gas station,
  town hall, school) or a house/apartment door and press **E** to **go inside**; walk
  with WASD and press **E** again to go out.
- Cars: next to a parked car, **E** buys it (if you have the money) and gets you in;
  drive with WASD, watch the fuel gauge, **E** gets you out. At the gas station press
  **R** near your car to refuel (20€). With the bus pass unlock, **E** at the bus stop
  travels to the plaza (2€).

Top bar (always): **pause / 1x / 2x / 4x** time controls (1 game hour = 10 real
minutes), **quality** (low/medium/high: shadows + pixel ratio), **ES/EN** language
toggle, **fullscreen**.

### Current build (v0.7.0) — implemented vs. known limitations

v0.7.0 fixes and upgrades: correct roofs on every house (hip pyramids and gable prisms
aligned to each footprint with overhang, flat slabs on apartment blocks — unit-tested
in `test/roof.test.mjs` and verified with a rendered check), zebra crossings that stay
inside the streets instead of touching the plaza, glowing neon shop signs on central
facades, planters / hydrants / flower beds, wider color and size variety per block,
smoother capsule-limb characters (shoes, neck, hair, deterministic hats), **Space to
jump** (GTA-style), conversations available **also while observing** (E near the camera
focus, or the Talk button in the panel), and a full premium UI redesign (glass HUD with
chips, animated start screen with controls summary, inspector panel with avatar, chat
panel with mic button).

Implemented: seeded procedural **mini-city of 60x80 blocks** (always the same city) with 11
landmarks — main plaza (fountain, string lights, stalls), market square, cafe, church,
supermarket, park, bar, bakery, bus stop, gas station, town hall and school — plus hills,
birds, street-name signs, zebra crossings, lamps and generated billboards; up to 4
houses/apartments/gardens per block with gable and pyramid roofs, chimneys, colored doors,
windows that glow at night and fences; **46 NPCs** with full-day schedules (including
nocturnal ones), personalities, needs, moods, goals and relationships, who live their
routines on their own and chat in pairs; day/night cycle with sun, moon, stars, drifting
clouds, fog and real point lights at night; chunk streaming around the camera; noise
textures on ground/roads/walls, ACES tone mapping, **bloom post-processing** and a
cinematic vignette; observation mode (click / dropdown / **N** nearest, follow with **F**,
live inspector panel); start screen with a searchable NPC list ("Play as" starts that
life); third-person control with acceleration-based movement (**V** = first person);
playable work shifts at supermarket/cafe/bar/school/town hall with 4 task types, lateness
and abandonment penalties, boss approval, per-task money and salary at shift end; an
**unlock system** (promotion = +50% salary at approval 80+, car discount -30% after 15
tasks, bus pass at 100€ = E at the bus stop travels to the plaza for 2€); **drivable and
buyable cars** (150/260/420€) with fuel consumption and refueling at the gas station
(R, 20€); **contextual conversations** in a chat panel — free text or **microphone voice**
(explicit mic button, visible listening badge, spoken replies via TTS) answered by a
rule-based ES/EN dialogue engine that uses mood, job, place, relationship strength and
personality, with relationship deltas validated and applied by the game; **enterable
interiors** for every building kind and for houses/apartments (E at the door enters, WASD
inside, E exits) with furniture, warm lighting and collision; bilingual UI (ES/EN),
quality settings (low/medium/high), fullscreen; dev server with no-store headers plus
`play.sh` / `stop.sh` / `HUMANS.desktop` launchers; URL params for debugging and weak
machines (`?q=low`, `?chunks=N`, `?selftest=1`, `?noframe=1`).

Known limitations (by design, next stages): no save/offline simulation yet (money,
approval and relationships are session-only); the phone/contact list and the cafe table
scene are not in yet; no shopping inventory, home decoration, parties or lottery yet;
conversations are a local rule-based demo mode — no external AI backend yet (planned, with
API keys only in a backend, never in the browser); no aging/death/multiple lives yet;
travel is limited to the bus-pass hop inside the same town (other cities come with the 2nd
life); population is 46 of the planned 400; weather and seasons are not in yet.

### Economy — how long does it take to earn X?

Time: 1 game hour = 10 real minutes at 1x speed (pause / 1x / 2x / 4x in the top bar).
Salaries per worked game hour: supermarket 8€, cafe 10€, bar 9€, school 9€, town hall
12€. Every completed task also pays +2€ instantly.

Examples at the supermarket (8€/h):
- 100€ (bus pass unlock): ~12.5 worked game hours ≈ **2 h 05 min real** at 1x.
- 150€ (cheapest car): ~19 worked game hours ≈ **3 h 10 min real** at 1x; with the
  promotion unlock (12€/h) it drops to ~12.5 hours ≈ **2 h 05 min real**.
- Tasks speed this up: every 4 presses of E at a station = one task = +2€.
- Refueling a full tank costs 20€; the bus pass hops to the plaza for 2€.
- With the car discount unlock (15 tasks done), the cheapest car costs 105€.
## Deployment

The long-term goal is to publish the game so other people can play it. A hosting platform
called "Homestinger" has been mentioned; its correct name and requirements have **not** been
confirmed yet, so no compatibility with any specific platform is claimed here. Since it is
a static web app (HTML/CSS/JS, no mandatory backend), any static file hosting with HTTPS is
a candidate; when deployment time comes, the actual requirements of the chosen provider
(probably Hostinger) will be verified before announcing it.

## License

MIT — see [LICENSE](LICENSE).
