FROM node:22-alpine

WORKDIR /app

COPY src ./src

RUN mkdir -p /app/data

ENV HOST=0.0.0.0
ENV PORT=8080
ENV WORLD_DB_PATH=/app/data/world.sqlite

VOLUME ["/app/data"]


EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
