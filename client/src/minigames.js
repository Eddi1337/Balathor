"use strict";

/**
 * Diegetic minigames — world props, canvas overlays, no popup windows.
 */
(function initBalathorMinigames(global) {
  const state = {
    sites: new Map(),
    session: null,
    debuffs: {},
    stats: null,
    lastPointer: { x: 0, y: 0 },
    discoveryHintShown: false
  };

  let deps = null;

  function siteAnchor(site) {
    const w = Math.max(1, Math.floor(Number(site.footprintW) || 1));
    const h = Math.max(1, Math.floor(Number(site.footprintH) || 1));
    return { x: site.x + w / 2, y: site.y + h / 2, w, h };
  }

  function drawMinigameSites(minTileX, maxTileX, minTileY, maxTileY) {
    if (!deps?.ctx) return;
    const { ctx, TILE_SIZE, camera, canvas } = deps;
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;
    const worldId = deps.getWorldId?.() || "fantasy";

    for (const site of state.sites.values()) {
      if (site.world && site.world !== worldId) continue;
      const w = Math.max(1, Math.floor(Number(site.footprintW) || 1));
      const h = Math.max(1, Math.floor(Number(site.footprintH) || 1));
      if (site.x > maxTileX || site.y > maxTileY || site.x + w < minTileX || site.y + h < minTileY) {
        continue;
      }
      const { x: ax, y: ay } = siteAnchor(site);
      const sx = Math.floor(ax * TILE_SIZE - camera.x + halfW);
      const sy = Math.floor(ay * TILE_SIZE - camera.y + halfH);
      drawSiteProp(ctx, site, sx, sy);
    }
  }

  function drawSiteProp(ctx, site, sx, sy) {
    ctx.save();
    const prop = site.prop || "marker";
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 420);
    const scale = 1.22;
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    ctx.translate(-sx, -sy);

    if (prop === "dart_board") {
      ctx.fillStyle = "#4a2814";
      ctx.beginPath();
      ctx.arc(sx, sy - 18, 22, 0, Math.PI * 2);
      ctx.fill();
      for (const [r, c] of [[18, "#c41e1e"], [12, "#ffd166"], [6, "#2d6a4f"]]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(sx, sy - 18, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (prop === "card_table") {
      ctx.fillStyle = "#5c4030";
      ctx.fillRect(sx - 28, sy - 8, 56, 10);
      ctx.fillStyle = "#8b1a1a";
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(sx - 20 + i * 14, sy - 26, 10, 16);
      }
    } else if (prop === "training_dummy") {
      ctx.fillStyle = "#8b7355";
      ctx.fillRect(sx - 4, sy - 38, 8, 34);
      ctx.fillStyle = "#c9a227";
      ctx.beginPath();
      ctx.arc(sx, sy - 42, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5a4020";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 16, sy - 30);
      ctx.lineTo(sx + 16, sy - 30);
      ctx.stroke();
    } else if (prop === "holy_ring") {
      ctx.strokeStyle = `rgba(255, 220, 120, ${0.35 + pulse * 0.35})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(sx, sy, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (prop === "vault") {
      ctx.fillStyle = "#3d4450";
      ctx.fillRect(sx - 18, sy - 28, 36, 30);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(sx - 8, sy - 18, 16, 12);
    } else if (prop === "bounty_board") {
      ctx.fillStyle = "#6b4c28";
      ctx.fillRect(sx - 3, sy - 32, 6, 32);
      ctx.fillStyle = "#c9a66a";
      ctx.fillRect(sx - 22, sy - 38, 44, 28);
      ctx.fillStyle = "#2c1810";
      ctx.font = "bold 7px serif";
      ctx.textAlign = "center";
      ctx.fillText("BOUNTY", sx, sy - 22);
    } else if (prop === "relay_ring" || prop === "swim_buoy") {
      ctx.strokeStyle = prop === "swim_buoy" ? "#4ec5ff" : "#74f29c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 18 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = prop === "swim_buoy" ? "rgba(78,197,255,0.32)" : "rgba(116,242,156,0.28)";
      ctx.beginPath();
      ctx.arc(sx, sy, 12 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      const idx = Number.isFinite(site.relayIndex)
        ? site.relayIndex
        : Number.isFinite(site.swimIndex)
          ? site.swimIndex
          : null;
      if (idx !== null) {
        const tag = prop === "swim_buoy" ? `Buoy ${idx + 1}/4` : `Relay ${idx + 1}/4`;
        ctx.font = "bold 9px ui-sans-serif, system-ui";
        ctx.fillStyle = prop === "swim_buoy" ? "#b8ecff" : "#c8ffd8";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(tag, sx, sy + 18);
      }
    } else if (prop === "courier_crate") {
      ctx.fillStyle = "#6b4c28";
      ctx.fillRect(sx - 16, sy - 14, 32, 22);
      ctx.strokeStyle = "#3d2814";
      ctx.strokeRect(sx - 16, sy - 14, 32, 22);
    } else if (prop === "turret_pad") {
      ctx.fillStyle = "#2a3548";
      ctx.fillRect(sx - 24, sy - 6, 48, 12);
      ctx.fillStyle = "#67f0ff";
      ctx.beginPath();
      ctx.arc(sx, sy - 14, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop === "lane_beacon") {
      ctx.fillStyle = "#ff9f43";
      ctx.fillRect(sx - 3, sy - 28, 6, 28);
      ctx.fillStyle = `rgba(255, 180, 60, ${0.4 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(sx, sy - 32, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop === "mining_rig") {
      ctx.fillStyle = "#555";
      ctx.fillRect(sx - 20, sy - 8, 40, 16);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(sx - 4, sy - 32, 8, 26);
    } else if (prop === "dungeon_terminal") {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(sx - 12, sy - 20, 24, 24);
      ctx.fillStyle = `#67f0ff`;
      ctx.fillRect(sx - 8, sy - 16, 16, 10);
    } else if (prop === "hollow_stone") {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.ellipse(sx, sy - 8, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(180, 140, 255, ${0.15 + pulse * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 10, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop === "pedestal") {
      ctx.fillStyle = "#8a7a68";
      ctx.fillRect(sx - 10, sy - 6, 20, 14);
      if (state.stats?.flags?.displayedTrophy) {
        ctx.font = "16px serif";
        ctx.textAlign = "center";
        ctx.fillText("🏆", sx, sy - 18);
      }
    } else {
      ctx.fillStyle = "#c9a66a";
      ctx.fillRect(sx - 8, sy - 16, 16, 16);
    }

    ctx.restore();
  }


  function drawOverlay() {
    if (!deps?.ctx) return;
    if (!state.session) return;
    const { ctx, worldToScreenPoint, canvas } = deps;
    const self = deps.getSelf();
    if (!self) return;

    const anchor = state.session.siteId
      ? (() => {
          const site = state.sites.get(state.session.siteId);
          if (!site) return { x: self.x, y: self.y };
          const a = siteAnchor(site);
          return { x: a.x, y: a.y };
        })()
      : { x: self.x, y: self.y };

    const screen = worldToScreenPoint(anchor.x, anchor.y);
    const x = screen.x;
    const y = screen.y - 56;
    const pad = 10;
    const lines = overlayLines(state.session);
    if (!lines.length) return;

    ctx.save();
    ctx.font = "bold 12px ui-sans-serif, system-ui";
    const w = Math.min(280, Math.max(140, ...lines.map((l) => ctx.measureText(l).width)) + pad * 2);
    const h = lines.length * 16 + pad * 2;
    const bx = Math.max(8, Math.min(canvas.width - w - 8, x - w / 2));
    const by = Math.max(8, Math.min(canvas.height - h - 8, y - h));

    ctx.fillStyle = "rgba(12, 18, 28, 0.82)";
    ctx.strokeStyle = "rgba(116, 200, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e8f4ff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + pad, by + pad + i * 16);
    });

    if (state.session.gameId === "darts" && state.session.phase === "aim") {
      drawDartAimUI(bx, by + h + 8, w);
    }
    if (state.session.gameId === "mining" && state.session.phase === "beam") {
      drawMiningBar(bx, by + h + 6, w, state.session.data);
    }
    if (state.session.gameId === "memory") {
      drawMemoryGrid(bx, by + h + 8, state.session.data);
    }
    if (state.session.gameId === "lockpick") {
      drawLockpickHints(bx, by + h + 8, state.session.data);
    }

    ctx.restore();
  }

  function overlayLines(session) {
    const g = session.gameId;
    const d = session.data || {};
    if (g === "darts") {
      return [`Darts — ${d.throwsLeft ?? 0} throws left`, `Score: ${d.total ?? 0}`, "Click board: aim & throw"];
    }
    if (g === "cards") return ["Cards — click table to draw"];
    if (g === "memory") return [`Memory — ${d.matched ?? 0}/8 pairs`, `Moves: ${d.moves ?? 0}`];
    if (g === "training") return [`Training — damage: ${Math.round(d.damage || 0)}`, "Strike the dummy"];
    if (g === "consecration") return [`Sanctum — ${Math.floor(d.seconds || 0)}s / 25s`, "Stand inside the ring"];
    if (g === "camp_bounty") return [`Camp clear — ${d.kills ?? 0}/${d.need ?? 6}`, "Slay foes in the camp"];
    if (g === "turret") return [`Defense — ${d.kills ?? 0}/${d.need ?? 8} kills`];
    if (g === "asteroid") return [`Asteroid lane — beacon ${(d.next ?? 0) + 1}/3`, "Fly your ship through"];
    if (g === "mining") return [`Mining — ${d.progress ?? 0}%`, "Pulse on the sweet spot (Space)"];
    if (g === "appraisal") return ["Appraisal — type guess in chat: /guess 123"];
    if (g === "lockpick") return ["Lock rhythm — keys 1-4 in order"];
    if (g === "scavenger") return ["Biome hunt — visit Oasis, Frost, Ember markers"];
    return [session.phase || "Activity"];
  }

  function drawDartAimUI(x, y, w) {
    const { ctx } = deps;
    ctx.fillStyle = "rgba(40,30,20,0.9)";
    ctx.fillRect(x, y, w, 36);
    ctx.fillStyle = "#ffd166";
    const power = state._dartPower ?? 0.6;
    ctx.fillRect(x + 4, y + 20, (w - 8) * power, 8);
    ctx.fillStyle = "#aaa";
    ctx.font = "10px sans-serif";
    ctx.fillText("Hold click longer for power", x + 6, y + 6);
  }

  function drawMiningBar(x, y, w, data) {
    const { ctx } = deps;
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, w, 14);
    ctx.fillStyle = "#67f0ff";
    ctx.fillRect(x, y, w * ((data?.progress || 0) / 100), 14);
  }

  function drawMemoryGrid(x, y, data) {
    const { ctx } = deps;
    const cards = data?.cards || [];
    const cols = 4;
    const size = 28;
    const gap = 4;
    cards.slice(0, 16).forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = x + col * (size + gap);
      const cy = y + row * (size + gap);
      ctx.fillStyle = card.matched ? "rgba(80,200,120,0.5)" : card.up ? "#2a4a6a" : "#1a2535";
      ctx.fillRect(cx, cy, size, size);
      if (card.up || card.matched) {
        ctx.fillStyle = "#fff";
        ctx.font = "14px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(card.v || "?", cx + size / 2, cy + size / 2);
      }
    });
  }

  function drawLockpickHints(x, y, data) {
    const { ctx } = deps;
    ctx.font = "11px monospace";
    ctx.fillStyle = "#ffd166";
    const seq = data?.sequence || [];
    const step = data?.step || 0;
    ctx.fillText(`Keys: ${seq.map((k, i) => (i < step ? "✓" : "?") + (k + 1)).join(" ")}`, x, y);
  }

  function onChunk(chunk) {
    for (const site of chunk.minigameSites || []) {
      state.sites.set(String(site.id), site);
    }
    if (!state.discoveryHintShown && chunk.minigameSites?.length && deps?.appendChat) {
      deps.appendChat({
        kind: "system",
        name: "Guide",
        text: "Minigames are hidden among ordinary world props. Hover an interactable prop to discover one."
      });
      state.discoveryHintShown = true;
    }
  }

  function pruneSites(loadedChunkKeys) {
    for (const [id, site] of state.sites.entries()) {
      const cx = Math.floor(site.x / 32);
      const cy = Math.floor(site.y / 32);
      if (!loadedChunkKeys.has(`${cx},${cy}`)) {
        state.sites.delete(id);
      }
    }
  }

  function onMessage(msg) {
    if (msg.type === "minigameState") {
      state.session = {
        gameId: msg.gameId,
        siteId: msg.siteId,
        phase: msg.phase,
        data: msg.data,
        endsAt: msg.endsAt,
        hideValues: msg.hideValues
      };
      return;
    }
    if (msg.type === "minigameEnd") {
      state.session = null;
      if (msg.reward?.chat) {
        deps.appendChat({ kind: "system", name: "Realm", text: msg.reward.chat });
      }
      return;
    }
    if (msg.type === "minigameDebuff") {
      state.debuffs[msg.debuff] = true;
    }
  }

  function findSiteAtWorld(wx, wy) {
    let best = null;
    let bestD = 2.4;
    const worldId = deps.getWorldId();
    for (const site of state.sites.values()) {
      if (site.world && site.world !== worldId) continue;
      const a = siteAnchor(site);
      const d = Math.hypot(wx - a.x, wy - a.y);
      if (d < bestD) {
        bestD = d;
        best = site;
      }
    }
    return best;
  }

  function tryClick(event) {
    if (!deps.getJoined()) return false;
    const world = deps.screenEventToWorld(event);
    state.lastPointer = world;
    const site = findSiteAtWorld(world.x, world.y);
    if (!site) return false;
    const self = deps.getSelf();
    if (!self) return false;
    const a = siteAnchor(site);
    if (Math.hypot(self.x - a.x, self.y - a.y) > 5.85) return false;

    if (state.session?.gameId === "darts" && site.prop === "dart_board") {
      const down = performance.now();
      const onUp = (ev) => {
        deps.canvas.removeEventListener("pointerup", onUp);
        const power = Math.min(1, (performance.now() - down) / 900);
        state._dartPower = power;
        const angle = Math.atan2(world.y - self.y, world.x - self.x);
        deps.send({ type: "minigameAction", action: "throw", angle, power });
      };
      deps.canvas.addEventListener("pointerup", onUp, { once: true });
      return true;
    }

    if (state.session?.gameId === "cards") {
      deps.send({ type: "minigameAction", action: "draw" });
      return true;
    }

    if (state.session?.gameId === "memory") {
      const grid = memoryGridHit(world.x, world.y, site);
      if (grid !== null) {
        deps.send({ type: "minigameAction", action: "flip", index: grid });
        return true;
      }
    }

    deps.sendInteract({ x: a.x, y: a.y, minigameSiteId: site.id });
    return true;
  }

  function memoryGridHit(wx, wy, site) {
    const a = siteAnchor(site);
    const cols = 4;
    const size = 0.55;
    const gap = 0.12;
    const ox = a.x - (cols * (size + gap)) / 2;
    const oy = a.y - 1.2;
    for (let i = 0; i < 16; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = ox + col * (size + gap);
      const cy = oy + row * (size + gap);
      if (wx >= cx && wx <= cx + size && wy >= cy && wy <= cy + size) return i;
    }
    return null;
  }

  function refreshTooltip(world) {
    const site = findSiteAtWorld(world.x, world.y);
    if (!site?.label) return false;
    deps.setTooltip(`Minigame - ${site.label}`, true);
    return true;
  }

  function onKeyDown(event) {
    if (!state.session) return false;
    if (state.session.gameId === "mining" && (event.code === "Space" || event.key === " ")) {
      event.preventDefault();
      deps.send({ type: "minigameAction", action: "pulse" });
      return true;
    }
    if (state.session.gameId === "lockpick") {
      const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
      if (event.code in map) {
        event.preventDefault();
        deps.send({ type: "minigameAction", action: "tap", key: map[event.code] });
        return true;
      }
    }
    if (event.key === "Escape") {
      deps.send({ type: "minigameAction", action: "cancel" });
      return true;
    }
    return false;
  }

  function handleChatCommand(text) {
    const m = text.match(/^\/guess\s+(\d+)/i);
    if (m && state.session?.gameId === "appraisal") {
      deps.send({ type: "minigameAction", action: "guess", value: Number(m[1]) });
      return true;
    }
    return false;
  }

  global.BalathorMinigames = {
    init(api) {
      deps = api;
    },
    state,
    onChunk,
    pruneSites,
    onMessage,
    drawMinigameSites,
    drawOverlay,
    tryClick,
    refreshTooltip,
    onKeyDown,
    handleChatCommand
  };
})(typeof window !== "undefined" ? window : globalThis);
