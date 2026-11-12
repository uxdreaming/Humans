// Tests for the rule-based dialogue engine (stage 3, local demo mode). Run: npm test

import assert from 'node:assert/strict';
import { respond } from '../js/ai/dialogue.js';
import { NPC_DEFS } from '../js/npc/data.js';

const def = NPC_DEFS[0];
const mkAgent = (over = {}) => ({ act: 'work', mood: 'good', locationName: 'Market', ...over });
const mkMemory = () => ({ greeted: false, rng: () => 0.5 });

// --- greeting: first time greets, remembers, small positive delta ---
{
  const memory = mkMemory();
  const r1 = respond({ def, agent: mkAgent(), rel: { strength: 30 }, playerName: 'Ana', text: 'Hola!', lang: 'es', memory });
  assert.equal(r1.relDelta, 2);
  assert.ok(memory.greeted, 'greeting is remembered');
  assert.ok(typeof r1.text === 'string' && r1.text.length > 3);
  const r2 = respond({ def, agent: mkAgent(), rel: { strength: 30 }, playerName: 'Ana', text: 'hola de nuevo', lang: 'es', memory });
  assert.ok(r2.text.length > 3, 'repeated greeting still answers');
}

// --- accents / punctuation / case are normalised: "¿CÓMO ESTÁS?" ---
{
  const memory = mkMemory();
  const r = respond({ def, agent: mkAgent({ mood: 'great' }), rel: { strength: 50 }, playerName: 'Ana', text: '¿CÓMO ESTÁS?', lang: 'es', memory });
  assert.ok(r.text.length > 3, 'mood answer returned');
  assert.equal(r.relDelta, 0);
}

// --- work question mentions the occupation ---
{
  const memory = mkMemory();
  const r = respond({ def, agent: mkAgent(), rel: { strength: 50 }, playerName: 'Ana', text: '¿dónde trabajas?', lang: 'es', memory });
  assert.equal(r.relDelta, 1);
  assert.ok(r.text.includes(def.occupation) || r.text.includes('Market'), `reply mentions work: ${r.text}`);
}

// --- romance depends on relationship strength ---
{
  const m1 = mkMemory();
  const high = respond({ def, agent: mkAgent(), rel: { strength: 80 }, playerName: 'Ana', text: '¿quieres ser mi novia?', lang: 'es', memory: m1 });
  assert.equal(high.relDelta, 6);
  const m2 = mkMemory();
  const low = respond({ def, agent: mkAgent(), rel: { strength: 20 }, playerName: 'Ana', text: '¿tienes novio?', lang: 'es', memory: m2 });
  assert.equal(low.relDelta, -4);
}

// --- insults hurt the relationship ---
{
  const memory = mkMemory();
  const r = respond({ def, agent: mkAgent(), rel: { strength: 50 }, playerName: 'Ana', text: 'eres un idiota', lang: 'es', memory });
  assert.equal(r.relDelta, -8);
}

// --- English works ---
{
  const memory = mkMemory();
  const r = respond({ def, agent: mkAgent({ mood: 'bad' }), rel: { strength: 50 }, playerName: 'Ana', text: 'how are you?', lang: 'en', memory });
  assert.ok(r.text.length > 3);
  assert.ok(/bad|tired|so-so|day/i.test(r.text), `english mood reply: ${r.text}`);
}

// --- unknown topic: personality fallback, still answers ---
{
  const memory = mkMemory();
  const r = respond({ def, agent: mkAgent(), rel: { strength: 50 }, playerName: 'Ana', text: 'la teoria de cuerdas es fascinante', lang: 'es', memory });
  assert.equal(r.relDelta, 1);
  assert.ok(r.text.length > 3);
}

// --- bye ---
{
  const memory = mkMemory();
  const r = respond({ def, agent: mkAgent(), rel: { strength: 50 }, playerName: 'Ana', text: 'adiós, nos vemos', lang: 'es', memory });
  assert.equal(r.relDelta, 1);
}

console.log('dialogue.test.mjs: OK');
