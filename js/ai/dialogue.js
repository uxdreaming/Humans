// Context-aware rule-based dialogue engine (local demo mode — no external AI
// service, no API keys in the browser). The game validates and applies the
// returned effects; the engine only proposes text + a small relationship delta.
//
// respond({ def, agent, rel, playerName, text, lang, memory }) -> { text, relDelta }

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:"']/g, ' ').replace(/\s+/g, ' ').trim();

const has = (t, words) => words.some((w) => t.includes(w));

const DLG = {
  es: {
    greet: ['¡Hola, {p}!', '¡Buenas, {p}! ¿Qué cuentas?', '¡Hola! Me alegro de verte, {p}.'],
    greetAgain: ['¡{p}! Otra vez por aquí, ¿eh?', '¡Hola de nuevo, {p}!'],
    moodGreat: ['¡De maravilla, {p}! Hoy todo sale bien.', '¡Fenomenal! Gracias por preguntar.'],
    moodGood: ['Bien, bien. Un día normal en {place}.', 'Contento/a, gracias.'],
    moodOk: ['Regular, {p}… pero aquí sigo.', 'Ya sabes, el día a día.'],
    moodLow: ['La verdad es que estoy cansado/a, {p}.', 'No es mi mejor día, la verdad.'],
    moodBad: ['Muy mal, {p}. No me preguntes.', 'Regular tirando a mal…'],
    sleeping: ['Shhh… estoy durmiendo, {p}.'],
    work: ['Trabajo de {occ} en {place}. Hoy toca turno de {act}.', 'Soy {occ}. Ahora mismo estoy {act} en {place}.'],
    name: ['Soy {name}, tengo {age} años y vivo en {street}.', 'Me llamo {name}.'],
    help: ['Claro, {p}. Si necesitas algo del trabajo, dime.', 'Cuenta conmigo, {p}.'],
    loveHigh: ['¡{p}! Me caes genial… esto puede ir a más 😊', '¿Sabes que me gustas mucho, {p}?'],
    loveMid: ['Eres majo/a, {p}. Ya veremos…', 'Me caes bien, {p}, pero no sé si tanto.'],
    loveLow: ['Lo siento, {p}, pero no veo eso contigo.', 'No, {p}. Solo somos conocidos.'],
    insultGrumpy: ['¡Oye! Con ese tono no hablamos, {p}.', 'Vaya tela… (se aparta)'],
    insultFriendly: ['Jaja, {p}, qué carácter. Tranqui, no pasa nada.', 'Uy, {p}… vale, vale 😅'],
    bye: ['¡Hasta luego, {p}!', '¡Nos vemos, {p}!'],
    fallbackCurious: ['¿{q}? Vaya, no me lo había planteado. ¿Tú qué opinas?', 'Interesante… cuéntame más sobre eso.'],
    fallbackFriendly: ['¡Ja! Tienes cada tema, {p}.', 'Hablamos de otra cosa: ¿has visto lo que pasa en {place}?'],
    fallbackGrumpy: ['¿En serio me vienes con eso ahora, {p}?', 'Pff… luego hablamos.'],
    fallbackCalm: ['Mmm… puede ser, {p}.', 'Lo pensaré con calma.'],
    actWord: { sleep: 'durmiendo', ready: 'preparándome', work: 'trabajando', lunch: 'comiendo', stroll: 'paseando', social: 'charlando', shop: 'comprando', commute: 'de camino' },
  },
  en: {
    greet: ['Hi {p}!', "Hey {p}, what's up?", 'Hi there, {p}!'],
    greetAgain: ["{p}! Back again, huh?", 'Hey {p} again!'],
    moodGreat: ['Great, {p}! Everything is going well today.', 'Fantastic! Thanks for asking.'],
    moodGood: ['Good, good. A normal day in {place}.', "I'm fine, thanks."],
    moodOk: ["So-so, {p}… but I'm still here.", 'You know, the usual day.'],
    moodLow: ["Honestly I'm tired, {p}.", 'Not my best day, to be honest.'],
    moodBad: ["Really bad, {p}. Don't ask.", 'Pretty bad…'],
    sleeping: ['Shhh… I am sleeping, {p}.'],
    work: ['I work as {occ} at {place}. Right now I am {act}.', 'I am {occ}. I am {act} at {place} now.'],
    name: ["I'm {name}, I'm {age} and I live on {street}.", 'My name is {name}.'],
    help: ['Sure, {p}. If you need anything work-related, tell me.', 'Count on me, {p}.'],
    loveHigh: ['{p}! I really like you… this could go somewhere 😊', 'You know I like you a lot, {p}?'],
    loveMid: ["You're nice, {p}. We'll see…", "I like you, {p}, but I'm not sure how much."],
    loveLow: ["Sorry {p}, but I don't see that with you.", "No, {p}. We're just acquaintances."],
    insultGrumpy: ["Hey! We don't talk like that, {p}.", 'Wow… (walks away)'],
    insultFriendly: ['Haha, {p}, what a character. Chill, it is fine.', 'Whoa, {p}… ok, ok 😅'],
    bye: ['See you, {p}!', "Catch you later, {p}!"],
    fallbackCurious: ['{q}? Huh, never thought of that. What do you think?', 'Interesting… tell me more.'],
    fallbackFriendly: ['Haha! You always have topics, {p}.', "Let's talk about something else: have you seen what's happening at {place}?"],
    fallbackGrumpy: ['Really, {p}? Now? …', 'Pff… we will talk later.'],
    fallbackCalm: ['Mmm… maybe, {p}.', "I'll think about it calmly."],
    actWord: { sleep: 'sleeping', ready: 'getting ready', work: 'working', lunch: 'eating', stroll: 'strolling', social: 'chatting', shop: 'shopping', commute: 'on my way' },
  },
};

const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function respond({ def, agent, rel, playerName, text, lang = 'es', memory }) {
  const L = DLG[lang] || DLG.es;
  const t = norm(text);
  const rng = memory.rng || Math.random;
  const strength = rel ? rel.strength : 30;
  const place = agent.locationName || '';
  const vars = {
    p: playerName || (lang === 'es' ? 'tú' : 'you'),
    name: def.name, age: def.age, street: 'San Iris', occ: def.occupation, place, q: text.slice(0, 40),
    act: L.actWord[agent.act] || agent.act,
  };
  let reply;
  let relDelta = 0;

  if (has(t, ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'hey', 'saludos', 'hi', 'hello', 'hey there'])) {
    reply = memory.greeted ? pick(L.greetAgain, rng) : pick(L.greet, rng);
    memory.greeted = true;
    relDelta = 2;
  } else if (has(t, ['como estas', 'que tal', 'que cuentas', 'how are you', 'how is it going', 'whats up'])) {
    const moodKey = agent.mood === 'great' ? 'moodGreat' : agent.mood === 'good' ? 'moodGood' : agent.mood === 'ok' ? 'moodOk' : agent.mood === 'low' ? 'moodLow' : agent.mood === 'sleeping' ? 'sleeping' : 'moodBad';
    reply = pick(L[moodKey], rng);
  } else if (has(t, ['trabaj', 'job', 'work', 'occupation', 'oficio'])) {
    reply = pick(L.work, rng);
    relDelta = 1;
  } else if (has(t, ['llamas', 'nombre', 'quien eres', 'who are you', 'your name', 'name'])) {
    reply = pick(L.name, rng);
  } else if (has(t, ['ayuda', 'help', 'favor', 'can you'])) {
    reply = pick(L.help, rng);
    relDelta = 3;
  } else if (has(t, ['novio', 'novia', 'pareja', 'amor', 'love', 'date', 'salir juntos', 'girlfriend', 'boyfriend'])) {
    if (strength >= 70) { reply = pick(L.loveHigh, rng); relDelta = 6; }
    else if (strength >= 45) { reply = pick(L.loveMid, rng); relDelta = 2; }
    else { reply = pick(L.loveLow, rng); relDelta = -4; }
  } else if (has(t, ['idiota', 'tonto', 'tonta', 'feo', 'fea', 'odio', 'stupid', 'hate you', 'ugly'])) {
    const grumpy = def.traits.includes('grumpy');
    reply = pick(grumpy ? L.insultGrumpy : L.insultFriendly, rng);
    relDelta = -8;
  } else if (has(t, ['adios', 'chao', 'hasta luego', 'bye', 'nos vemos'])) {
    reply = pick(L.bye, rng);
    relDelta = 1;
  } else {
    const trait = def.traits[0] || 'friendly';
    const key = trait === 'curious' ? 'fallbackCurious' : trait === 'grumpy' ? 'fallbackGrumpy' : trait === 'calm' ? 'fallbackCalm' : 'fallbackFriendly';
    reply = pick(L[key], rng);
    relDelta = 1;
  }

  return { text: fill(reply, vars), relDelta };
}
