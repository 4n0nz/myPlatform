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

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

Create `lib/firebase.ts` with your own Firebase project config.

## Build & run

```bash
npm run build
npm run start      # serves the production build (required for rewrites / synced playback)
```

## Notes

- Camera broadcasting requires a secure context (HTTPS), which the Cloudflare Tunnel provides.
- Camera ingest works best when the broadcaster is on the same LAN as the media server (WebRTC media stays local; only signaling goes through the tunnel).
- Firestore rules must allow public read of the `config` collection so guests can receive the stream source.
