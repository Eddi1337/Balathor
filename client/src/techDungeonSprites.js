/**
 * Fresh procedural space-station tiles.
 *
 * This intentionally avoids external bitmap sheets so the sci-fi station art is
 * generated in the same repo-native style as the fantasy world.
 */
(function () {
  "use strict";

  const TILE_PX = 32;
  const STATION_TILE_MIN = 22;
  const STATION_TILE_MAX = 27;

  let loadStarted = false;

  function hashPick(tx, ty, salt) {
    let h = Math.imul(tx | 0, 374761393) ^ Math.imul(ty | 0, 668265263) ^ (salt | 0);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }

  function blend(a, b, t) {
    const pa = parseInt(a.slice(1, 3), 16);
    const pb = parseInt(b.slice(1, 3), 16);
    const pr = Math.round(pa + (pb - pa) * t);
    const ga = parseInt(a.slice(3, 5), 16);
    const gb = parseInt(b.slice(3, 5), 16);
    const pg = Math.round(ga + (gb - ga) * t);
    const ba = parseInt(a.slice(5, 7), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const pbb = Math.round(ba + (bb - ba) * t);
    return `#${pr.toString(16).padStart(2, "0")}${pg.toString(16).padStart(2, "0")}${pbb
      .toString(16)
      .padStart(2, "0")}`;
  }

  async function load() {
    if (loadStarted) {
      return true;
    }
    loadStarted = true;
    if (typeof globalThis.__balathorClearChunkCache === "function") {
      globalThis.__balathorClearChunkCache();
    }
    return true;
  }

  function drawBitmapTile(ctx, tile, sx, sy, tx, ty) {
    return false;
  }

  /** Procedural tiles in the same grey–teal + cyan accent language as the Ditharts sheet. */
  function drawProceduralStationTile(ctx, tile, sx, sy, tx, ty) {
    const h = hashPick(tx, ty, 41) / 4294967296;
    const base = "#2a3c48";
    const mid = "#3d5565";
    const hi = "#5c7384";
    const cyan = "#67e8f0";
    const dark = "#1a2630";

    ctx.save();

    if (tile === 22) {
      /* VOID — starfield */
      ctx.fillStyle = "#070d14";
      ctx.fillRect(sx, sy, TILE_PX, TILE_PX);
      for (let i = 0; i < 9; i += 1) {
        const px = sx + ((hashPick(tx + i, ty, 502 + i) % 30) | 0) + 1;
        const py = sy + ((hashPick(tx, ty + i, 612 + i) % 28) | 0) + 2;
        const w = (hashPick(tx, ty, 700 + i) % 256) / 256;
        ctx.fillStyle = w > 0.72 ? "rgba(200,245,255,0.55)" : "rgba(120,180,210,0.35)";
        ctx.fillRect(px, py, 1, 1);
      }
      const g = ctx.createLinearGradient(sx, sy, sx + TILE_PX, sy + TILE_PX);
      g.addColorStop(0, "rgba(30,60,80,0.15)");
      g.addColorStop(1, "rgba(10,20,40,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, TILE_PX, TILE_PX);
      ctx.restore();
      return;
    }

    if (tile === 25) {
      /* HULL — armored panoramic glass with ribs; blocked but visibly opens to space. */
      ctx.fillStyle = "#050914";
      ctx.fillRect(sx, sy, TILE_PX, TILE_PX);
      for (let i = 0; i < 4; i += 1) {
        const px = sx + 5 + (hashPick(tx + i, ty - i, 804) % 22);
        const py = sy + 5 + (hashPick(tx - i, ty + i, 805) % 20);
        ctx.fillStyle = i === 0 ? "rgba(220,255,255,0.7)" : "rgba(120,190,230,0.45)";
        ctx.fillRect(px, py, 1, 1);
      }
      const glass = ctx.createLinearGradient(sx, sy, sx + TILE_PX, sy + TILE_PX);
      glass.addColorStop(0, "rgba(103,232,240,0.18)");
      glass.addColorStop(0.5, "rgba(25,54,72,0.55)");
      glass.addColorStop(1, "rgba(5,10,18,0.9)");
      ctx.fillStyle = glass;
      ctx.fillRect(sx + 3, sy + 3, TILE_PX - 6, TILE_PX - 6);
      ctx.fillStyle = blend(base, "#000000", 0.2);
      ctx.fillRect(sx, sy, TILE_PX, 4);
      ctx.fillRect(sx, sy + TILE_PX - 4, TILE_PX, 4);
      ctx.fillRect(sx, sy, 4, TILE_PX);
      ctx.fillRect(sx + TILE_PX - 4, sy, 4, TILE_PX);
      ctx.fillStyle = blend(mid, "#000000", 0.18);
      ctx.fillRect(sx + 14, sy + 2, 4, TILE_PX - 4);
      ctx.strokeStyle = "rgba(103,232,240,0.34)";
      ctx.strokeRect(sx + 4.5, sy + 4.5, TILE_PX - 9, TILE_PX - 9);
      ctx.restore();
      return;
    }

    /* Panel base — METAL / WALKWAY / WINDOW / ENERGY */
    ctx.fillStyle = base;
    ctx.fillRect(sx, sy, TILE_PX, TILE_PX);
    ctx.fillStyle = mid;
    ctx.fillRect(sx + 2, sy + 2, TILE_PX - 4, TILE_PX - 4);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 1.5, sy + 1.5, TILE_PX - 3, TILE_PX - 3);
    ctx.strokeStyle = hi;
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy + 6);
    ctx.lineTo(sx + TILE_PX - 4, sy + 6);
    ctx.moveTo(sx + 4, sy + TILE_PX - 7);
    ctx.lineTo(sx + TILE_PX - 4, sy + TILE_PX - 7);
    ctx.stroke();

    if (tile === 23) {
      /* METAL — rivets */
      for (let i = 0; i < 4; i += 1) {
        const rx = sx + 5 + (i % 2) * 20;
        const ry = sy + 5 + ((i / 2) | 0) * 20;
        ctx.fillStyle = "#1e2a33";
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6a8599";
        ctx.fillRect(rx - 0.5, ry - 0.5, 1, 1);
      }
    } else if (tile === 24) {
      /* WALKWAY — cyan lane + hazard ticks */
      ctx.strokeStyle = cyan;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(sx + TILE_PX / 2, sy + 4);
      ctx.lineTo(sx + TILE_PX / 2, sy + TILE_PX - 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#d4a017";
      for (let i = 0; i < 3; i += 1) {
        const yy = sy + 10 + i * 5;
        ctx.fillRect(sx + 4, yy, 4, 2);
        ctx.fillRect(sx + TILE_PX - 8, yy, 4, 2);
      }
    } else if (tile === 26) {
      /* WINDOW */
      ctx.fillStyle = "#0f1820";
      ctx.fillRect(sx + 5, sy + 10, TILE_PX - 10, 12);
      ctx.fillStyle = cyan;
      ctx.globalAlpha = 0.35 + h * 0.25;
      ctx.fillRect(sx + 6, sy + 11, TILE_PX - 12, 10);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = blend(cyan, "#ffffff", 0.4);
      ctx.strokeRect(sx + 5.5, sy + 10.5, TILE_PX - 11, 11);
    } else if (tile === 27) {
      /* ENERGY */
      const t = performance.now() / 1000;
      const pulse = 0.35 + Math.sin(t * 4 + tx * 0.7 + ty * 0.9) * 0.35;
      ctx.fillStyle = "#0f2530";
      ctx.fillRect(sx + 6, sy + 8, TILE_PX - 12, 16);
      ctx.fillStyle = `rgba(103,232,240,${pulse})`;
      ctx.fillRect(sx + 13, sy + 6, 6, 20);
      ctx.fillStyle = "rgba(200,255,255,0.5)";
      ctx.fillRect(sx + 15, sy + 8, 2, 14);
    }

    ctx.restore();
  }

  function drawSciFiStationTile(ctx, tile, sx, sy, tx, ty) {
    if (tile < STATION_TILE_MIN || tile > STATION_TILE_MAX) {
      return false;
    }
    if (drawBitmapTile(ctx, tile, sx, sy, tx, ty)) {
      return true;
    }
    drawProceduralStationTile(ctx, tile, sx, sy, tx, ty);
    return true;
  }

  function ready() {
    return loadStarted;
  }

  globalThis.TechDungeonSprites = { load, drawSciFiStationTile, ready };
})();
