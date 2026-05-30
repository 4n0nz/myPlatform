# RoshDynamics

A self-hosted live-streaming platform with a synchronized watch-party experience: an admin drives the playback and every viewer stays in sync. Built with Next.js, Firebase, and a self-hosted media server.

Live: **https://roshdynamics.anonymous.wtf**

---

## Features

### Playback & Sync
- **Synced YouTube watch-party** — the admin controls play / pause / seek and all viewers follow in real time.
- **Playlist support** — drop several YouTube links for a playlist with ⏮ ⏭ controls, synced to all viewers.
- **Multiple stream sources** (admin-configurable):
  - YouTube (single video or playlist)
  - Twitch / direct iframe URL
  - **Device camera** broadcast over WebRTC (WHIP) → MediaMTX → HLS

### Picture-in-Picture
- **Admin camera PiP** — overlay the admin camera on top of the YouTube video, draggable and **resizable** by the admin; position and size synced to all viewers.
- **Viewer camera PiP** — any authenticated viewer can join the live with their own camera; their stream broadcasts via WebRTC (WHIP) and appears as a PiP for everyone.
- **Admin controls all PiPs** — the admin can drag and resize every active PiP (admin + all viewer streams); positions and sizes are stored in Firestore and synced in real time.

### Social & Chat
- **Live chat** with real-time messages, friend requests, crews, and user roles (admin / vip / modo / user).
- **Custom profile** — emoji icon, color, display name.
- **Real-time viewer count** — presence tracking via Firestore (heartbeat every 30s, stale after 60s).

### Admin Controls
- **Stream source management** — set YouTube URL/playlist, Twitch channel, or camera mode from the in-app menu.
- **Announcement bar** — configure cycling messages (title + subtitle format) with a customizable interval (1–30 min); messages animate letter-by-letter from the right edge of the screen.
- **Chat moderation** — reset chat, change user roles.
- **PiP management** — toggle, drag, resize all PiPs from the player.

### UX
- **Persistent audio preference** — remembers whether the viewer had sound enabled across page reloads.
- **Animated letter intro** for announcement messages (letters fly in from the right with spin effect).
- **YouTube chrome masked** for viewers (end cards, share buttons, "More videos" hidden via box-shadow overlay).
- **Resizable chat panel** — drag the divider between stream and chat on desktop.
- **Dev access gate** with animated intro sequence.
- **Responsive** — stacked layout on mobile/tablet, resizable split on desktop.
- **5 placeholder nav buttons** — square icon buttons in the navbar, ready to wire up.
- **Left sidebar** — "Join the live" CTA: opens auth modal for guests, activates camera for logged-in viewers.

### Social preview
- Open Graph / Twitter cards with a generated brand image.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS |
| Auth & DB | Firebase Auth (Google + email/password) + Cloud Firestore |
| Media ingest | MediaMTX — WebRTC WHIP (admin + viewer cameras) + HLS egress |
| Audio transcode | ffmpeg — Opus → AAC for iOS/Safari HLS compatibility |
| Public HTTPS | Cloudflare Tunnel (no port-forwarding) |
| Process mgmt | nginx (`:80 → :3000`) + PM2 |

---

## Architecture

```
Browser (admin/viewer)               Browser (other viewers)
  |  WHIP (WebRTC, H.264)              |  HLS  (H.264 + AAC)
  v                                    ^
MediaMTX  --(cam, H264/Opus)-->  ffmpeg  --(cam2, H264/AAC)-->  MediaMTX HLS
  |
  |  Viewer streams: /mediamtx/viewer-{uid}/whip  (WHIP in)
  |                  /mediamtx/viewer-{uid}/whep  (WHEP out)
  |
Next.js app (:3000)  <--  nginx (:80)  <--  Cloudflare Tunnel  <--  Internet
        ^
        |  Firestore:
        |    config/stream     — source URL, type, playlist index, PiP position/size
        |    config/playback   — play state, timestamp (sync)
        |    config/announcements — cycling messages + interval
        |    presence/{sessionId} — viewer count (heartbeat)
        |    viewerStreams/{uid}  — active viewer cameras + position/size
        |    messages/           — chat
        |    users/              — profiles, roles, friends, crews
        |    friendRequests/     — pending friend requests
        |    crews/              — crew membership
```

---

## Project structure

```
app/
  page.tsx              # main orchestrator: auth, player, sync, PiP, presence, announcements
  layout.tsx            # metadata, Open Graph / Twitter cards
  opengraph-image.tsx   # generated social preview image
  globals.css           # global styles + keyframe animations
  components/
    PasswordGate.tsx    # dev access gate
    IntroAnimation.tsx  # animated intro
    AuthModal.tsx       # login / register modal
    LeftSidebar.tsx     # "Join the live" CTA (guests → auth, viewers → camera)
    ChatPanel.tsx       # live chat
    RightDrawer.tsx     # menu, friends, crews, admin controls (source, PiP, announcements)
  types.ts
  constants.ts
lib/
  firebase.ts
```

---

## Firestore rules

```js
rules_version =  2;
service cloud.firestore {
  match /databases/{database}/documents {
    // Stream config: public read (guests need stream source)
    match /config/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Presence (viewer count): public read/write
    match /presence/{sessionId} {
      allow read, write, delete: if true;
    }
    // Viewer streams: public read, authenticated write
    match /viewerStreams/{uid} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Everything else: authenticated only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Installation

### Prerequisites
- **Node.js 20+** and npm
- **ffmpeg** (`sudo apt install ffmpeg`)
- **PM2** (installed by setup script if missing)

### Quick install (Linux server)

```bash
git clone https://github.com/4n0nz/myPlatform.git
cd myPlatform
cp .env.example .env.local   # fill in Firebase config + dev password
./setup.sh
```

`setup.sh` installs dependencies, downloads & configures MediaMTX, builds the app, and starts both `platform` and `mediamtx` under PM2.

### `.env.local` variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_DEV_PASSWORD` | Password for the dev access gate |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web config |

After editing `.env.local`: `npm run build && pm2 restart platform`.

---

## Development

```bash
npm install
npm run dev    # http://localhost:3000
```

## Build & deploy

```bash
npm run build && pm2 restart platform
```

---

## Notes

- Camera broadcasting requires HTTPS (provided by Cloudflare Tunnel).
- Camera ingest works best on LAN — WebRTC media stays local, only signaling goes through the tunnel.
- Set `webrtcAdditionalHosts` in `mediamtx.yml` to the server LAN IP.
- Add your public hostname to **Firebase → Authentication → Authorized domains**.
- MediaMTX `all_others:` path allows viewer streams on dynamic paths (`viewer-{uid}`) without extra config.
ENDOFREADME
