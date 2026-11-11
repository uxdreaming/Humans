// Procedural name generators for the fictional world.
// All functions take an rng (from core/rng.js) and return strings,
// so names are stable for a given world seed.

import { pick, int, chance } from './rng.js';

const FIRST_M = [
  'Aldo', 'Bruno', 'Ciro', 'Dani', 'Elías', 'Fabio', 'Gino', 'Hugo', 'Iker', 'Jan',
  'Jordi', 'Koldo', 'Leo', 'Marc', 'Nico', 'Otto', 'Pau', 'Pol', 'Quim', 'Rocco',
  'Santi', 'Toni', 'Unai', 'Vicenç', 'Yago', 'Nil', 'Enzo', 'Liam', 'Teo',
];
const FIRST_F = [
  'Aina', 'Abril', 'Berta', 'Carla', 'Dora', 'Elena', 'Flora', 'Gina', 'Helena', 'Iris',
  'Jana', 'Kira', 'Lena', 'Luna', 'Mara', 'Nora', 'Olga', 'Pilar', 'Rosa', 'Sara',
  'Tara', 'Una', 'Vera', 'Ylenia', 'Zoe', 'Mía', 'Alba', 'Nora', 'Bruna', 'Carme',
];
const SURNAMES = [
  'Solís', 'Vega', 'Paredes', 'Roca', 'Luna', 'Ibarra', 'Costa', 'Rey', 'Mora', 'Sanz',
  'Gil', 'Torres', 'Navarro', 'Campos', 'Herrera', 'Bravo', 'Cruz', 'Ramos', 'Prieto',
  'Aguilar', 'Serra', 'Vidal', 'Rojas', 'Mena', 'Soria',
];

const STREET_PREFIX = ['Calle', 'Avenida', 'Paseo', 'Camino', 'Travesía', 'Ronda'];
const STREET_CORE = [
  'del Sol', 'de la Luna', 'de los Robles', 'del Río Claro', 'de las Estrellas',
  'del Viento', 'de la Plaza', 'del Mercado', 'de los Álamos', 'del Horizonte',
  'de la Fuente', 'del Nogal', 'de la Viña', 'del Puerto Viejo', 'de los Naranjos',
  'del Alba', 'de la Ermita', 'del Molino', 'de la Puerta', 'del Banco', 'del Faro',
];

const BILLBOARD_PRODUCTS = [
  'Café', 'Cola', 'Zumo', 'Pan', 'Queso', 'Helados', 'Bicis', 'Motos', 'Seguros',
  'Pizza', 'Chocolate', 'Cerveza', 'Libros', 'Farmacia', 'Pintura', 'Jamón',
];
const BILLBOARD_TEMPLATES = [
  (p, town) => `${p} La Esquina · abierto hasta tarde`,
  (p, town) => `${p} El Abuelo: sabor de siempre`,
  (p, town) => `Gran ${p}: 2x1 esta semana`,
  (p, town) => `${p} del Puerto · las mejores vistas`,
  (p, town) => `${p} Express 24h`,
  (p, town) => `${p} Fresco de ${town}`,
  (p, town) => `${p} La Moderna · desde 1987`,
  (p, town) => `¿${p}? Ven a vernos en ${town}`,
];

const CITY_A = [
  'Valle', 'Monte', 'Río', 'Puerto', 'Villa', 'Campo', 'Alto', 'Llano', 'Costa', 'Punta',
  'Norte', 'Solana', 'Bella', 'Gran',
];
const CITY_B = [
  'serena', 'claro', 'dulce', 'blanco', 'verde', 'azul', 'rojo', 'vista', 'florida',
  'cedro', 'mazon', 'real', 'nuevo', 'viejo', 'alto', 'bajo',
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function firstName(rng, gender = 'any') {
  const list = gender === 'm' ? FIRST_M : gender === 'f' ? FIRST_F
    : chance(rng, 0.5) ? FIRST_M : FIRST_F;
  return pick(rng, list);
}

export function surname(rng) {
  return pick(rng, SURNAMES);
}

export function personName(rng, gender = 'any') {
  return `${firstName(rng, gender)} ${surname(rng)}`;
}

// Streets: vertical streets (constant X) are "Avenida ...", horizontal "Calle ...".
export function streetName(rng, axis = 'z') {
  if (axis === 'x' && chance(rng, 0.6)) return `Avenida ${pick(rng, STREET_CORE)}`;
  return `${pick(rng, STREET_PREFIX)} ${pick(rng, STREET_CORE)}`;
}

export function billboardText(rng, town) {
  const product = pick(rng, BILLBOARD_PRODUCTS);
  const template = pick(rng, BILLBOARD_TEMPLATES);
  return template(product, town);
}

export function cityName(rng) {
  if (chance(rng, 0.35)) {
    const n = pick(rng, FIRST_F.concat(FIRST_M));
    return chance(rng, 0.5) ? `San ${n}` : `Santa ${n}`;
  }
  if (chance(rng, 0.5)) return `${pick(rng, CITY_A)}${cap(pick(rng, CITY_B))}`;
  return `${pick(rng, CITY_A)} ${cap(pick(rng, CITY_B))}`;
}

export function generateCityNames(rng, count) {
  const out = new Set();
  while (out.size < count) out.add(cityName(rng));
  return [...out];
}
