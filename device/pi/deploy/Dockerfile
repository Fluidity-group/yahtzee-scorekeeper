# Build from an extracted release, not from the development workspace.
FROM node:24-bookworm-slim
WORKDIR /app
COPY . .
RUN node device/pi/deploy/verify.mjs && mkdir /data && chown node:node /data
USER node
ENV PI_GAME_BIND=0.0.0.0 PI_GAME_PORT=8481 PI_GAME_FILE=/data/games.sqlite
EXPOSE 8481
CMD ["node", "device/pi/game-host.mjs"]
