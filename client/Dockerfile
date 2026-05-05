FROM node:22-alpine

WORKDIR /app

COPY src ./src
COPY dev-server.js index.html styles.css ./

ENV CLIENT_HOST=0.0.0.0
ENV CLIENT_PORT=3000
ENV GAME_SERVER_URL=wss://balathor.edmundmurphy.com/ws

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD node -e "fetch('http://127.0.0.1:' + (process.env.CLIENT_PORT || 3000) + '/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dev-server.js"]
