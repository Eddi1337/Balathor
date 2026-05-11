/**
 * Optional Tech Dungeon: Roguelite–style tile sprites for the sci-fi realm.
 *
 * Purchase the pack from https://trevor-pupkin.itch.io/tech-dungeon-roguelite
 * (do not commit the licensed PNGs to a public repo — licence forbids redistribution).
 *
 * Setup: place your exported 32×32 tile sheet as client/assets/sci-fi/tileset.png
 * and tune cell coordinates in client/assets/sci-fi/atlas.json (see atlas.example.json).
 */
(function () {
  "use strict";

  const TILE_PX = 32;
  const DRAW_TILE_IDS = new Set([22, 23, 24, 25, 26, 27]);

  let atlas = null;
  let image = null;
  let loadStarted = false;

  function hashPick(tx, ty, salt) {
    let h = Math.imul(tx | 0, 374761393) ^ Math.imul(ty | 0, 668265263) ^ (salt | 0);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }

  async function load() {
    if (loadStarted) {
      return;
    }
    loadStarted = true;
    let data = null;
    try {
      const res = await fetch("./assets/sci-fi/atlas.json", { cache: "no-store" });
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      return;
    }
    if (!data || typeof data.image !== "string") {
      return;
    }
    const rel = data.image.replace(/^\.?\//, "");
    const url = `./assets/sci-fi/${rel}`;
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
    if (img.naturalWidth > 0 && data.byId && typeof data.byId === "object") {
      image = img;
      atlas = data;
    }
  }

  function drawTile(ctx, tile, sx, sy, tx, ty) {
    if (!image || !atlas || !DRAW_TILE_IDS.has(tile)) {
      return false;
    }
    const variants = atlas.byId[String(tile)];
    if (!Array.isArray(variants) || variants.length === 0) {
      return false;
    }
    const pick = hashPick(tx, ty, Number(atlas.salt) | 0x3d91) % variants.length;
    const cell = variants[pick];
    if (!Array.isArray(cell) || cell.length < 2) {
      return false;
    }
    const col = cell[0] | 0;
    const row = cell[1] | 0;
    const cw = Number(atlas.cellW) > 0 ? Number(atlas.cellW) | 0 : TILE_PX;
    const ch = Number(atlas.cellH) > 0 ? Number(atlas.cellH) | 0 : TILE_PX;
    const sx0 = col * cw;
    const sy0 = row * ch;
    const sw = Math.min(cw, image.naturalWidth - sx0);
    const sh = Math.min(ch, image.naturalHeight - sy0);
    if (sw <= 0 || sh <= 0) {
      return false;
    }
    try {
      ctx.drawImage(image, sx0, sy0, sw, sh, sx, sy, TILE_PX, TILE_PX);
    } catch {
      return false;
    }
    return true;
  }

  function ready() {
    return Boolean(image && atlas);
  }

  globalThis.TechDungeonSprites = { load, drawTile, ready };
})();
