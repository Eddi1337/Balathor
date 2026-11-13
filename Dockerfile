# Balathor v2: one image serves the web client, /health and the /ws game socket.
FROM docker.io/library/node:22.23.5-alpine@sha256:12f54cafa58d0e96554ae05871e29663ff7241836377dc9a7916449b8adb062c AS build
RUN npm install --global --ignore-scripts --no-audit --no-fund npm@12.2.2
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json build.mjs ./
COPY src ./src
RUN NODE_ENV=production node build.mjs

FROM docker.io/library/node:22.23.5-alpine@sha256:12f54cafa58d0e96554ae05871e29663ff7241836377dc9a7916449b8adb062c
RUN npm install --global --ignore-scripts --no-audit --no-fund npm@12.2.2
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/app/data \
    PUBLIC_DIR=/app/dist/public \
    NODE_NO_WARNINGS=1
# The server bundle includes its dependencies; no node_modules needed at runtime.
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/main.js"]
