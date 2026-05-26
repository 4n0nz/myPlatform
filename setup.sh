#!/usr/bin/env bash
# RoshDynamics — one-shot setup: installs the Next.js app + MediaMTX media
# server and starts both under PM2. Run from the project root: ./setup.sh
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n\033[0;32m==> %s\033[0m\n' "$1"; }

say "Checking prerequisites"
command -v node >/dev/null || { echo "Node.js 20+ is required: https://nodejs.org"; exit 1; }
command -v npm  >/dev/null || { echo "npm is required"; exit 1; }
command -v ffmpeg >/dev/null || echo "WARNING: ffmpeg not found — camera audio (Opus->AAC) will not work. Install it (e.g. sudo apt install ffmpeg)."
if ! command -v pm2 >/dev/null; then say "Installing PM2 globally"; npm install -g pm2; fi

say "Installing dependencies"
npm install

if [ ! -f .env.local ]; then
  say "Creating .env.local from .env.example — edit it with your Firebase config & dev password"
  cp .env.example .env.local
fi

# --- MediaMTX (media server for the camera / PiP feature) ---
MTX_DIR="$HOME/mediamtx"
if [ ! -x "$MTX_DIR/mediamtx" ]; then
  say "Installing MediaMTX"
  mkdir -p "$MTX_DIR"
  ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
  case "$ARCH" in x86_64) ARCH=amd64;; aarch64) ARCH=arm64v8;; esac
  TAG="$(curl -fsSL https://api.github.com/repos/bluenviron/mediamtx/releases/latest | grep -oP '"tag_name":\s*"\K[^"]+')"
  curl -fsSL "https://github.com/bluenviron/mediamtx/releases/download/${TAG}/mediamtx_${TAG}_linux_${ARCH}.tar.gz" | tar xz -C "$MTX_DIR"
fi
cp mediamtx.yml "$MTX_DIR/mediamtx.yml"

say "Building the app"
npm run build

say "Starting services with PM2"
pm2 start npm --name platform -- start 2>/dev/null || pm2 restart platform
pm2 start "$MTX_DIR/mediamtx" --name mediamtx -- "$MTX_DIR/mediamtx.yml" 2>/dev/null || pm2 restart mediamtx
pm2 save

cat <<'DONE'

Setup complete. The app is running on http://localhost:3000

Next steps:
  1. Edit .env.local with your Firebase config and dev password, then re-run: npm run build && pm2 restart platform
  2. For public HTTPS access, put it behind a reverse proxy or a Cloudflare Tunnel (see the README).
  3. In mediamtx.yml, set webrtcAdditionalHosts to your media server's LAN IP.
DONE
