// Global tuning constants for HUMANS.
// Everything that should be tweakable without touching game logic lives here.

export const CONFIG = {
  seed: 20261111,          // world seed: same seed => same town, same names
  townBlocksX: 30,         // town size in blocks (city blocks / "cuadras"), X axis
  townBlocksZ: 50,         // town size in blocks, Z axis
  blockSize: 22,           // metres of buildable block (sidewalk included)
  streetWidth: 10,         // metres of road between blocks
  chunkBlocks: 8,          // blocks per render chunk (8x8)
  renderChunkRadius: 2,    // chunks loaded around the camera chunk (5x5 chunks)
  timeScale: 6,            // game-seconds per real second => 1 game hour = 10 real minutes
  startHour: 10,           // first game morning starts at 10:00 (NPCs already out)
  walkSpeed: 1.1,          // NPC walking speed in metres per game-second
  npcCount: 40,            // test NPCs in stage 1 (incl. nocturnal ones)
  maxPopulation: 400,      // long-term population goal
};

// Distance between two block centres = block + street.
export const PITCH = CONFIG.blockSize + CONFIG.streetWidth; // 32 m
