// Global tuning constants for HUMANS.
// Everything that should be tweakable without touching game logic lives here.

export const VERSION = '0.6.0';

export const CONFIG = {
  seed: 20261111,          // world seed: same seed => same town, same names
  townBlocksX: 60,         // city size in blocks (city blocks / "cuadras"), X axis
  townBlocksZ: 80,         // city size in blocks, Z axis
  blockSize: 22,           // metres of buildable block (sidewalk included)
  streetWidth: 10,         // metres of road between blocks
  chunkBlocks: 8,          // blocks per render chunk (8x8)
  renderChunkRadius: 2,    // chunks loaded around the camera chunk (5x5 chunks)
  timeScale: 6,            // game-seconds per real second => 1 game hour = 10 real minutes
  startHour: 10,           // first game morning starts at 10:00 (NPCs already out)
  walkSpeed: 1.1,          // NPC walking speed in metres per game-second
  npcCount: 46,            // NPCs (incl. nocturnal ones)
  maxPopulation: 400,      // long-term population goal
  carFuelPerMetre: 0.08,   // % of tank consumed per metre driven
  refuelCost: 20,          // € to fill the tank at the gas station
  carPrices: [150, 260, 420],
};

// Distance between two block centres = block + street.
export const PITCH = CONFIG.blockSize + CONFIG.streetWidth; // 32 m
