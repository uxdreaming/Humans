// UI strings, Spanish (default) and English.
// World content (street names, NPC names, ads) stays in the world's own language;
// only interface labels are translated.

export const LANGS = ['es', 'en'];

export const STR = {
  es: {
    day: 'Día',
    population: 'habitantes',
    npcs: 'Habitantes',
    pause: 'Pausa',
    resume: 'Reanudar',
    quality: 'Calidad',
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    fullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    langBtn: 'EN',
    hint: 'Clic en un NPC para inspeccionarlo · N: NPC más cercano · F seguir · Esc cancelar · WASD moverse · arrastrar: órbita · rueda: zoom',
    controlling: 'Controlando a',
    control: {
      take: 'Tomar control',
      release: 'Dejar el control',
    },
    work: {
      bar: 'Turno en',
      prompt: 'Pulsa E',
      tasks: { restock: 'Reponer estantes', serve: 'Atender cliente', organize: 'Organizar almacén' },
      shiftStart: 'Empieza tu turno en',
      onTime: 'Llegaste puntual 👍',
      late: 'Llegaste tarde: el jefe lo ha notado ⚠️',
      paid: 'Has cobrado',
      taskDone: 'Tarea completada +2€',
      praise: '¡Buen trabajo! El jefe está contento ⭐',
      money: '€',
    },
    panel: {
      age: 'Edad',
      occupation: 'Ocupación',
      personality: 'Personalidad',
      activity: 'Actividad',
      location: 'Ubicación',
      mood: 'Ánimo',
      needs: 'Necesidades',
      goals: 'Objetivos',
      relationships: 'Relaciones',
      follow: 'Seguir',
      unfollow: 'Dejar de seguir',
      takeControl: 'Tomar control',
      noSelection: 'Selecciona un NPC',
      money: 'Dinero',
      approval: 'Aprobación del jefe',
    },
    needs: { hunger: 'Hambre', energy: 'Energía', social: 'Social' },
    activities: {
      sleep: 'Durmiendo', ready: 'Preparándose', work: 'Trabajando', lunch: 'Comiendo',
      stroll: 'Paseando', social: 'Socializando', shop: 'Comprando', commute: 'Yendo a otro sitio',
    },
    moods: { great: 'Genial', good: 'Bien', ok: 'Regular', low: 'Cansado/a', bad: 'Muy mal', sleeping: 'Dormido/a' },
    occupations: {
      cafe_owner: 'Dueña del café', market_manager: 'Gerente del supermercado',
      cashier: 'Cajera del supermercado', retired: 'Jubilado', student: 'Estudiante',
      baker: 'Panadera', villager: 'Vecino/a',
      stocker: 'Reponedor/a del supermercado', barkeep: 'Camarero/a del bar',
      nightowl: 'Búho nocturno',
    },
    traits: {
      friendly: 'amable', shy: 'tímido/a', grumpy: 'gruñón/a', curious: 'curioso/a',
      hardworking: 'trabajador/a', dreamer: 'soñador/a', calm: 'tranquilo/a', energetic: 'energético/a',
    },
    goals: {
      grow_cafe: 'Ampliar la terraza del café', save_trip: 'Ahorrar para un viaje',
      make_friends: 'Hacer nuevos amigos', rest: 'Descansar y leer',
      study: 'Aprobar los exámenes', help_town: 'Ayudar en lo que pueda del pueblo',
      manage_market: 'Que el supermercado crezca', learn_baking: 'Perfeccionar sus recetas',
    },
    relTypes: {
      friend: 'amigo/a', coworker: 'compañero/a de trabajo', boss: 'jefe/a',
      neighbor: 'vecino/a', mentor: 'mentor/a',
    },
    places: {
      home: 'Su casa', plaza: 'Plaza Mayor', cafe: 'Café La Esquina',
      market: 'Supermercado El Centro', park: 'Parque del Nogal', church: 'Iglesia de Santa Vera',
      bar: 'Bar El Faro', bakery: 'Panadería La Espiga', busstop: 'Parada de autobús',
    },
  },
  en: {
    day: 'Day',
    population: 'inhabitants',
    npcs: 'Inhabitants',
    pause: 'Pause',
    resume: 'Resume',
    quality: 'Quality',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    langBtn: 'ES',
    hint: 'Click an NPC to inspect · N: nearest NPC · F follow · Esc cancel · WASD move · drag: orbit · wheel: zoom · V first person when controlling',
    controlling: 'Controlling',
    control: {
      take: 'Take control',
      release: 'Release control',
    },
    work: {
      bar: 'Shift at',
      prompt: 'Press E',
      tasks: { restock: 'Restock shelves', serve: 'Serve customer', organize: 'Organize storage' },
      shiftStart: 'Your shift starts at',
      onTime: 'You arrived on time 👍',
      late: 'You are late: the boss noticed ⚠️',
      paid: 'You got paid',
      taskDone: 'Task done +2€',
      praise: 'Great work! The boss is happy ⭐',
      money: '€',
    },
    panel: {
      age: 'Age',
      occupation: 'Occupation',
      personality: 'Personality',
      activity: 'Activity',
      location: 'Location',
      mood: 'Mood',
      needs: 'Needs',
      goals: 'Goals',
      relationships: 'Relationships',
      follow: 'Follow',
      unfollow: 'Stop following',
      takeControl: 'Take control',
      noSelection: 'Select an NPC',
      money: 'Money',
      approval: 'Boss approval',
    },
    needs: { hunger: 'Hunger', energy: 'Energy', social: 'Social' },
    activities: {
      sleep: 'Sleeping', ready: 'Getting ready', work: 'Working', lunch: 'Eating',
      stroll: 'Strolling', social: 'Socializing', shop: 'Shopping', commute: 'Heading somewhere',
    },
    moods: { great: 'Great', good: 'Good', ok: 'Okay', low: 'Tired', bad: 'Awful', sleeping: 'Asleep' },
    occupations: {
      cafe_owner: 'Café owner', market_manager: 'Supermarket manager',
      cashier: 'Supermarket cashier', retired: 'Retired', student: 'Student',
      baker: 'Baker', villager: 'Villager',
      stocker: 'Supermarket stocker', barkeep: 'Barkeep',
      nightowl: 'Night owl',
    },
    traits: {
      friendly: 'friendly', shy: 'shy', grumpy: 'grumpy', curious: 'curious',
      hardworking: 'hardworking', dreamer: 'dreamer', calm: 'calm', energetic: 'energetic',
    },
    goals: {
      grow_cafe: 'Expand the café terrace', save_trip: 'Save up for a trip',
      make_friends: 'Make new friends', rest: 'Rest and read',
      study: 'Pass the exams', help_town: 'Help around town',
      manage_market: 'Grow the supermarket', learn_baking: 'Perfect her recipes',
    },
    relTypes: {
      friend: 'friend', coworker: 'coworker', boss: 'boss',
      neighbor: 'neighbor', mentor: 'mentor',
    },
    places: {
      home: 'Home', plaza: 'Main Plaza', cafe: 'La Esquina Café',
      market: 'El Centro Supermarket', park: 'Nogal Park', church: 'Santa Vera Church',
      bar: 'El Faro Bar', bakery: 'La Espiga Bakery', busstop: 'Bus stop',
    },
  },
};

export function t(lang, path) {
  const parts = path.split('.');
  let cur = STR[lang] || STR.es;
  for (const p of parts) {
    cur = cur?.[p];
    if (cur === undefined) return path;
  }
  return cur;
}
