# Balathor v2 (branch `v2`)

Ground-up rebuild of Balathor in TypeScript with a three.js client. v1 lives on `main`;
see `docs/V2_PLAN.md` for architecture and the milestone/parity plan.

## Working here

- `npm install`, then `npm run dev` (http://localhost:8080) or `npm run build && npm start`.
- `npm test` = typecheck + build + end-to-end smoke test + world-generation tests. Run it before committing.
- `DEV_COMMANDS=1` enables `/tp x y` and `/time t` for testing distant biomes / lighting.
- The wire protocol lives only in `src/shared/protocol.ts`; change it there and let the compiler
  find every call site. World generation in `src/shared/world` must stay deterministic and pure
  (client and server both run it).
- Each realm/interior should be its own map (`src/shared/world/maps.ts`), never an offset into
  another map's coordinates.

## Git workflow

Commit and push to `origin v2` after substantive changes; the push deploys to
`192.168.10.112:8084` (image `harbor.edmundmurphy.com/balathor/v2`). Never push v2 code to `main`.
