# HUMANS

Simulador de vida y mundo abierto en 3D para navegador, centrado en las personas, sus
historias y las consecuencias de las decisiones del jugador.

El jugador observa un pueblo ficticio y original, recorre a sus habitantes, sigue a un
NPC, conoce su vida y, cuando quiere, se convierte en él para vivir esa vida desde dentro.
No hay un único camino correcto: se puede buscar pareja, hacer amistades, mejorar en el
trabajo, crear contactos, viajar, comprar casa o coche, decorar, organizar fiestas, crear
negocios o perseguir objetivos propios. Las decisiones importantes dejan cambios persistentes
en el mundo y pueden afectar a vidas posteriores.

## Plataforma y arquitectura propuesta

- **Aplicación web 3D** con HTML, CSS y JavaScript puros, ejecutable en un navegador moderno
  con WebGL. Sin paso de build: módulos ES nativos.
- **Motor 3D:** Three.js (versión vendored dentro del repo, en `vendor/`), elegido porque
  es el estándar maduro para 3D web, tiene buena documentación, sombras, iluminación y
  permite empezar sin dependencias externas en tiempo de ejecución.
- **Estructura modular pensada para crecer** (se creará con la Etapa 1):

  ```
  index.html
  css/
    style.css
  js/
    main.js          punto de entrada y loop principal
    core/            estado del juego, reloj, guardado local, eventos del mundo
    world/           generación del pueblo, edificios, naturaleza, iluminación
    npc/             datos de personajes, estado, rutinas, relaciones, recuerdos
    player/          cámara de observación, selección/seguimiento, control en 1ª/3ª persona
    ui/              HUD, ficha del NPC, menús, calidad gráfica, pantalla completa
    time/            ciclo de día/noche (1 hora de juego = 10 minutos reales)
    ai/              módulo de conversación (demo local primero; backend con IA después)
  vendor/
    three/           motor 3D vendored
  ```

- **Sin claves ni secretos en el cliente.** Si se conecta una API de IA para conversaciones,
  las llamadas y las claves vivirán en un backend. Hasta entonces habrá un modo de
  demostración local que funciona sin servicios externos.
- **Pensado para el futuro:** cuentas, guardado en línea y multijugador se estudiarán más
  adelante. El multijugador no se abordará antes de que la versión individual sea divertida
  y estable. La estructura de datos (personajes, mundo, eventos) se diseña ya con ids
  estables para facilitar esa ampliación.

## Estado actual

| Etapa | Descripción | Estado |
|-------|-------------|--------|
| 0 | Documentación del proyecto (este README) | ✅ hecho |
| 1 | Prototipo visual del pueblo: mundo 3D explorable, NPC con rutinas, ciclo día/noche, modo observación y ficha del personaje | ⏳ pendiente |
| 2 | Primera vida jugable: control en tercera persona, reloj, trabajo de supermercado con tareas | ⏳ pendiente |
| 3 | Relaciones y conversaciones contextuales (texto primero), cafetería, arquitectura modular para IA y voz, celular básico | ⏳ pendiente |
| 4 | Vida cotidiana: compras, inventario, economía, vivienda, fiestas, guardado y simulación al volver, lotería ficticia | ⏳ pendiente |
| 5 | Vidas y mundo persistente: envejecimiento, muerte, nueva vida, aprendizajes heredables, consecuencias persistentes | ⏳ pendiente |
| 6 | Viajes y expansión: ciudades desbloqueables desde la 2ª vida, metrópolis desde la 4ª, coches, combustible, transporte, negocios | ⏳ pendiente |
| 7 | Héroes/villanos con identidad secreta tras 4 vidas, más ciudades, preparación para multijugador | ⏳ pendiente |

Solo se marca como hecho lo que está implementado y probado. Lo demás es plan.

## El mundo y sus habitantes

- Pueblo ficticio original (no copiado de una ciudad real), ampliable hasta ~400 habitantes
  y varias ciudades; se empieza con pocos NPC de prueba y sistemas preparados para crecer.
- Cada NPC importante tiene: historia, personalidad, ocupación, necesidades, habilidades,
  objetivos, rutinas y lugares que frecuenta, relaciones con otros personajes, recuerdos de
  acontecimientos y un estado actual (ubicación, actividad, ánimo, necesidades).
- Los NPC viven sus rutinas aunque el jugador no los controle: trabajan, descansan, compran,
  pasean, conversan, toman café y reaccionan a los acontecimientos.
- Arquitectura de agentes separada en capas: datos estables, estado actual, relaciones y
  recuerdos, rutinas/decisiones (sistemas del juego, sin IA), y conversaciones con el agente
  de IA solo en diálogos y situaciones importantes. El agente propone, el juego valida y
  aplica consecuencias; nunca modifica dinero, objetos o relaciones arbitrariamente.

## Progresión geográfica (propuesta, requisitos configurables)

- **1ª vida:** pueblo inicial, sin viajar a otras ciudades; el pueblo es abierto dentro de
  sus límites, sin secuencias rígidas de misiones.
- **Desde la 2ª vida:** viajar a otras ciudades si se reúne el dinero y se cumplen los
  requisitos (configurables; no se desbloquea solo por acumular vidas: también influyen
  habilidades, contactos y decisiones).
- **Desde la 4ª vida:** acceso a metrópolis y regiones lejanas, con aeropuertos, puertos,
  transporte de bienes entre ciudades, más barrios, empleos, comercios y negocios
  (supermercados, fábricas) con costes, suministros, empleados y efectos en la comunidad.
- Viajar muestra duración y gastos, y usa vehículos u otros medios (coche propio con
  combustible y repostaje, transporte público, etc.).

## Conversación y voz

- La interacción social prioriza el micrófono, con alternativa por teclado siempre
  disponible. Flujo modular: micrófono → voz a texto → contexto al agente → respuesta →
  (si hay) texto a voz → el juego valida y aplica consecuencias.
- El micrófono solo se activa con una acción explícita del jugador, se muestra claramente
  cuándo está escuchando y se puede detener en cualquier momento.
- Si el micrófono, el reconocimiento de voz o el audio de respuesta no están disponibles, el
  juego ofrece la alternativa por texto. Ninguna función depende de un único servicio.

## Tiempo y continuidad

- Ciclo de día/noche visible (amanecer, día, atardecer, noche con estrellas); la hora afecta
  horarios de comercios, actividades y NPC.
- **1 hora de juego = 10 minutos reales**, con opciones de pausa y de acelerar/ralentizar.
- Al cerrar la partida se guarda el momento y, al volver, se simula de forma controlada el
  tiempo transcurrido (trabajo, ingresos básicos, necesidades, relaciones conservadas) y se
  resume lo ocurrido. Sin gastos grandes, mudanzas, rupturas ni cambios irreversibles sin
  autorización del jugador.

## Reglas de trabajo del proyecto

- Inspeccionar antes de editar; no reemplazar archivos sin leerlos primero.
- Trabajo incremental: cada etapa se termina y se prueba antes de ampliar alcance.
- Código modular, documentado y fácil de ampliar; distinguir siempre lo implementado de lo
  planificado.
- Nunca claves API ni secretos en HTML/JS del navegador ni en archivos públicos.
- El núcleo del juego es observar vidas, elegir persona, hablar con los habitantes, vivir su
  historia y afectar el mundo; no una demo genérica de gestión.

## Cómo ejecutar (cuando exista la primera versión jugable)

La Etapa 1 creará la aplicación estática. Para entonces se podrá servir con cualquier
servidor estático, por ejemplo:

```bash
cd <raíz-del-repo>
python3 -m http.server 8000
# abrir http://localhost:8000
```

Requisitos: navegador moderno con WebGL. Funcionará en ventana y ofrecerá pantalla completa.
La calidad gráfica será ajustable para cuidar el rendimiento.

## Despliegue

El objetivo a largo plazo es publicar el juego para que otras personas puedan jugarlo. Se ha
mencionado una plataforma de alojamiento llamada «Homestinger»; todavía no se ha confirmado
su nombre correcto ni sus requisitos, por lo que **no se afirma aquí compatibilidad con
ninguna plataforma concreta**. Al ser una aplicación web estática (HTML/CSS/JS sin backend
obligatorio), cualquier hosting de archivos estáticos con HTTPS es candidato; cuando llegue
el momento del despliegue se comprobarán los requisitos reales del proveedor elegido
(probablemente Hostinger) antes de anunciarlo.

## Licencia

MIT — ver [LICENSE](LICENSE).
