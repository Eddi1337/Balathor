// Tile ids. A tile is the ground type of one 1x1 world cell; props (trees, rocks, …) are
// tiles too so collision stays a single lookup. Rendering maps each id to a colour and,
// for prop tiles, a low-poly model.

export const Tile = {
  GRASS: 0,
  MEADOW: 1,
  FLOWERS: 2,
  DARK_GRASS: 3,
  SAND: 4,
  SHALLOW: 5,
  WATER: 6,
  SNOW: 7,
  ASH: 8,
  MUD: 9,
  PATH: 10,
  COBBLE: 11,
  PLAZA: 12,
  FLOOR: 13,
  /** Farm field (crops; walkable). */
  FIELD: 16,
  /** Flowing river water (swimmable, with a current). */
  RIVER: 17,
  // Blocking props / structures
  TREE: 20,
  PINE: 21,
  SNOW_PINE: 22,
  PALM: 23,
  CACTUS: 24,
  DEAD_TREE: 25,
  ROCK: 26,
  BUSH: 27,
  WALL: 28,
  BUILDING: 29,
  FOUNTAIN: 30,
  WILLOW: 31,
  CRYSTAL: 32,
  // Interiors
  DOORMAT: 14,
  STAIRS: 15,
  /** A cell occupied by solid furniture. */
  FURNITURE: 33,
  // Sci-fi realm
  /** Open space (flyable). */
  VOID: 40,
  METAL_FLOOR: 41,
  METAL_WALL: 42,
  /** Window wall onto the stars (blocking). */
  GLASS: 43,
  /** Glowing pad: stargate arrival, hangar launch, lift. */
  PAD: 44,
  CONSOLE: 45,
  PLANTER: 46,
  /** Stargate ring frame (overworld & station). */
  GATE: 47,
  /** Edge of the playable space map. */
  FORCEFIELD: 48
} as const;

export type TileId = (typeof Tile)[keyof typeof Tile];

const BLOCKING = new Set<number>([
  Tile.WATER,
  Tile.TREE,
  Tile.PINE,
  Tile.SNOW_PINE,
  Tile.PALM,
  Tile.CACTUS,
  Tile.DEAD_TREE,
  Tile.ROCK,
  Tile.BUSH,
  Tile.WALL,
  Tile.BUILDING,
  Tile.FOUNTAIN,
  Tile.WILLOW,
  Tile.CRYSTAL,
  Tile.FURNITURE,
  Tile.METAL_WALL,
  Tile.GLASS,
  Tile.CONSOLE,
  Tile.PLANTER,
  Tile.GATE,
  Tile.FORCEFIELD
]);

export function isBlockingTile(tile: number): boolean {
  return BLOCKING.has(tile);
}

/** Tiles that also block projectiles (water and low props do not). */
const PROJECTILE_BLOCKING = new Set<number>([
  Tile.TREE,
  Tile.PINE,
  Tile.SNOW_PINE,
  Tile.PALM,
  Tile.DEAD_TREE,
  Tile.WALL,
  Tile.BUILDING,
  Tile.WILLOW,
  Tile.CRYSTAL,
  Tile.METAL_WALL,
  Tile.GLASS,
  Tile.GATE,
  Tile.FORCEFIELD
]);

export function blocksProjectile(tile: number): boolean {
  return PROJECTILE_BLOCKING.has(tile);
}

export function isWaterTile(tile: number): boolean {
  return tile === Tile.WATER || tile === Tile.SHALLOW || tile === Tile.RIVER;
}

/** Tiles you swim in (slowly) rather than walk on. */
export function isSwimTile(tile: number): boolean {
  return tile === Tile.SHALLOW || tile === Tile.RIVER;
}

/** Ground colour under a prop tile (props are drawn on top of this). */
export function groundUnder(tile: number, biomeGround: number): number {
  return BLOCKING.has(tile) && tile !== Tile.WATER ? biomeGround : tile;
}
