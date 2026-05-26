# RoshDynamics — 5th Gen Warfare Platform

A self-hosted live-streaming platform with a synchronized watch-party experience: an admin drives the playback and every viewer stays in sync. Built with Next.js, Firebase, and a self-hosted media server.

Live: **https://roshdynamics.anonymous.wtf**

---

## Features

- **Synced YouTube watch-party** — the admin controls play / pause / seek and all viewers follow in real time. Drop several YouTube links to build a **playlist** with previous / next (⏮ ⏭) controls, also synced.
- **Multiple stream sources** (admin-configurable from the in-app menu):
  - YouTube (single video or playlist)
  - Twitch / direct iframe URL
  - **Device camera** broadcast over WebRTC (WHIP) → MediaMTX → HLS for viewers
- **Picture-in-Picture** — the admin can overlay their camera on top of the YouTube video and **drag it anywhere**; the position is synced to all viewers.
- **Live chat** with friend requests, crews, user roles (admin / vip / user), custom icon & color.
- **Dev access gate** with an animated intro.
- **Responsive** — resizable stream / chat split on desktop, stacked layout on tablet & phone.
- **Social preview** — Open Graph / Twitter cards with a generated brand image.

## Tech stack

- **Next.js 16** (App Router, `next start`)
- **Firebase** — Authentication (Google + email/password) and Cloud Firestore (real-time chat, stream config, social graph)
- **MediaMTX** — WebRTC (WHIP) ingest + HLS egress for the camera feed
- **ffmpeg** — continuous Opus → AAC transcode so camera audio plays over HLS everywhere (incl. iOS/Safari)
- **Cloudflare Tunnel** — public HTTPS without exposing the origin
- **nginx + PM2** — reverse proxy and process management
- **Tailwind CSS**

## Architecture

```
Browser (admin)                      Browser (viewers)
  |  WHIP (WebRTC, H.264)              |  HLS  (H.264 + AAC)
  v                                    ^
MediaMTX  --(cam, H264/Opus)-->  ffmpeg  --(cam2, H264/AAC)-->  MediaMTX HLS
  ^                                                                  |
  |  Next.js rewrites: /mediamtx -> :8889 (WHIP), /cam2 -> :8888 (HLS)
  |
Next.js app (:3000)  <--  nginx (:80)  <--  Cloudflare Tunnel  <--  Internet
        ^
        |  Firestore: config/stream (source, playlist index, PiP), config/playback (sync)
```

Playback state (current video, position, play/pause, PiP position) lives in Firestore and is streamed to clients via `onSnapshot`, which keeps every viewer in sync with the admin.

## Project structure

```
app/
  page.tsx              # main orchestrator: auth, stream player, sync, PiP, playlist
  layout.tsx            # metadata, Open Graph / Twitter cards
  opengraph-image.tsx   # generated social preview image
  globals.css
  components/
    PasswordGate.tsx
    IntroAnimation.tsx
    AuthModal.tsx
    LeftSidebar.tsx
    ChatPanel.tsx
    RightDrawer.tsx     # menu, friends, crews, admin source/PiP controls
  types.ts
  constants.ts
lib/
  firebase.ts
```

## Installation

### Prerequisites

- **Node.js 20+** and npm
- **ffmpeg** — for camera audio transcoding (`sudo apt install ffmpeg`)
- **PM2** — process manager (the setup script installs it if missing)

### Quick install (Linux server)

```bash
git clone https://github.com/4n0nz/myPlatform.git
cd myPlatform
cp .env.example .env.local      # then edit it (Firebase config + dev password)
./setup.sh
```

`setup.sh` installs dependencies, downloads & configures **MediaMTX**, builds the app, and starts both `platform` (the Next.js app) and `mediamtx` under PM2. The app runs on `http://localhost:3000`.

### Configuration — `.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_DEV_PASSWORD` | Password for the dev access gate |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web config (Firebase console → Project settings → your web app) |

In the Firebase console: enable **Google** + **Email/Password** auth, create a **Firestore** database, and allow public read of the `config` collection so guests receive the stream source:

```
match /config/{doc} { allow read: if true; allow write: if request.auth != null; }
```

After editing `.env.local`: `npm run build && pm2 restart platform`.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build & run

```bash
npm run build
npm run start      # serves the production build (required for rewrites / synced playback)
```

## Deployment — public HTTPS

The app sits behind nginx (`:80 → :3000`) and is exposed publicly via a **Cloudflare Tunnel** (free HTTPS, no port-forwarding). HTTPS is required for the camera feature (`getUserMedia`).

```bash
# Route a hostname to the local app through your named tunnel:
cloudflared tunnel route dns <tunnel> roshdynamics.example.com
```

```yaml
# /etc/cloudflared/config.yml
ingress:
  - hostname: roshdynamics.example.com
    service: http://localhost:3000
  - service: http_status:404
```

Add your public hostname to **Firebase → Authentication → Settings → Authorized domains** so Google sign-in works on it. In `mediamtx.yml`, set `webrtcAdditionalHosts` to the media server's LAN IP.

## Notes

- Camera broadcasting requires a secure context (HTTPS), which the Cloudflare Tunnel provides.
- Camera ingest works best when the broadcaster is on the same LAN as the media server (WebRTC media stays local; only signaling goes through the tunnel).
- Firestore rules must allow public read of the `config` collection so guests can receive the stream source.
