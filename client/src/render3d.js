/*
 * render3d.js — optional Three.js renderer for Balathor.
 *
 * This is a *parallel* view of the exact same authoritative game state the 2D
 * canvas renderer draws. It owns nothing about gameplay: main.js feeds it a
 * compact per-frame payload (camera, visible chunks, buildings, entities) and
 * this module turns that into a procedural low-poly 3D scene that matches the
 * cosy hand-drawn vibe of the 2D art. Toggling 2D/3D only swaps which renderer
 * runs — input, networking and all HTML UI are untouched.
 *
 * Loaded as a plain global script (after vendor/three.min.js, before main.js)
 * and exposes a single global: `Render3D`.
 */
(function () {
  "use strict";

  const T = typeof window !== "undefined" ? window.THREE : null;

  // ── module state ───────────────────────────────────────────────────────────
  let renderer = null;
  let scene = null;
  let camera = null;
  let ready = false;
  let canvasEl = null;

  let terrainGroup = null;   // one merged mesh per visible chunk
  let buildingGroup = null;  // one merged mesh per building
  let entityGroup = null;    // one figure Group per entity id
  let baseGround = null;

  const chunkMeshes = new Map();    // "cx,cy" -> Mesh
  const buildingMeshes = new Map(); // "x,y"   -> Mesh
  const entityFigures = new Map();  // id      -> Group

  // Reused scratch so we don't allocate THREE.Color every tile.
  const _c = T ? new T.Color() : null;
  const _c2 = T ? new T.Color() : null;

  function isSupported() {
    if (!T) return false;
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  }

  // ── geometry helpers: append flat-shaded primitives into shared arrays ──────
  // Each primitive writes positions, per-vertex colors and face normals so a
  // single MeshLambertMaterial({vertexColors}) lights the whole merged mesh.
  function pushTri(b, ax, ay, az, bx, by, bz, cx, cy, cz, col) {
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const nl = Math.hypot(nx, ny, nz) || 1;
    const r = col.r, g = col.g, bl = col.b;
    b.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    for (let i = 0; i < 3; i++) { b.nor.push(nx / nl, ny / nl, nz / nl); b.col.push(r, g, bl); }
  }

  function pushQuad(b, p0, p1, p2, p3, col) {
    pushTri(b, p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], col);
    pushTri(b, p0[0], p0[1], p0[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2], col);
  }

  // Flat horizontal tile top centred at (x,z), spanning `s`, at height y.
  function pushFlatTile(b, x, z, s, y, col) {
    const h = s / 2;
    pushQuad(b, [x - h, y, z - h], [x - h, y, z + h], [x + h, y, z + h], [x + h, y, z - h], col);
  }

  // Axis-aligned box from its centre.
  function pushBox(b, x, y, z, sx, sy, sz, col, colTop) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const top = colTop || col;
    // top
    pushQuad(b, [x - hx, y + hy, z - hz], [x - hx, y + hy, z + hz], [x + hx, y + hy, z + hz], [x + hx, y + hy, z - hz], top);
    // bottom
    pushQuad(b, [x - hx, y - hy, z + hz], [x - hx, y - hy, z - hz], [x + hx, y - hy, z - hz], [x + hx, y - hy, z + hz], col);
    // +z / -z
    pushQuad(b, [x - hx, y - hy, z + hz], [x + hx, y - hy, z + hz], [x + hx, y + hy, z + hz], [x - hx, y + hy, z + hz], col);
    pushQuad(b, [x + hx, y - hy, z - hz], [x - hx, y - hy, z - hz], [x - hx, y + hy, z - hz], [x + hx, y + hy, z - hz], col);
    // +x / -x
    pushQuad(b, [x + hx, y - hy, z + hz], [x + hx, y - hy, z - hz], [x + hx, y + hy, z - hz], [x + hx, y + hy, z + hz], col);
    pushQuad(b, [x - hx, y - hy, z - hz], [x - hx, y - hy, z + hz], [x - hx, y + hy, z + hz], [x - hx, y + hy, z - hz], col);
  }

  // Four-sided pyramid (roof / tree canopy) from base centre.
  function pushPyramid(b, x, yBase, z, baseX, baseZ, height, col) {
    const hx = baseX / 2, hz = baseZ / 2, ay = yBase + height;
    const apex = [x, ay, z];
    const c0 = [x - hx, yBase, z - hz], c1 = [x - hx, yBase, z + hz];
    const c2 = [x + hx, yBase, z + hz], c3 = [x + hx, yBase, z - hz];
    pushTri(b, c0[0], c0[1], c0[2], c1[0], c1[1], c1[2], apex[0], apex[1], apex[2], col);
    pushTri(b, c1[0], c1[1], c1[2], c2[0], c2[1], c2[2], apex[0], apex[1], apex[2], col);
    pushTri(b, c2[0], c2[1], c2[2], c3[0], c3[1], c3[2], apex[0], apex[1], apex[2], col);
    pushTri(b, c3[0], c3[1], c3[2], c0[0], c0[1], c0[2], apex[0], apex[1], apex[2], col);
  }

  function newBuffers() { return { pos: [], col: [], nor: [] }; }

  function buffersToMesh(b) {
    if (!b.pos.length) return null;
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute("color", new T.Float32BufferAttribute(b.col, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(b.nor, 3));
    const mat = new T.MeshLambertMaterial({ vertexColors: true });
    return new T.Mesh(geo, mat);
  }

  function disposeMesh(mesh) {
    if (!mesh) return;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
      else mesh.material.dispose();
    }
  }

  // ── init ───────────────────────────────────────────────────────────────────
  function attach(el) {
    if (ready) return true;
    if (!isSupported()) return false;
    canvasEl = el;
    try {
      renderer = new T.WebGLRenderer({ canvas: el, antialias: true });
    } catch {
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(48, 1, 0.1, 1400);

    scene.add(new T.HemisphereLight(0xffffff, 0x3a4636, 1.0));
    const sun = new T.DirectionalLight(0xfff2d8, 0.85);
    sun.position.set(80, 160, 60);
    scene.add(sun);
    const rim = new T.DirectionalLight(0xbcd4ff, 0.25);
    rim.position.set(-60, 50, -80);
    scene.add(rim);

    terrainGroup = new T.Group();
    buildingGroup = new T.Group();
    entityGroup = new T.Group();
    scene.add(terrainGroup, buildingGroup, entityGroup);

    // Infinite-ish base plane so unloaded areas read as ground, not void.
    const baseMat = new T.MeshLambertMaterial({ color: 0x3f6b3a });
    baseGround = new T.Mesh(new T.PlaneGeometry(4000, 4000), baseMat);
    baseGround.rotation.x = -Math.PI / 2;
    baseGround.position.y = -0.3;
    scene.add(baseGround);

    ready = true;
    return true;
  }

  function setSize(w, h) {
    if (!ready || !w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ── per-theme atmosphere ────────────────────────────────────────────────────
  function applyTheme(theme) {
    if (!ready) return;
    let sky = 0x9fd3ff, ground = 0x3f6b3a, fogNear = 60, fogFar = 240;
    if (theme === "sci-fi" || theme === "alien" || theme === "dungeon") {
      sky = theme === "dungeon" ? 0x05060a : 0x070912;
      ground = theme === "dungeon" ? 0x1a1410 : 0x0d1420;
      fogNear = 40; fogFar = 170;
    } else if (theme === "nautical") {
      sky = 0xbfe6ff; ground = 0x2f6f86;
    }
    scene.background = new T.Color(sky);
    scene.fog = new T.Fog(sky, fogNear, fogFar);
    if (baseGround) baseGround.material.color.setHex(ground);
  }

  // ── terrain ─────────────────────────────────────────────────────────────────
  function tileHeight(tile, TILE) {
    if (tile === TILE.WATER) return -0.22;
    if (tile === TILE.LAVA) return -0.12;
    return 0;
  }

  function buildChunkMesh(chunk, ctx) {
    const { TILE, chunkSize, theme, getTileColors } = ctx;
    const b = newBuffers();
    const minX = chunk.cx * chunkSize;
    const minY = chunk.cy * chunkSize;
    const tiles = chunk.tiles;
    if (!tiles) return null;
    for (let ly = 0; ly < chunkSize; ly++) {
      for (let lx = 0; lx < chunkSize; lx++) {
        const tile = tiles[ly * chunkSize + lx];
        if (tile == null) continue;
        const wx = minX + lx + 0.5;
        const wz = minY + ly + 0.5;
        const pal = getTileColors(tile, theme) || ["#4f8b49"];
        _c.set(pal[0]);
        const isWall = tile === TILE.WALL || tile === TILE.HULL;
        const isTree = tile === TILE.TREE || tile === TILE.HOME_TREE;

        // ground bed under everything
        _c2.copy(_c);
        if (isTree) _c2.set("#3f6b3a");
        pushFlatTile(b, wx, wz, 1, tileHeight(tile, TILE), _c2);

        if (isWall) {
          _c.set(pal[0]);
          const top = new T.Color(pal[1] || pal[0]);
          pushBox(b, wx, 0.7, wz, 1, 1.4, 1, _c, top);
        } else if (isTree) {
          const trunk = new T.Color("#6c4b2e");
          pushBox(b, wx, 0.55, wz, 0.34, 1.1, 0.34, trunk);
          const leaf = new T.Color(pal[1] || pal[0]);
          pushPyramid(b, wx, 1.0, wz, 1.5, 1.5, 1.7, leaf);
          const leaf2 = new T.Color(pal[2] || pal[0]);
          pushPyramid(b, wx, 1.8, wz, 1.0, 1.0, 1.2, leaf2);
        } else if (tile === TILE.FIREPLACE || tile === TILE.LAVA || tile === TILE.ENERGY) {
          // glowy accents stay flat but bright
        }
      }
    }
    return buffersToMesh(b);
  }

  function syncTerrain(ctx) {
    const seen = new Set();
    for (const chunk of ctx.chunks) {
      const key = chunk.cx + "," + chunk.cy;
      seen.add(key);
      if (!chunkMeshes.has(key)) {
        const mesh = buildChunkMesh(chunk, ctx);
        if (mesh) { terrainGroup.add(mesh); chunkMeshes.set(key, mesh); }
        else chunkMeshes.set(key, null);
      }
    }
    for (const [key, mesh] of chunkMeshes) {
      if (seen.has(key)) continue;
      if (mesh) { terrainGroup.remove(mesh); disposeMesh(mesh); }
      chunkMeshes.delete(key);
    }
  }

  // ── buildings ────────────────────────────────────────────────────────────────
  const BUILDING_STYLE = {
    hut:        { wall: "#caa882", roof: "#9c5a3c", h: 2.0, roofH: 1.0 },
    house:      { wall: "#dcc59a", roof: "#b54a3a", h: 2.6, roofH: 1.3 },
    big_house:  { wall: "#e3d2ab", roof: "#9c3f55", h: 3.1, roofH: 1.5 },
    pub:        { wall: "#c9a36a", roof: "#6e4a8a", h: 2.8, roofH: 1.4 },
    fletcher:   { wall: "#b89366", roof: "#7a5230", h: 2.5, roofH: 1.2 },
    treehouse:  { wall: "#8a6a44", roof: "#3f7a52", h: 3.4, roofH: 1.6 },
    tower:      { wall: "#9aa0a6", roof: "#3a4a8a", h: 5.2, roofH: 2.2 },
    castle:     { wall: "#a7adb4", roof: "#5a6470", h: 5.6, roofH: 1.6 },
    "harbour-building":   { wall: "#b8a07a", roof: "#5a6f86", h: 2.8, roofH: 1.2 },
    "harbour-lighthouse": { wall: "#e8e2d4", roof: "#c0392b", h: 6.0, roofH: 1.8 }
  };

  function buildBuildingMesh(bld) {
    const s = BUILDING_STYLE[bld.type] || BUILDING_STYLE.house;
    const w = Math.max(1, bld.w || 4);
    const d = Math.max(1, bld.h || 4);
    const cx = bld.x + w / 2;
    const cz = bld.y + d / 2;
    const b = newBuffers();
    const wall = new T.Color(s.wall);
    const wallTop = new T.Color(s.wall).offsetHSL(0, 0, 0.05);
    pushBox(b, cx, s.h / 2, cz, w, s.h, d, wall, wallTop);
    const roof = new T.Color(s.roof);
    pushPyramid(b, cx, s.h, cz, w + 0.4, d + 0.4, s.roofH, roof);
    // door hint on the south face
    const door = new T.Color("#3c2410");
    pushBox(b, cx, 0.7, cz + d / 2 + 0.01, Math.min(1, w * 0.4), 1.3, 0.08, door);
    return buffersToMesh(b);
  }

  function syncBuildings(ctx) {
    const seen = new Set();
    for (const bld of ctx.buildings) {
      const key = bld.x + "," + bld.y;
      seen.add(key);
      if (!buildingMeshes.has(key)) {
        const mesh = buildBuildingMesh(bld);
        if (mesh) { buildingGroup.add(mesh); buildingMeshes.set(key, mesh); }
        else buildingMeshes.set(key, null);
      }
    }
    for (const [key, mesh] of buildingMeshes) {
      if (seen.has(key)) continue;
      if (mesh) { buildingGroup.remove(mesh); disposeMesh(mesh); }
      buildingMeshes.delete(key);
    }
  }

  // ── entities (players / npcs / mobs) ─────────────────────────────────────────
  function makeFigure(ent) {
    const g = new T.Group();
    const body = new T.Color(ent.body || "#8a8f98");
    const accent = new T.Color(ent.accent || ent.body || "#d8d8d8");
    const skin = new T.Color(ent.skin || "#e8b98a");

    if (ent.kind === "slime") {
      const mat = new T.MeshLambertMaterial({ color: body });
      const blob = new T.Mesh(new T.SphereGeometry(0.55, 12, 10), mat);
      blob.scale.set(1, 0.62, 1);
      blob.position.y = 0.34;
      g.add(blob);
      const eyeMat = new T.MeshLambertMaterial({ color: 0x101418 });
      for (const sx of [-0.18, 0.18]) {
        const eye = new T.Mesh(new T.SphereGeometry(0.07, 6, 6), eyeMat);
        eye.position.set(sx, 0.42, 0.42);
        g.add(eye);
      }
      g.userData.spin = false;
      return g;
    }

    const bodyMat = new T.MeshLambertMaterial({ color: body });
    const legMat = new T.MeshLambertMaterial({ color: accent.clone().offsetHSL(0, 0, -0.18) });
    const skinMat = new T.MeshLambertMaterial({ color: skin });
    const accentMat = new T.MeshLambertMaterial({ color: accent });

    const legs = new T.Mesh(new T.BoxGeometry(0.52, 0.55, 0.42), legMat);
    legs.position.y = 0.28; g.add(legs);
    const torso = new T.Mesh(new T.BoxGeometry(0.66, 0.75, 0.44), bodyMat);
    torso.position.y = 0.92; g.add(torso);
    // shoulders / arms
    for (const sx of [-0.46, 0.46]) {
      const arm = new T.Mesh(new T.BoxGeometry(0.22, 0.62, 0.3), bodyMat);
      arm.position.set(sx, 0.92, 0); g.add(arm);
    }
    const head = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.48), skinMat);
    head.position.y = 1.55; g.add(head);
    // facing marker (nose/visor) on +x so rotation reads clearly
    const nose = new T.Mesh(new T.BoxGeometry(0.14, 0.18, 0.16), accentMat);
    nose.position.set(0.26, 1.55, 0); g.add(nose);

    // class hat
    if (ent.classId === "mage") {
      const hat = new T.Mesh(new T.ConeGeometry(0.34, 0.7, 8), accentMat);
      hat.position.y = 2.05; g.add(hat);
    } else if (ent.classId === "knight") {
      const helm = new T.Mesh(new T.BoxGeometry(0.52, 0.3, 0.5), accentMat);
      helm.position.y = 1.86; g.add(helm);
      const crest = new T.Mesh(new T.BoxGeometry(0.12, 0.34, 0.46), new T.MeshLambertMaterial({ color: body }));
      crest.position.y = 2.12; g.add(crest);
    } else if (ent.classId === "ranger") {
      const hood = new T.Mesh(new T.ConeGeometry(0.32, 0.4, 6), accentMat);
      hood.position.y = 1.92; g.add(hood);
    }
    return g;
  }

  function syncEntities(ctx) {
    const seen = new Set();
    for (const ent of ctx.entities) {
      seen.add(ent.id);
      let fig = entityFigures.get(ent.id);
      if (!fig || fig.userData.kind !== ent.kind || fig.userData.classId !== ent.classId) {
        if (fig) { entityGroup.remove(fig); fig.traverse((o) => disposeMesh(o)); }
        fig = makeFigure(ent);
        fig.userData.kind = ent.kind;
        fig.userData.classId = ent.classId;
        const sc = ent.scale || 1;
        fig.scale.setScalar(sc);
        entityGroup.add(fig);
        entityFigures.set(ent.id, fig);
      }
      fig.position.set(ent.x, 0, ent.y);
      fig.rotation.y = -(ent.facing || 0);
      if (ent.kind === "slime") {
        const t = (performance.now() / 320) + (ent.bob || 0);
        fig.position.y = Math.abs(Math.sin(t)) * 0.18;
      } else if (ent.moving) {
        const t = (performance.now() / 130) + (ent.bob || 0);
        fig.position.y = Math.abs(Math.sin(t)) * 0.09;
      }
    }
    for (const [id, fig] of entityFigures) {
      if (seen.has(id)) continue;
      entityGroup.remove(fig);
      fig.traverse((o) => disposeMesh(o));
      entityFigures.delete(id);
    }
  }

  // ── camera ───────────────────────────────────────────────────────────────────
  function updateCamera(ctx) {
    const zoom = Math.max(0.32, Math.min(1.0, ctx.zoom || 1));
    const dist = 30 / zoom;
    const tx = ctx.camX, tz = ctx.camY;
    camera.position.set(tx, dist * 0.82, tz + dist * 0.62);
    camera.lookAt(tx, 0.6, tz - 1.5);
  }

  // ── public per-frame entry ────────────────────────────────────────────────────
  let lastTheme = null;
  function frame(ctx) {
    if (!ready) return;
    if (ctx.theme !== lastTheme) { applyTheme(ctx.theme); lastTheme = ctx.theme; }
    syncTerrain(ctx);
    syncBuildings(ctx);
    syncEntities(ctx);
    updateCamera(ctx);
    renderer.render(scene, camera);
  }

  // Drop cached world geometry (used on world/portal change so stale chunks/
  // buildings don't linger). Entities re-sync naturally next frame.
  function clearWorld() {
    for (const [, mesh] of chunkMeshes) { if (mesh) { terrainGroup.remove(mesh); disposeMesh(mesh); } }
    chunkMeshes.clear();
    for (const [, mesh] of buildingMeshes) { if (mesh) { buildingGroup.remove(mesh); disposeMesh(mesh); } }
    buildingMeshes.clear();
    for (const [, fig] of entityFigures) { entityGroup.remove(fig); fig.traverse((o) => disposeMesh(o)); }
    entityFigures.clear();
  }

  window.Render3D = {
    isSupported,
    attach,
    setSize,
    frame,
    clearWorld,
    isReady: () => ready
  };
})();
