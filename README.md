# HUMANS

Simulador de vida y mundo abierto en 3D para navegador, centrado en las personas, sus
historias y las consecuencias de las decisiones del jugador.

Life simulator and open-world 3D browser game centered on people, their stories, and the
consequences of the player's decisions.

---

# Versión en español

## ¿Qué es HUMANS?

HUMANS es un videojuego web 3D de mundo abierto y simulación de vida. El jugador empieza
observando un pueblo ficticio y original, recorre sus calles, selecciona a un habitante,
lo sigue, conoce quién es, qué hace, con quién se relaciona y cuáles son sus objetivos.
Cuando quiere, puede **tomar el control de ese personaje y vivir su vida desde dentro**.

No existe un único camino correcto ni una historia obligatoria. El jugador decide cómo
vivir: buscar pareja, hacer amistades, conseguir un trabajo mejor, crear contactos, viajar,
comprar una casa o un coche, decorar, organizar fiestas, crear negocios o dedicarse a sus
propios objetivos. Las decisiones importantes dejan **cambios persistentes en el mundo** y
pueden afectar a vidas posteriores.

## Vidas y libertad de elección

- Cada nueva vida ofrece una persona, una historia y unas circunstancias distintas.
- Los personajes pueden envejecer; cuando muere el personaje controlado, el jugador vuelve
  al modo de observación y elige a otro habitante para vivir una nueva vida.
- Se registran las vidas jugadas y los **aprendizajes, habilidades o conocimientos** que
  pueden pasar de una vida a otra.
- Cada vida se siente distinta por la persona elegida, sus recursos, sus relaciones y sus
  oportunidades, sin repetir la misma experiencia con un personaje renombrado.

## Plataforma y arquitectura

- Aplicación web 3D con **HTML, CSS y JavaScript puros**, ejecutable en un navegador moderno
  con WebGL. Sin paso de build: módulos ES nativos.
- Motor 3D: **Three.js**, guardado dentro del repo en `vendor/three/` (vendored), para que
  el juego funcione sin dependencias externas en tiempo de ejecución.
- Estructura modular pensada para crecer:

  ```
  index.html
  css/style.css
  js/
    main.js       punto de entrada y game loop
    core/         estado del juego, reloj, guardado local, eventos del mundo
    world/        generación del pueblo, edificios, naturaleza, iluminación
    npc/          datos de personajes, estado, rutinas, relaciones, recuerdos
    player/       cámara de observación, selección/seguimiento, control 1ª/3ª persona
    ui/           HUD, ficha del NPC, menús, calidad gráfica, pantalla completa
    time/         ciclo de día/noche (1 hora de juego = 10 minutos reales)
    ai/           módulo de conversación (demo local primero; backend con IA después)
  vendor/three/   motor 3D vendored
  ```

- **Sin claves API ni secretos en el cliente.** Si se conecta una API de IA para las
  conversaciones, las llamadas y las claves vivirán en un backend. Hasta entonces habrá un
  modo de demostración local que funciona sin servicios externos.
- Pensado para el futuro: cuentas, guardado en línea, sincronización y multijugador se
  estudiarán más adelante. El multijugador no se abordará antes de que la versión
  individual sea divertida y estable.

## El pueblo y sus habitantes

- La primera partida transcurre en un **pueblo ficticio y original**, no copiado de ninguna
  ciudad real. El objetivo a largo plazo es llegar a unos 400 habitantes y varias ciudades;
  se empieza con pocos NPC de prueba y sistemas preparados para ampliarse.
- Los habitantes tienen rutinas y vidas propias: van al trabajo, descansan, compran,
  pasean, conversan, toman café, crean relaciones y reaccionan a acontecimientos aunque el
  jugador no los esté controlando.
- Cada NPC importante tiene:
  - datos estables: historia, personalidad, valores, ocupación, habilidades y metas;
  - estado actual: ubicación, actividad, ánimo y necesidades;
  - relaciones con otros personajes y recuerdos de acontecimientos importantes;
  - rutinas y lugares que frecuenta.
- El jugador puede observar, seleccionar, seguir y consultar la ficha de cada NPC, y después
  tomar el control de ese personaje.

### Arquitectura de los agentes

1. Datos estables del personaje (historia, personalidad, valores, metas).
2. Estado actual (ubicación, actividad, necesidades, ánimo).
3. Relaciones y recuerdos.
4. Rutinas y decisiones cotidianas (sistemas del juego, **sin** IA).
5. Conversaciones con el agente de IA (solo en diálogos y situaciones importantes).
6. Validación y aplicación de consecuencias por el juego.

El agente propone respuestas o consecuencias, pero **el juego valida los cambios**: el
agente no puede modificar arbitrariamente dinero, objetos, relaciones o reglas, y sus
respuestas deben respetar la personalidad y los recuerdos del NPC.

## Conversación y voz

- La interacción social prioriza el **micrófono**, con el teclado siempre disponible como
  alternativa para escribir. No se quiere una lista fija de frases: se puede decir «Hola,
  ¿cómo estás?» o «¿Puedo sentarme?» y el NPC responde según la situación.
- Flujo modular por partes: 1) el jugador activa el micrófono; 2) voz a texto; 3) el texto
  y el contexto se entregan al agente; 4) el agente genera una respuesta coherente; 5) el
  juego la muestra y, si hay, la reproduce en voz; 6) el juego valida y aplica las
  consecuencias.
- El micrófono solo se activa con una acción explícita del jugador, se muestra claramente
  cuándo está escuchando y se puede detener en cualquier momento. Si el micrófono, el
  reconocimiento de voz o el audio no están disponibles, hay una alternativa funcional por
  texto. Ninguna función depende de un único servicio.

## Trabajo, economía y actividades

- El trabajo es jugable y variado: por ejemplo, en un supermercado se puede reponer
  productos, ordenar estantes, atender clientes, organizar inventario y resolver
  situaciones del turno.
- Llegar tarde, faltar o trabajar bien hace reaccionar al jefe y a los compañeros según el
  contexto y el historial, lo que influye en confianza, responsabilidades, advertencias y
  oportunidades laborales.
- Ingresos, gastos, compras e inventario tienen sentido dentro del juego; el dinero no
  aparece gratis. Más adelante: crear, comprar o gestionar negocios (supermercados,
  fábricas) con costes, suministros, empleados, clientes, ingresos y efectos en la comunidad.
- Incluye **lotería ficticia y opcional**, con coste y probabilidades visibles; nunca con
  dinero real ni como requisito para progresar.

## Relaciones, celular, hogar y fiestas

- Contactos en un **celular del juego**: relaciones, mensajes, avisos, invitaciones y
  oportunidades. Los NPC pueden escribir o llamar por iniciativa propia.
- Comprar o alquilar viviendas, comprar y colocar muebles, decorar e invitar contactos.
- Organizar reuniones y fiestas eligiendo cuándo y a quién invitar; lo que ocurra influye en
  recuerdos y relaciones.

## Coches, viajes y combustible

- Comprar, poseer y usar coches, con coste y, más adelante, estado, capacidad, consumo y
  mantenimiento. Conducir y viajar consume **gasolina**, que cuesta dinero; hay gasolineras
  y avisos claros, sin gestión tediosa.

## Día, noche y continuidad del mundo

- Ciclo de día/noche visible: amanecer, día, atardecer y noche con estrellas. La iluminación,
  el cielo y el ambiente cambian, y la hora afecta horarios de comercios, actividades y NPC.
- **1 hora de juego = 10 minutos reales**, con opciones de pausa y de acelerar o ralentizar
  el tiempo.
- Al cerrar la partida se guarda el momento; al volver se simula de forma controlada el
  tiempo transcurrido (trabajo, ingresos básicos, necesidades, relaciones conservadas) y se
  resume lo ocurrido. Sin gastos grandes, mudanzas, rupturas ni cambios irreversibles sin
  autorización del jugador.

## Progresión geográfica (propuesta; requisitos configurables)

- **1ª vida:** pueblo inicial, sin viajar; el pueblo es abierto dentro de sus límites, sin
  secuencias rígidas de misiones.
- **Desde la 2ª vida:** viajar a otras ciudades reuniendo el dinero y cumpliendo requisitos
  configurables (no se desbloquea solo por acumular vidas: también influyen habilidades,
  contactos y decisiones).
- **Desde la 4ª vida:** metrópolis y regiones lejanas, con aeropuertos, puertos, transporte
  de bienes entre ciudades, más barrios, empleos, comercios y negocios.
- Las ciudades son ficticias y distintas entre sí (barrios, arquitectura, ambiente,
  actividades, trabajos y oportunidades propios). Viajar muestra duración y gastos y usa
  vehículos u otros medios de transporte.

## Héroes, villanos e identidad secreta

- Tras vivir al menos cuatro vidas, se puede iniciar una vida nueva con aprendizajes
  heredados; en ella el personaje puede desarrollar **poderes extraordinarios** y elegir ser
  héroe, villano o seguir su propio camino, protegiendo su identidad secreta.
- El uso de poderes puede generar sospechas y afectar relaciones, trabajos y acontecimientos,
  integrándose con la vida cotidiana (necesidades, vínculos y decisiones personales).

## Calidad visual y controles

- Juego 3D pulido con dirección artística coherente (mundo, personajes, edificios,
  materiales, iluminación y ambientes), sin copiar ciudades reales.
- Control en **tercera persona** y, cuando sea viable, cambio a **primera persona**;
  movimiento fluido: caminar, correr, girar, detenerse, sentarse, conversar y usar objetos.
- NPC con desplazamientos e interacciones comprensibles; sombras, cielos, ciclos de
  iluminación y efectos ambientales añadidos gradualmente.
- Funciona en ventana y ofrece **pantalla completa** a petición. Calidad gráfica ajustable
  para cuidar el rendimiento. Se prioriza una sección vertical pequeña y pulida antes de
  ampliar el mapa.

## Estado actual y plan por etapas

Estado real del repositorio: **solo documentación** (este README) y licencia. Ninguna etapa
de código está implementada todavía; lo que sigue es el plan, no código existente.

| Etapa | Descripción | Estado |
|-------|-------------|--------|
| 0 | Documentación del proyecto | ✅ hecho |
| 1 | Prototipo visual del pueblo: mundo 3D explorable, NPC con rutinas y personalidades, ciclo día/noche, modo observación (seleccionar/seguir NPC) y ficha del personaje | ⏳ pendiente |
| 2 | Primera vida jugable: control en tercera persona, reloj del juego, trabajo de supermercado con tareas jugables y reacción del jefe/compañeros | ⏳ pendiente |
| 3 | Relaciones, contactos y recuerdos; conversaciones contextuales por texto; cafetería; arquitectura modular para IA y voz; celular básico | ⏳ pendiente |
| 4 | Vida cotidiana: compras, inventario, economía básica, vivienda y decoración, fiestas, guardado y simulación al volver, lotería ficticia | ⏳ pendiente |
| 5 | Vidas y mundo persistente: envejecimiento, muerte, nueva vida, aprendizajes heredables, consecuencias persistentes | ⏳ pendiente |
| 6 | Viajes y expansión: ciudades desde la 2ª vida, metrópolis desde la 4ª, coches y combustible, aeropuertos, puertos, nuevos trabajos y negocios | ⏳ pendiente |
| 7 | Héroes/villanos con identidad secreta tras 4 vidas, más ciudades y preparación para estudiar multijugador | ⏳ pendiente |

## Reglas de trabajo

- Inspeccionar el proyecto antes de editar; no reemplazar archivos sin leerlos primero.
- Trabajo incremental: cada etapa se termina y se prueba antes de ampliar el alcance.
- Código modular, documentado y fácil de ampliar; distinguir siempre lo implementado de lo
  planificado.
- Nunca claves API ni secretos en el HTML/JS del navegador ni en archivos públicos.
- El núcleo del juego es observar vidas, elegir persona, hablar con los habitantes, vivir su
  historia y afectar el mundo; no una demo genérica de gestión.

## Cómo ejecutar

Todavía no hay aplicación que ejecutar (Etapa 0). Cuando exista la primera versión jugable
(Etapa 1), será una app estática servible con cualquier servidor de archivos estáticos, por
ejemplo:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Requisito: navegador moderno con WebGL.

## Despliegue

El objetivo a largo plazo es publicar el juego para que otras personas puedan jugarlo. Se ha
mencionado una plataforma de alojamiento llamada «Homestinger»; todavía **no** se ha
confirmado su nombre correcto ni sus requisitos, por lo que no se afirma aquí compatibilidad
con ninguna plataforma concreta. Al ser una app web estática (HTML/CSS/JS, sin backend
obligatorio), cualquier hosting de archivos estáticos con HTTPS es candidato; cuando llegue
el momento del despliegue se comprobarán los requisitos reales del proveedor elegido
(probablemente Hostinger) antes de anunciarlo.

## Licencia

MIT — ver [LICENSE](LICENSE).

---

# English version

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
  index.html
  css/style.css
  js/
    main.js       entry point and game loop
    core/         game state, clock, local save, world events
    world/        village generation, buildings, nature, lighting
    npc/          character data, state, routines, relationships, memories
    player/       observation camera, select/follow, 1st/3rd person control
    ui/           HUD, NPC panel, menus, graphics quality, fullscreen
    time/         day/night cycle (1 game hour = 10 real minutes)
    ai/           conversation module (local demo first; AI backend later)
  vendor/three/   vendored 3D engine
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

Actual repository status: **documentation only** (this README) and the license. No code
stage is implemented yet; what follows is the plan, not existing code.

| Stage | Description | Status |
|-------|-------------|--------|
| 0 | Project documentation | ✅ done |
| 1 | Visual village prototype: explorable 3D world, NPCs with routines and personalities, day/night cycle, observation mode (select/follow NPC) and character profile | ⏳ pending |
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

There is no application to run yet (Stage 0). When the first playable version exists
(Stage 1), it will be a static app servable with any static file server, for example:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Requirement: a modern browser with WebGL.

## Deployment

The long-term goal is to publish the game so other people can play it. A hosting platform
called "Homestinger" has been mentioned; its correct name and requirements have **not** been
confirmed yet, so no compatibility with any specific platform is claimed here. Since it is
a static web app (HTML/CSS/JS, no mandatory backend), any static file hosting with HTTPS is
a candidate; when deployment time comes, the actual requirements of the chosen provider
(probably Hostinger) will be verified before announcing it.

## License

MIT — see [LICENSE](LICENSE).
