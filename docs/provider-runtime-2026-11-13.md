# Provider runtime maintenance — 13 November 2026

This branch preserves application revision `2eacee93ad5e2a10d87349d0f150ddf96d504a3e`.
Only the Dockerfile's released provider versions change: official Node.js
22.23.5 Alpine, pinned by digest, and npm 12.2.2. npm's published engine range
supports this Node version. Dependencies remain at the existing package lock;
no application, database schema, asset or vendor source is patched.

Verification: `npm test` passed all 61 tests, including TypeScript checks, build,
protocol smoke tests, persistence and deterministic world tests. It ran on the
new Node/npm in a disconnected container with only temporary test data. Both
image stages built successfully. A first test fixture omitted the desktop
files; after including those files the complete unchanged suite passed.

Deployment requires a protected SQLite backup and isolated restore check,
matching application table counts, unchanged runtime settings and healthy
existing service endpoints. The legacy v2 workflow passes registry credentials
in SSH command arguments; it was not invoked by this maintenance branch.
