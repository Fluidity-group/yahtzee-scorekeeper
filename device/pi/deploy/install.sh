#!/bin/sh
# Run explicitly as root on the Pi from the verified, extracted release root.
set -eu
[ "$(id -u)" = 0 ] || { echo 'Run this installer with sudo.'; exit 1; }
[ -f release-manifest.json ] || { echo 'Run from the extracted release directory.'; exit 1; }
/usr/bin/node -e 'if(Number(process.versions.node.split(".")[0])!==24)throw Error("Node 24 required")'
/usr/bin/node device/pi/deploy/verify.mjs
getent passwd dice >/dev/null || useradd --system --create-home --home-dir /var/lib/dice-table --shell /usr/sbin/nologin dice
install -d -m 700 -o dice -g dice /var/lib/dice-table
install -d -m 750 -o root -g dice /etc/dice-table
release="$(/usr/bin/node -p 'JSON.parse(require("fs").readFileSync("release-manifest.json")).release')"
case "$release" in *[!a-zA-Z0-9._-]*|'') echo 'Invalid release name'; exit 1;; esac
target="/opt/dice-table/releases/$release"
[ ! -e "$target" ] || { echo 'Release already installed; choose a new release identifier.'; exit 1; }
mkdir -p "$target"
cp -R . "$target/"
chown -R root:root "$target"
ln -sfn "$target" /opt/dice-table/current
if [ ! -f /etc/dice-table/game.env ]; then
 umask 077
 { printf 'PI_SETUP_KEY='; /usr/bin/node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'; printf 'PI_GAME_FILE=/var/lib/dice-table/games.sqlite\nPI_GAME_BIND=0.0.0.0\nPI_GAME_PORT=8481\n'; } > /etc/dice-table/game.env
 chown root:dice /etc/dice-table/game.env
 chmod 640 /etc/dice-table/game.env
fi
install -m 644 device/pi/deploy/dice-game.service /etc/systemd/system/
install -m 644 device/pi/deploy/dice-camera.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now dice-game.service
echo 'Game host started on private-LAN port 8481. Setup key: sudo cat /etc/dice-table/game.env'
echo 'Install OS python3-picamera2 and python3-numpy, pair/download camera.json, then:'
echo 'sudo install -o root -g dice -m 640 camera.json /etc/dice-table/camera.json'
echo 'sudo systemctl enable --now dice-camera.service'
