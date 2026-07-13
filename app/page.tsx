'use client'
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import { LogIn, User, LogOut } from 'lucide-react'
import {
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  collection, addDoc, query, orderBy, limit, onSnapshot,
  serverTimestamp, doc, getDoc, setDoc, getDocs, updateDoc,
  where, arrayUnion, writeBatch, deleteDoc, deleteField,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import app from '@/lib/firebase'
import { ADMIN_EMAILS } from './constants'

import PasswordGate from './components/PasswordGate'
import IntroAnimation from './components/IntroAnimation'
import AuthModal from './components/AuthModal'
import LeftSidebar from './components/LeftSidebar'
import ChatPanel from './components/ChatPanel'
import RightDrawer from './components/RightDrawer'

import type {
  UserRole, Message, FriendReq, Friend,
  Crew, CrewMember, PublicCrew, AdminUser, Poll, Schedule, AppNotification,
} from './types'

function getYouTubeIds(text: string): string[] {
  if (!text) return []
  const re = /(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g
  const ids: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) ids.push(m[1])
  return ids
}


function ScheduleLines({ lines }: { lines: { text: string; format: string }[] }) {
  const cls = (f: string) => f === 'titre' ? 'text-2xl font-bold' : f === 'soustitre' ? 'text-lg font-bold text-[#00ff41]/80' : 'text-sm text-[#00ff41]/55'
  return (
    <>
      {lines.map((l, i) => {
        const ll = l as { text?: string; format?: string } | string
        const text = typeof ll === 'string' ? ll : (ll.text ?? '')
        const fmt = typeof ll === 'string' ? 'paragraphe' : (ll.format ?? 'paragraphe')
        return <div key={i} className={cls(fmt) + ' tracking-wide'}>{text}</div>
      })}
    </>
  )
}

// ── ViewerStream: WHEP consumer for a single remote viewer camera ─────────────
function ViewerStream({ uid, name }: { uid: string; name: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const pc = new RTCPeerConnection()
    const stream = new MediaStream()
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })
    pc.ontrack = e => stream.addTrack(e.track)
    ;(async () => {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await new Promise<void>(res => {
        if (pc.iceGatheringState === 'complete') { res(); return }
        const fn = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', fn); res() } }
        pc.addEventListener('icegatheringstatechange', fn)
        setTimeout(res, 2000)
      })
      if (cancelled) { pc.close(); return }
      const resp = await fetch(`/mediamtx/viewer-${uid}/whep`, {
        method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: pc.localDescription!.sdp,
      })
      if (!resp.ok) { pc.close(); return }
      await pc.setRemoteDescription({ type: 'answer', sdp: await resp.text() })
      if (cancelled) { pc.close(); return }
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}) }
      setReady(true)
    })()
    return () => { cancelled = true; pc.close(); setReady(false) }
  }, [uid])

  return (
    <div className='w-full h-full relative'>
      <video ref={videoRef} autoPlay muted playsInline className='w-full h-full object-cover' style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.3s' }} />
      <div className='absolute bottom-0.5 left-1 right-1 text-[8px] text-[#00ff41]/60 tracking-widest pointer-events-none truncate'>{name}</div>
      {!ready && <div className='absolute inset-0 flex items-center justify-center text-[8px] text-[#00ff41]/30 tracking-widest'>CONNEXION…</div>}
    </div>
  )
}

export default function Home() {
  // ── Auth & gate ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState<'login' | 'register' | null>(null)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const isHost = userRole === 'admin' || ADMIN_EMAILS.includes(user?.email ?? '')
  const [chatWidth, setChatWidth] = useState(440)
  const [chatPopupOpen, setChatPopupOpen] = useState(false)
  const [rightPanel, setRightPanel] = useState<'cams' | 'chat'>('chat')
  const [viewerCount, setViewerCount] = useState<number | null>(null)
  const presenceIdRef = useRef<string | null>(null)
  const annBarRef = useRef<HTMLDivElement | null>(null)
  const ghostModeRef = useRef(false)
  const streamVolumeRef = useRef(100)
  const notifPrevLenRef = useRef(0)
  const [announcements, setAnnouncements] = useState<{ messages: string[]; interval: number } | null>(null)
  const [restream, setRestream] = useState<{ tiktok: boolean; youtube: boolean; facebook: boolean; x: boolean; luxmedia: boolean }>({ tiktok: false, youtube: false, facebook: false, x: false, luxmedia: false })
  const [restreamKeys, setRestreamKeys] = useState<Record<'tiktok' | 'youtube' | 'facebook' | 'x' | 'luxmedia', { url: string; keySet: boolean; keyHint: string }> | null>(null)
  const [annIndex, setAnnIndex] = useState(0)

  useEffect(() => {
    if (sessionStorage.getItem('dev_unlocked') === '1') setUnlocked(true)
  }, [])

  // Resizable chat width (desktop): user drags the divider between stream and chat
  useEffect(() => {
    const saved = Number(localStorage.getItem('chat_width_v10'))
    if (saved >= 260) setChatWidth(saved)
  }, [])
  useEffect(() => { localStorage.setItem('chat_width_v10', String(chatWidth)) }, [chatWidth])

  // ── Presence: write session on mount, heartbeat every 30s, delete on unload ──
  useEffect(() => {
    if (!unlocked) return
    let sessionId = sessionStorage.getItem('rd_session_id')
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('rd_session_id', sessionId)
    }
    presenceIdRef.current = sessionId
    const presenceRef = doc(db, 'presence', sessionId)
    const IDLE_MS = 5 * 60_000
    let lastActivity = Date.now()
    const bump = () => { lastActivity = Date.now() }
    const write = () => {
      if (ghostModeRef.current) return
      if (document.hidden || Date.now() - lastActivity > IDLE_MS) { deleteDoc(presenceRef).catch(() => {}); return }
      setDoc(presenceRef, { lastSeen: serverTimestamp() }, { merge: false }).catch(() => {})
    }
    write()
    const hb = setInterval(write, 30000)
    const remove = () => {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'myplateform-792dd'
      fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/presence/${sessionId}`,
        { method: 'DELETE', keepalive: true }
      ).catch(() => {})
    }
    const onVis = () => { if (document.hidden) deleteDoc(presenceRef).catch(() => {}); else { bump(); write() } }
    const acts = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll']
    window.addEventListener('beforeunload', remove)
    window.addEventListener('pagehide', remove)
    document.addEventListener('visibilitychange', onVis)
    acts.forEach(e => window.addEventListener(e, bump, { passive: true }))
    return () => {
      clearInterval(hb)
      window.removeEventListener('beforeunload', remove)
      window.removeEventListener('pagehide', remove)
      document.removeEventListener('visibilitychange', onVis)
      acts.forEach(e => window.removeEventListener(e, bump))
      deleteDoc(presenceRef).catch(() => {})
    }
  }, [unlocked])

  // ── Remote viewer streams ────────────────────────────────────────────────────
  useEffect(() => {
    return onSnapshot(collection(db, 'viewerStreams'), snap => {
      const active = snap.docs
        .filter(d => d.data().active === true)
        .map(d => ({ uid: d.id, name: d.data().name as string, x: d.data().x ?? 5, y: d.data().y ?? 5, w: d.data().w ?? 18 }))
      setRemoteViewers(active)
    }, () => {})
  }, [])

  // ── Presence: count active viewers (docs updated in last 60s) ───────────────
  useEffect(() => {
    const STALE_MS = 60_000
    return onSnapshot(collection(db, 'presence'), snap => {
      const now = Date.now()
      setViewerCount(snap.docs.filter(d => {
        const ls = d.data().lastSeen?.toMillis?.()
        return ls && (now - ls) < STALE_MS
      }).length)
    }, () => {})
  }, [])

  // ── Announcements: sync from Firestore + cycle with fade ────────────────────
  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'announcements'), snap => {
      if (snap.exists()) {
        const d = snap.data()
        setAnnouncements({ messages: d.messages ?? [], interval: d.interval ?? 300 })
        setAnnIndex(0)
      } else {
        setAnnouncements(null)
      }
    }, () => {})
  }, [])

  // ── Restream: sync platform toggles from Firestore ──────────────────
  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'restream'), snap => {
      const d = snap.data()
      setRestream({ tiktok: !!d?.tiktok, youtube: !!d?.youtube, facebook: !!d?.facebook, x: !!d?.x, luxmedia: !!d?.luxmedia })
    }, () => {})
  }, [])

  useEffect(() => {
    const msgs = announcements?.messages
    if (!msgs || msgs.length <= 1) return
    const iv = (announcements?.interval ?? 300) * 1000
    const timer = setInterval(() => {
      setAnnIndex(i => (i + 1) % msgs.length)
    }, iv)
    return () => clearInterval(timer)
  }, [announcements])

  // WAAPI: animate each letter from the right edge of the bar to its natural position
  useEffect(() => {
    const bar = annBarRef.current
    if (!bar) return
    const spans = Array.from(bar.querySelectorAll<HTMLElement>('[data-ann-letter]'))
    if (!spans.length) return
    const screenRight = window.innerWidth
    spans.forEach((span, i) => {
      const rect = span.getBoundingClientRect()
      const startX = screenRight - rect.left + 60
      span.animate(
        [
          { transform: `translateX(${startX}px) rotate(540deg) scale(0.3)`, opacity: '0' },
          { transform: 'translateX(0) rotate(0deg) scale(1)', opacity: '1' },
        ],
        { duration: 900, delay: i * 55, easing: 'cubic-bezier(0.15, 0.85, 0.3, 1)', fill: 'forwards' }
      )
    })
  }, [annIndex, announcements])

  const onResizeStart = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    const apply = (clientX: number) => {
      const max = Math.round(window.innerWidth * 0.7)
      setChatWidth(Math.max(260, Math.min(max, Math.round(window.innerWidth - clientX))))
    }
    const mm = (ev: MouseEvent) => apply(ev.clientX)
    const tm = (ev: TouchEvent) => { if (ev.touches[0]) apply(ev.touches[0].clientX) }
    const stop = () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('touchmove', tm)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchend', stop)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('touchmove', tm, { passive: false })
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchend', stop)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  // ── UI state ─────────────────────────────────────────────────────────────
  const [intro, setIntro] = useState(true)
  const handleIntroDone = useCallback(() => setIntro(false), [])
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [rightTab, setRightTab] = useState<'menu' | 'amis' | 'crew'>('menu')
  const [menuSection, setMenuSection] = useState<'profil' | 'notifications' | 'parametres' | 'historique' | 'source' | 'annonces' | 'sondage' | 'programme' | 'pip' | 'restream' | null>(null)

  // ── Profile state ─────────────────────────────────────────────────────────
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null)
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [chatFontSize, setChatFontSize] = useState<'S' | 'M' | 'L'>('M')
  const [streamVolume, setStreamVolume] = useState(100)
  const [notifSound, setNotifSound] = useState(false)
  const [ghostMode, setGhostMode] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<Array<{ uid: string; name: string }>>([])
  const [fcmEnabled, setFcmEnabled] = useState(false)
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([])
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [userIcon, setUserIcon] = useState('')
  const [userColor, setUserColor] = useState('#00ff41')

  // ── Stream source ─────────────────────────────────────────────────────────
  const [streamUrl, setStreamUrl] = useState('')
  const [streamTitle, setStreamTitle] = useState('')
  const [streamType, setStreamType] = useState<'youtube' | 'camera' | 'screen'>('youtube')
  const [fallbackUrl, setFallbackUrl] = useState('')
  const [live, setLive] = useState(false)
  const fallbackUrlRef = useRef('')
  const switchingSourceRef = useRef(false)
  useEffect(() => { fallbackUrlRef.current = fallbackUrl }, [fallbackUrl])
  const [broadcasting, setBroadcasting] = useState(false)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const authTokenRef = useRef<string>('')  // kept fresh for keepalive fetch on unload

  // ── YouTube synced playback (admin = host, viewers follow) ─────────────────
  const [ytApiReady, setYtApiReady] = useState(false)
  const [viewerUnmuted, setViewerUnmuted] = useState(false)  // true = user wants sound on
  const ytWrapRef = useRef<HTMLDivElement | null>(null)
  const ytPlayerRef = useRef<unknown>(null)
  const playbackRef = useRef<{ playing?: boolean; time?: number; videoId?: string; updatedAt?: { seconds: number } } | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const playlist = streamType === 'youtube' ? getYouTubeIds(streamUrl) : []
  const ytVideoId = playlist.length ? (playlist[Math.min(currentIndex, playlist.length - 1)] ?? null) : null

  // ── Picture-in-Picture: admin camera overlaid on the YouTube video ─────────
  const [pipEnabled, setPipEnabled] = useState(false)
  const [pipSwapped, setPipSwapped] = useState(false)
  const [pipStreamReady, setPipStreamReady] = useState(false)
  const [pipX, setPipX] = useState(72)
  const [pipY, setPipY] = useState(66)
  const [pipDragging, setPipDragging] = useState(false)
  const [pipResizing, setPipResizing] = useState(false)
  const [pipW, setPipW] = useState(24)
  const pipWRef = useRef(24)
  const pipVideoRef = useRef<HTMLVideoElement | null>(null)
  const playerBoxRef = useRef<HTMLDivElement | null>(null)
  const pipPosRef = useRef({ x: 72, y: 66 })
  const [viewerPipActive, setViewerPipActive] = useState(false)
  const viewerPipVideoRef = useRef<HTMLVideoElement | null>(null)
  const adminPipVideoRef = useRef<HTMLVideoElement | null>(null)
  const viewerStreamRef = useRef<MediaStream | null>(null)
  const viewerWhipPcRef = useRef<RTCPeerConnection | null>(null)
  const [remoteViewers, setRemoteViewers] = useState<Array<{ uid: string; name: string; x: number; y: number; w: number }>>([])
  const viewerResizeWRef = useRef(18)
  const [viewerDragUid, setViewerDragUid] = useState<string | null>(null)
  const viewerDragPosRef = useRef({ x: 5, y: 5 })
  const isResizingRef = useRef(false)
  const pipLatencyRef = useRef(0)
  const pipEnabledRef = useRef(false)
  const whepPcRef = useRef<RTCPeerConnection | null>(null)

  const syncViewer = useCallback(() => {
    const d = playbackRef.current
    const player = ytPlayerRef.current as { getCurrentTime?: () => number; getPlayerState?: () => number; seekTo?: (t: number, allow: boolean) => void; playVideo?: () => void; pauseVideo?: () => void } | null
    if (!d || !player || typeof player.getCurrentTime !== 'function') return
    if (d.videoId && ytVideoId && d.videoId !== ytVideoId) return
    const nowSec = Date.now() / 1000
    const ts = d.updatedAt?.seconds ?? nowSec
    const elapsed = d.playing ? Math.max(0, nowSec - ts) : 0
    const pipOffset = (pipEnabledRef.current && !!d.playing) ? pipLatencyRef.current : 0
    const target = (d.time ?? 0) + elapsed - pipOffset
    const cur = player.getCurrentTime() || 0
    if (Math.abs(cur - target) > 1.5) { try { player.seekTo?.(target, true) } catch {} }
    const st = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1
    if (d.playing && st !== 1) { try { player.playVideo?.() } catch {} }
    else if (!d.playing && st === 1) { try { player.pauseVideo?.() } catch {} }
  }, [ytVideoId])

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const resettingChat = useRef(false)
  const [chatFullscreen, setChatFullscreen] = useState(false)
  const [userPopup, setUserPopup] = useState<{ uid: string; name: string } | null>(null)
  const [poll, setPoll] = useState<Poll | null>(null)
  const [annPollSlot, setAnnPollSlot] = useState<'poll' | 'ann'>('poll')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [mutedUntil, setMutedUntil] = useState<Date | null>(null)
  const [isBanned, setIsBanned] = useState(false)

  // ── Social state ──────────────────────────────────────────────────────────
  const [incomingFriendReqs, setIncomingFriendReqs] = useState<FriendReq[]>([])
  const [sentReqUids, setSentReqUids] = useState<string[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [myCrewId, setMyCrewId] = useState<string | null>(null)
  const [myCrew, setMyCrew] = useState<Crew | null>(null)
  const [publicCrews, setPublicCrews] = useState<PublicCrew[]>([])
  const [showCrewCreate, setShowCrewCreate] = useState(false)
  const [crewNameInput, setCrewNameInput] = useState('')
  const [crewTagInput, setCrewTagInput] = useState('')

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    setShowTimestamps(localStorage.getItem('rd_timestamps') === 'true')
    if (localStorage.getItem('rd_unmuted') === 'true') setViewerUnmuted(true)
    const fs = localStorage.getItem('rd_chatFontSize')
    if (fs === 'S' || fs === 'M' || fs === 'L') setChatFontSize(fs)
      const vol = Number(localStorage.getItem('rd_volume'))
    if (!isNaN(vol) && vol >= 0 && vol <= 100) setStreamVolume(vol)
    if (localStorage.getItem('rd_notifSound') === 'true') setNotifSound(true)
    if (localStorage.getItem('rd_ghostMode') === 'true') setGhostMode(true)
    if (localStorage.getItem('rd_fcmEnabled') === 'true') setFcmEnabled(true)
    try {
      const blocked = JSON.parse(localStorage.getItem('rd_blocked') ?? '[]')
      if (Array.isArray(blocked)) setBlockedUsers(blocked)
    } catch {}
  }, [])

  // Sync refs
  useEffect(() => { ghostModeRef.current = ghostMode }, [ghostMode])
  useEffect(() => { streamVolumeRef.current = streamVolume; localStorage.setItem('rd_volume', String(streamVolume)) }, [streamVolume])

  // Ghost mode: delete/restore presence
  useEffect(() => {
    if (!presenceIdRef.current) return
    if (ghostMode) {
      deleteDoc(doc(db, 'presence', presenceIdRef.current)).catch(() => {})
    } else {
      setDoc(doc(db, 'presence', presenceIdRef.current), { lastSeen: serverTimestamp() }, { merge: false }).catch(() => {})
    }
  }, [ghostMode])

  // YT volume: apply when slider changes
  useEffect(() => {
    const p = ytPlayerRef.current as { setVolume?: (v: number) => void } | null
    p?.setVolume?.(streamVolume)
  }, [streamVolume])

  // Notification sound: beep on new messages from others
  useEffect(() => {
    if (messages.length <= notifPrevLenRef.current) { notifPrevLenRef.current = messages.length; return }
    const newMsgs = messages.slice(notifPrevLenRef.current)
    notifPrevLenRef.current = messages.length
    if (!notifSound) return
    if (!newMsgs.some(m => m.uid !== user?.uid)) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx() as AudioContext
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = 880
      gain.gain.setValueAtTime(0.07, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start(); osc.stop(ctx.currentTime + 0.2)
      setTimeout(() => ctx.close().catch(() => {}), 500)
    } catch {}
  }, [messages, notifSound, user?.uid])

  // Stream source — live sync so every open client updates instantly (no reload needed)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'stream'),
      snap => {
        if (snap.exists()) {
          const d = snap.data()
          setStreamUrl(d.url ?? '')
          setStreamTitle(d.title ?? '')
          setStreamType(d.type ?? 'youtube')
          setFallbackUrl(d.fallbackUrl ?? '')
          setLive(!!d.live)
          if (typeof d.index === 'number') setCurrentIndex(d.index)
          setPipEnabled(!!d.pip)
          setPipSwapped(!!d.pipSwapped)
          if (typeof d.pipX === 'number') { setPipX(d.pipX); pipPosRef.current.x = d.pipX }
          if (typeof d.pipY === 'number') { setPipY(d.pipY); pipPosRef.current.y = d.pipY }
          if (typeof d.pipW === 'number') { setPipW(d.pipW); pipWRef.current = d.pipW }
        }
      },
      () => {}
    )
    return () => unsub()
  }, [])

  // Viewer playback: WHEP (WebRTC ~temps réel) d'abord, fallback HLS si hors LAN
  useEffect(() => {
    if ((streamType !== 'camera' && streamType !== 'screen') || broadcasting) return
    const video = cameraVideoRef.current
    if (!video) return
    const src = '/cam2/index.m3u8'
    let hls: { destroy: () => void } | null = null
    let pc: RTCPeerConnection | null = null
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | null = null

    async function startWhep(vid: HTMLVideoElement): Promise<boolean> {
      try {
        const p = new RTCPeerConnection()
        pc = p
        const stream = new MediaStream()
        p.addTransceiver('video', { direction: 'recvonly' })
        p.addTransceiver('audio', { direction: 'recvonly' })
        p.ontrack = e => stream.addTrack(e.track)
        await p.setLocalDescription(await p.createOffer())
        await new Promise<void>(res => {
          if (p.iceGatheringState === 'complete') { res(); return }
          const fn = () => { if (p.iceGatheringState === 'complete') { p.removeEventListener('icegatheringstatechange', fn); res() } }
          p.addEventListener('icegatheringstatechange', fn)
          setTimeout(res, 2000)
        })
        if (cancelled) { p.close(); return false }
        const resp = await fetch('/mediamtx/cam/whep', { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: p.localDescription!.sdp })
        if (!resp.ok) { p.close(); return false }
        await p.setRemoteDescription({ type: 'answer', sdp: await resp.text() })
        await new Promise<void>((res, rej) => {
          if (p.connectionState === 'connected') { res(); return }
          const fn = () => {
            if (p.connectionState === 'connected') { p.removeEventListener('connectionstatechange', fn); res() }
            if (['failed','closed','disconnected'].includes(p.connectionState)) { p.removeEventListener('connectionstatechange', fn); rej(new Error(p.connectionState)) }
          }
          p.addEventListener('connectionstatechange', fn)
          setTimeout(() => rej(new Error('timeout')), 5000)
        })
        if (cancelled) { p.close(); return false }
        vid.muted = true
        vid.setAttribute('playsinline', '')
        vid.srcObject = stream
        await vid.play().catch(() => {})
        return true
      } catch { return false }
    }

    ;(async () => {
      if (await startWhep(video)) return
      if (cancelled) return
      // Fallback HLS (latence plus haute) si WHEP échoue (viewer hors LAN)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.muted = true
        video.setAttribute('playsinline', '')
        let tries = 0
        const load = () => { if (cancelled) return; video.src = src; video.play().catch(() => {}) }
        video.onerror = () => { if (!cancelled && tries++ < 30) retry = setTimeout(load, 1500) }
        load()
      } else {
        const Hls = (await import('hls.js')).default
        if (cancelled || !Hls.isSupported()) return
        const h = new Hls({ lowLatencyMode: true, backBufferLength: 10 })
        h.loadSource(src)
        h.attachMedia(video)
        h.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}) })
        hls = h
      }
    })()

    return () => {
      cancelled = true
      if (retry) clearTimeout(retry)
      video.onerror = null
      if (pc) { try { pc.close() } catch {} }
      hls?.destroy()
      if (video.srcObject) video.srcObject = null
      video.removeAttribute('src')
      video.load()
    }
  }, [streamType, broadcasting])

  // PiP — admin: show own camera locally in the PiP box
  useEffect(() => {
    if (!broadcasting || !pipEnabled) return
    const v = pipVideoRef.current
    if (v && localStreamRef.current) { v.srcObject = localStreamRef.current; v.muted = true }
  }, [broadcasting, pipEnabled, ytVideoId])

  // Admin: rattache le flux de diffusion au player principal (couvre le cas video montee apres startBroadcast)
  useEffect(() => {
    if (!broadcasting || (streamType !== 'camera' && streamType !== 'screen')) return
    const v = cameraVideoRef.current
    if (v && localStreamRef.current) { v.srcObject = localStreamRef.current; v.muted = true }
  }, [broadcasting, streamType])

  useEffect(() => { pipEnabledRef.current = pipEnabled; if (!pipEnabled) setPipStreamReady(false) }, [pipEnabled])

  useEffect(() => {
    if (viewerPipActive && viewerPipVideoRef.current && viewerStreamRef.current) {
      viewerPipVideoRef.current.srcObject = viewerStreamRef.current
    }
  }, [viewerPipActive, chatPopupOpen])

  useEffect(() => {
    if (viewerPipActive && adminPipVideoRef.current && viewerStreamRef.current) {
      adminPipVideoRef.current.srcObject = viewerStreamRef.current
      adminPipVideoRef.current.muted = true
    }
  }, [viewerPipActive, streamType])

  useEffect(() => {
    setRightPanel(chatPopupOpen ? 'cams' : 'chat')
  }, [chatPopupOpen])

  // Track previous isHost to detect sign-out transition
  const wasHostRef = useRef(false)
  useEffect(() => {
    if (isHost) {
      // Admin loaded/reloaded — reset pip
      setDoc(doc(db, 'config', 'stream'), { pip: false, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
      wasHostRef.current = true
    } else if (wasHostRef.current) {
      // Admin just signed out or auth expired — stop camera, keep stream source
      stopBroadcast()
      setDoc(doc(db, 'config', 'stream'), { pip: false, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
      wasHostRef.current = false
    }
  }, [isHost])

  // Keep auth token fresh so it's available during beforeunload (async getIdToken won't work then)
  useEffect(() => {
    return onIdTokenChanged(auth, async u => {
      authTokenRef.current = u ? await u.getIdToken() : ''
    })
  }, [])

  // Clear stream URL + pip via Firestore REST API when admin closes/leaves the page.
  // Uses fetch keepalive so the request completes even if the page is unloading.
  useEffect(() => {
    if (!isHost) return
    const clearStream = () => {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'myplateform-792dd'
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/config/stream`
        + '?updateMask.fieldPaths=pip'
      fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authTokenRef.current}` },
        body: JSON.stringify({ fields: { pip: { booleanValue: false } } }),
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener('beforeunload', clearStream)
    window.addEventListener('pagehide', clearStream)
    return () => {
      window.removeEventListener('beforeunload', clearStream)
      window.removeEventListener('pagehide', clearStream)
    }
  }, [isHost])

  // Stop viewer broadcast on page unload
  useEffect(() => {
    if (!user || isHost) return
    const stop = () => {
      if (!viewerPipActive) return
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'myplateform-792dd'
      fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/viewerStreams/${user.uid}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authTokenRef.current}` },
          body: JSON.stringify({ fields: { active: { booleanValue: false } } }), keepalive: true }
      ).catch(() => {})
    }
    window.addEventListener('beforeunload', stop)
    window.addEventListener('pagehide', stop)
    return () => { window.removeEventListener('beforeunload', stop); window.removeEventListener('pagehide', stop) }
  }, [user, isHost, viewerPipActive])

  // PiP — viewers: WebRTC (WHEP, ~100 ms) first; fall back to LL-HLS if not on LAN
  useEffect(() => {
    if (!pipEnabled || broadcasting || streamType !== 'youtube') return
    const video = pipVideoRef.current
    if (!video) return
    let hls: { destroy: () => void } | null = null
    let cancelled = false

    async function startWhep(vid: HTMLVideoElement): Promise<boolean> {
      try {
        const pc = new RTCPeerConnection()
        const stream = new MediaStream()
        pc.addTransceiver('video', { direction: 'recvonly' })
        pc.addTransceiver('audio', { direction: 'recvonly' })
        pc.ontrack = e => stream.addTrack(e.track)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        // Wait for ICE gathering (2 s max)
        await new Promise<void>(res => {
          if (pc.iceGatheringState === 'complete') { res(); return }
          const fn = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', fn); res() } }
          pc.addEventListener('icegatheringstatechange', fn)
          setTimeout(res, 2000)
        })
        if (cancelled) { pc.close(); return false }
        const resp = await fetch('/mediamtx/cam/whep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription!.sdp,
        })
        if (!resp.ok) { pc.close(); return false }
        const sdp = await resp.text()
        await pc.setRemoteDescription({ type: 'answer', sdp })
        // Wait for connected (5 s max)
        await new Promise<void>((res, rej) => {
          if (pc.connectionState === 'connected') { res(); return }
          const fn = () => {
            if (pc.connectionState === 'connected') { pc.removeEventListener('connectionstatechange', fn); res() }
            if (['failed','closed','disconnected'].includes(pc.connectionState)) { pc.removeEventListener('connectionstatechange', fn); rej(new Error(pc.connectionState)) }
          }
          pc.addEventListener('connectionstatechange', fn)
          setTimeout(() => rej(new Error('timeout')), 5000)
        })
        if (cancelled) { pc.close(); return false }
        vid.muted = true
        vid.setAttribute('playsinline', '')
        vid.srcObject = stream
        await vid.play().catch(() => {})
        pipLatencyRef.current = 0  // WebRTC = real-time, no offset needed
        whepPcRef.current = pc
        setPipStreamReady(true)
        return true
      } catch { return false }
    }

    ;(async () => {
      const ok = await startWhep(video)
      if (ok || cancelled) return

      // WHEP failed (viewer not on LAN) — fall back to LL-HLS
      const src = '/cam2/index.m3u8'
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.muted = true
        video.setAttribute('playsinline', '')
        pipLatencyRef.current = 2
        const ready = () => {
          setPipStreamReady(true)
          const buf = video.buffered
          if (buf.length > 0) {
            const measured = buf.end(buf.length - 1) - video.currentTime + 0.5
            pipLatencyRef.current = Math.max(0.5, Math.min(measured, 10))
          }
        }
        video.addEventListener('canplay', ready)
        video.addEventListener('loadeddata', ready)
        video.addEventListener('playing', ready)
        let tries = 0
        const load = () => { if (cancelled) return; video.src = src; video.load(); video.play().catch(() => {}) }
        video.onerror = () => { if (!cancelled && tries++ < 30) setTimeout(load, 1500) }
        load()
        setTimeout(() => { if (!cancelled) { setPipStreamReady(true); video.play().catch(() => {}) } }, 2500)
      } else {
        const Hls = (await import('hls.js')).default
        if (cancelled || !Hls.isSupported()) return
        const h = new Hls({ lowLatencyMode: true, backBufferLength: 10 })
        h.loadSource(src)
        h.attachMedia(video)
        h.on(Hls.Events.FRAG_CHANGED, () => {
          setPipStreamReady(true)
          if (h.latency > 0 && h.latency < 30) pipLatencyRef.current = h.latency
        })
        hls = h
      }
    })()

    return () => {
      cancelled = true
      video.onerror = null
      whepPcRef.current?.close(); whepPcRef.current = null
      hls?.destroy()
      video.srcObject = null
      video.removeAttribute('src')
      video.load()
      pipLatencyRef.current = 0
      setPipStreamReady(false)
    }
  }, [pipEnabled, broadcasting, streamType, ytVideoId])

  // Load the YouTube IFrame API once
  useEffect(() => {
    const w = window as unknown as { YT?: { Player?: unknown }; onYouTubeIframeAPIReady?: () => void }
    if (w.YT?.Player) { setYtApiReady(true); return }
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => { if (typeof prev === 'function') prev(); setYtApiReady(true) }
    if (!document.getElementById('yt-iframe-api')) {
      const s = document.createElement('script')
      s.id = 'yt-iframe-api'
      s.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(s)
    }
  }, [])

  // Create the YT player; host broadcasts state, viewers get a locked player
  useEffect(() => {
    if (!ytApiReady || !ytVideoId || !ytWrapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const wrap = ytWrapRef.current
    const inner = document.createElement('div')
    inner.style.width = '100%'; inner.style.height = '100%'
    wrap.appendChild(inner)
    let hb: ReturnType<typeof setInterval> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writePlayback = (playing: boolean, p: any) => {
      if (!isHost) return
      setDoc(doc(db, 'config', 'playback'), {
        playing,
        time: typeof p.getCurrentTime === 'function' ? p.getCurrentTime() : 0,
        videoId: ytVideoId,
        updatedAt: serverTimestamp(),
      }).catch(() => {})
    }
    const player = new w.YT.Player(inner, {
      videoId: ytVideoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1, mute: 1,
        controls: isHost ? 1 : 0,
        disablekb: isHost ? 0 : 1,
        rel: 0, modestbranding: 1, playsinline: 1, fs: isHost ? 1 : 0,
      },
      events: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onReady: (e: any) => { if (!isHost) syncViewer(); try { e.target.setVolume(streamVolumeRef.current) } catch {} },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (e: any) => {
          if (!isHost) return
          const YT = w.YT
          if (e.data === YT.PlayerState.PLAYING) {
            writePlayback(true, player)
            if (hb) clearInterval(hb)
            hb = setInterval(() => writePlayback(true, player), 4000)
          } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
            if (hb) { clearInterval(hb); hb = null }
            writePlayback(false, player)
          }
        },
      },
    })
    ytPlayerRef.current = player
    return () => {
      if (hb) clearInterval(hb)
      try { player.destroy() } catch {}
      ytPlayerRef.current = null
    }
  }, [ytApiReady, ytVideoId, isHost, syncViewer])

  // Viewers: follow the host's playback in real time + correct drift
  useEffect(() => {
    if (isHost || !ytVideoId) return
    let unmutedOnce = false
    const unsub = onSnapshot(doc(db, 'config', 'playback'), snap => {
      playbackRef.current = (snap.data() as typeof playbackRef.current) ?? null
      syncViewer()
      // Unmute once after first sync if user previously chose sound
      if (!unmutedOnce && localStorage.getItem('rd_unmuted') === 'true') {
        unmutedOnce = true
        const p = ytPlayerRef.current as { unMute?: () => void } | null
        try { p?.unMute?.() } catch {}
      }
    }, () => {})
    const drift = setInterval(syncViewer, 3000)
    return () => { unsub(); clearInterval(drift) }
  }, [isHost, ytVideoId, syncViewer])

  // Auth + role
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) { setUserRole(null); return }
      const ref = doc(db, 'users', u.uid)
      const isAdmin = ADMIN_EMAILS.includes(u.email ?? '')
      try {
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          await setDoc(ref, {
            email: u.email ?? '',
            displayName: u.displayName ?? u.email?.split('@')[0] ?? 'anon',
            role: isAdmin ? 'admin' : 'user',
            friends: [],
            crewId: null,
            createdAt: serverTimestamp(),
          })
        } else {
          const storedRole = snap.data().role as UserRole
          const finalRole = isAdmin ? 'admin' : storedRole
          if (isAdmin && storedRole !== 'admin') await updateDoc(ref, { role: 'admin' })
          setUserRole(finalRole)
          return
        }
      } catch (err) {
        console.warn('Firestore getDoc failed, falling back to default role:', err)
      }
      setUserRole(isAdmin ? 'admin' : 'user')
    })
  }, [])

  // Messages — cache then Firestore
  useEffect(() => {
    try {
      const cached = localStorage.getItem('rd_messages')
      if (cached) setMessages(JSON.parse(cached))
    } catch {}
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(50))
    return onSnapshot(q, (snap) => {
      if (resettingChat.current) {
        if (snap.empty) { setMessages([]); resettingChat.current = false }
        return
      }
      if (snap.empty) return
      const incoming = snap.docs.map(d => ({
        id: d.id,
        uid: d.data().uid ?? null,
        user: d.data().user,
        msg: d.data().msg,
        icon: d.data().icon ?? '',
        color: d.data().color ?? '#00ff41',
      }))
      setMessages(prev => {
        const byId = new Map(prev.map(m => [m.id, m]))
        incoming.forEach(m => byId.set(m.id, m))
        const merged = Array.from(byId.values())
        try { localStorage.setItem('rd_messages', JSON.stringify(merged)) } catch {}
        return merged
      })
    }, err => console.error('messages listener:', err))
  }, [user?.uid])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Admin users list
  useEffect(() => {
    if (userRole !== 'admin') return
    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50))).then(snap => {
      setAdminUsers(snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<AdminUser, 'uid'>) })))
    })
  }, [userRole])

  // User doc (friends + crewId + icon + color)
  useEffect(() => {
    if (!user) { setFriends([]); setMyCrewId(null); return }
    return onSnapshot(doc(db, 'users', user.uid), snap => {
      if (!snap.exists()) return
      setFriends(snap.data().friends ?? [])
      setMyCrewId(snap.data().crewId ?? null)
      const ts = snap.data().createdAt?.toDate?.()
      if (ts) setUserCreatedAt(ts.toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' }))
      if (snap.data().icon !== undefined) setUserIcon(snap.data().icon ?? '')
      if (snap.data().color) setUserColor(snap.data().color)
      setMutedUntil(snap.data().mutedUntil?.toDate?.() ?? null)
      setIsBanned(snap.data().banned ?? false)
    })
  }, [user])

  // Incoming friend requests
  useEffect(() => {
    if (!user) { setIncomingFriendReqs([]); return }
    const q = query(collection(db, 'friendRequests'), where('toUid', '==', user.uid), where('status', '==', 'pending'))
    return onSnapshot(q, snap => {
      setIncomingFriendReqs(snap.docs.map(d => ({ id: d.id, ...(d.data() as { fromUid: string; fromName: string }) })))
    })
  }, [user])

  // Sent friend requests
  useEffect(() => {
    if (!user) { setSentReqUids([]); return }
    const q = query(collection(db, 'friendRequests'), where('fromUid', '==', user.uid), where('status', '==', 'pending'))
    return onSnapshot(q, snap => { setSentReqUids(snap.docs.map(d => d.data().toUid as string)) })
  }, [user])

  // Crew doc
  useEffect(() => {
    if (!myCrewId) { setMyCrew(null); return }
    return onSnapshot(doc(db, 'crews', myCrewId), snap => {
      if (snap.exists()) setMyCrew({ id: snap.id, ...(snap.data() as Omit<Crew, 'id'>) })
      else setMyCrew(null)
    })
  }, [myCrewId])

  // Public crews (crew tab, no crew)
  useEffect(() => {
    if (rightTab !== 'crew' || myCrew) return
    getDocs(query(collection(db, 'crews'), limit(10))).then(snap => {
      setPublicCrews(snap.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        tag: d.data().tag,
        leaderId: d.data().leaderId,
        leaderName: d.data().leaderName,
        memberCount: (d.data().members ?? []).length,
      })))
    })
  }, [rightTab, myCrew])

  // In-app notifications listener
  useEffect(() => {
    if (!user) { setAppNotifications([]); return }
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    return onSnapshot(q, snap => {
      setAppNotifications(snap.docs.map(d => ({
        id: d.id,
        title: d.data().title as string,
        body: d.data().body as string,
        type: d.data().type as string,
        read: d.data().read as boolean,
        createdAt: d.data().createdAt?.toDate?.() ?? null,
      })))
    }, () => {})
  }, [user?.uid])

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'poll'), snap => {
      if (snap.exists()) setPoll(snap.data() as Poll)
      else setPoll(null)
    }, () => {})
  }, [])

  useEffect(() => {
    if (!poll?.active) return
    setAnnPollSlot('poll')
    const iv = setInterval(() => setAnnPollSlot(s => s === 'poll' ? 'ann' : 'poll'), 30000)
    return () => clearInterval(iv)
  }, [poll?.active])

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'schedule'), snap => {
      if (snap.exists()) setSchedule(snap.data() as Schedule)
      else setSchedule(null)
    }, () => {})
  }, [])

  useEffect(() => {
    const bc = new BroadcastChannel('chat_popup')
    bc.onmessage = (e) => {
      if (e.data === 'open') setChatPopupOpen(true)
      if (e.data === 'close') setChatPopupOpen(false)
    }
    return () => bc.close()
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const myDisplayName = (u: FirebaseUser) =>
    u.displayName?.split(' ')[0] || u.email?.split('@')[0] || 'anon'

  // ── Actions ───────────────────────────────────────────────────────────────

  const saveIcon = async (icon: string) => {
    if (!user) return
    setUserIcon(icon)
    await updateDoc(doc(db, 'users', user.uid), { icon })
  }

  const saveColor = async (color: string) => {
    if (!user) return
    setUserColor(color)
    await updateDoc(doc(db, 'users', user.uid), { color })
  }

  const saveName = async () => {
    if (!user || !newDisplayName.trim()) return
    await updateProfile(user, { displayName: newDisplayName.trim() })
    await updateDoc(doc(db, 'users', user.uid), { displayName: newDisplayName.trim() })
    setEditingName(false)
  }

  const sendMessage = async () => {
    const text = chatInput.trim()
    if (!text) return
    if (isBanned || (mutedUntil && mutedUntil > new Date())) return
    setChatInput('')
    const username = user ? myDisplayName(user) : 'anon_' + Math.floor(Math.random() * 9999)
    try {
      await addDoc(collection(db, 'messages'), {
        uid: user?.uid ?? null, user: username, msg: text,
        icon: user ? userIcon : '', color: user ? userColor : '#00ff41',
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('[chat] ERREUR écriture Firestore:', err)
    }
  }

  const resetChat = async () => {
    resettingChat.current = true
    setMessages([])
    try { localStorage.removeItem('rd_messages') } catch {}
    const snap = await getDocs(collection(db, 'messages'))
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
  }

  const changeRole = async (uid: string, role: string) => {
    await updateDoc(doc(db, 'users', uid), { role })
    setAdminUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u))
  }

  const saveStreamSource = async (url: string, title: string, type: 'youtube' | 'camera' | 'screen' = 'youtube') => {
    switchingSourceRef.current = true
    if (broadcasting && type !== streamType) stopBroadcast()
    setStreamUrl(url)
    setStreamTitle(title)
    setStreamType(type)
    if (type === 'youtube' && url) setFallbackUrl(url)
    setCurrentIndex(0)
    try {
      await setDoc(doc(db, 'config', 'stream'), { url, title, type, index: 0, ...(type === 'youtube' && url ? { fallbackUrl: url } : {}), updatedAt: serverTimestamp() }, { merge: true })
    } catch (e) {
      console.error('saveStreamSource setDoc error:', e)
    }
    setTimeout(() => { switchingSourceRef.current = false }, 1200)
  }

  // Fallback : revenir à l'URL YouTube mémorisée quand une diffusion s'arrête
  const fallbackToYoutube = () => {
    if (fallbackUrlRef.current) saveStreamSource(fallbackUrlRef.current, streamTitle, 'youtube')
  }

  const broadcastNotify = async (title: string, body: string) => {
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, type: 'stream_live' }),
      })
      const d = await res.json()
      alert(`Notification envoyee : ${d.inApp ?? 0} membres (in-app), ${d.sent ?? 0} push`)
    } catch {
      alert('Echec de l.envoi de la notification')
    }
  }

  const saveAnnouncements = async (messages: string[], interval: number) => {
    await setDoc(doc(db, 'config', 'announcements'), { messages, interval, updatedAt: serverTimestamp() })
  }

  const saveRestream = async (platform: 'tiktok' | 'youtube' | 'facebook' | 'x' | 'luxmedia', enabled: boolean) => {
    await setDoc(doc(db, 'config', 'restream'), { [platform]: enabled, updatedAt: serverTimestamp() }, { merge: true })
  }

  const loadRestreamKeys = async () => {
    try {
      const res = await fetch('/api/restream/keys', { headers: { 'Authorization': `Bearer ${authTokenRef.current}` } })
      if (res.ok) setRestreamKeys(await res.json())
    } catch {}
  }

  const saveRestreamKeys = async (payload: Record<string, { url?: string; key?: string }>) => {
    const res = await fetch('/api/restream/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authTokenRef.current}` },
      body: JSON.stringify(payload),
    })
    if (res.ok) setRestreamKeys(await res.json())
    else alert('Erreur sauvegarde clés (auth admin requise ou serviceAccount.json manquant)')
  }

  const votePoll = async (optionIndex: number) => {
    if (!user || !poll?.active || user.uid in (poll.votes ?? {})) return
    await setDoc(doc(db, 'config', 'poll'), { votes: { [user.uid]: optionIndex } }, { merge: true })
  }

  const createPoll = async (question: string, options: string[]) => {
    await setDoc(doc(db, 'config', 'poll'), { active: true, question, options, votes: {}, createdAt: serverTimestamp() })
  }

  const closePoll = async () => {
    await updateDoc(doc(db, 'config', 'poll'), { active: false })
  }

  const muteChatUser = async (uid: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60 * 1000)
    await updateDoc(doc(db, 'users', uid), { mutedUntil: until })
  }

  const unmuteUser = async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), { mutedUntil: deleteField() })
  }

  const banChatUser = async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), { banned: true })
  }

  const unbanUser = async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), { banned: false })
  }

  const saveSchedule = async (lines: { text: string; format: string }[]) => {
    await setDoc(doc(db, 'config', 'schedule'), { active: lines.length > 0, lines, updatedAt: serverTimestamp() })
  }

  const startViewerResize = (e: React.MouseEvent | React.TouchEvent, uid: string, currentW: number) => {
    if (!isHost) return
    e.preventDefault()
    e.stopPropagation()
    const box = playerBoxRef.current
    if (!box) return
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const startW = currentW
    const move = (clientX: number) => {
      const r = box.getBoundingClientRect()
      const delta = (clientX - startX) / r.width * 100
      const w = Math.max(10, Math.min(55, startW + delta))
      viewerResizeWRef.current = w
      setRemoteViewers(prev => prev.map(v => v.uid === uid ? { ...v, w } : v))
    }
    const mm = (ev: MouseEvent) => move(ev.clientX)
    const tm = (ev: TouchEvent) => { if (ev.touches[0]) move(ev.touches[0].clientX) }
    const stop = () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('touchmove', tm)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchend', stop)
      updateDoc(doc(db, 'viewerStreams', uid), { w: viewerResizeWRef.current }).catch(() => {})
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('touchmove', tm, { passive: false })
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchend', stop)
  }

  const startViewerDrag = (e: React.MouseEvent | React.TouchEvent, uid: string) => {
    if (!isHost || isResizingRef.current) return
    e.preventDefault()
    const box = playerBoxRef.current
    if (!box) return
    setViewerDragUid(uid)
    const move = (clientX: number, clientY: number) => {
      const r = box.getBoundingClientRect()
      const pw = r.width * 0.18
      const ph = pw * 9 / 16
      let x = ((clientX - r.left - pw / 2) / r.width) * 100
      let y = ((clientY - r.top - ph / 2) / r.height) * 100
      x = Math.max(0, Math.min(100 - (pw / r.width) * 100, x))
      y = Math.max(0, Math.min(100 - (ph / r.height) * 100, y))
      viewerDragPosRef.current = { x, y }
      setRemoteViewers(prev => prev.map(v => v.uid === uid ? { ...v, x, y } : v))
    }
    const mm = (ev: MouseEvent) => move(ev.clientX, ev.clientY)
    const tm = (ev: TouchEvent) => { if (ev.touches[0]) move(ev.touches[0].clientX, ev.touches[0].clientY) }
    const stop = () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('touchmove', tm)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchend', stop)
      setViewerDragUid(null)
      const { x, y } = viewerDragPosRef.current
      updateDoc(doc(db, 'viewerStreams', uid), { x, y }).catch(() => {})
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('touchmove', tm, { passive: false })
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchend', stop)
  }

  const startViewerPip = async () => {
    if (!user) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      viewerStreamRef.current = stream
      // WHIP broadcast to MediaMTX
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      viewerWhipPcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      // Force H.264
      try {
        const caps = RTCRtpSender.getCapabilities?.('video')
        const vt = pc.getTransceivers().find(t => t.sender?.track?.kind === 'video')
        if (caps && vt && typeof vt.setCodecPreferences === 'function') {
          const h264 = caps.codecs.filter(c => /h264/i.test(c.mimeType))
          if (h264.length) vt.setCodecPreferences([...h264, ...caps.codecs.filter(c => !/h264/i.test(c.mimeType))])
        }
      } catch {}
      await pc.setLocalDescription(await pc.createOffer())
      await new Promise<void>(resolve => {
        if (pc.iceGatheringState === 'complete') return resolve()
        const fn = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', fn); resolve() } }
        pc.addEventListener('icegatheringstatechange', fn)
        setTimeout(resolve, 2000)
      })
      const res = await fetch(`/mediamtx/viewer-${user.uid}/whip`, {
        method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: pc.localDescription?.sdp ?? '',
      })
      if (!res.ok) throw new Error('WHIP ' + res.status)
      await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() })
      // Local preview
      if (viewerPipVideoRef.current) { viewerPipVideoRef.current.srcObject = stream; viewerPipVideoRef.current.muted = true }
      // Firestore: mark active
      const displayName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'viewer'
      const activeCount = remoteViewers.filter(v => v.uid !== user.uid).length
      const defaultX = 5 + (activeCount % 4) * 22
      const defaultY = 5
      await setDoc(doc(db, 'viewerStreams', user.uid), { active: true, name: displayName, startedAt: serverTimestamp(), x: defaultX, y: defaultY, w: 18 })
      setViewerPipActive(true)
    } catch (e) {
      alert('Impossible de rejoindre : ' + (e as Error).message)
      stopViewerPip()
    }
  }

  const stopViewerPip = () => {
    viewerStreamRef.current?.getTracks().forEach(t => t.stop())
    viewerStreamRef.current = null
    viewerWhipPcRef.current?.close(); viewerWhipPcRef.current = null
    if (viewerPipVideoRef.current) viewerPipVideoRef.current.srcObject = null
    if (user) setDoc(doc(db, 'viewerStreams', user.uid), { active: false }, { merge: true }).catch(() => {})
    setViewerPipActive(false)
  }

  const stopBroadcast = () => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null
    stopViewerPip()
    setBroadcasting(false)
    setDoc(doc(db, 'config', 'stream'), { live: false, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
  }

  // Publish this device's camera to MediaMTX via WHIP (admin only)
  const startBroadcast = async (mode: 'camera' | 'screen' = streamType === 'screen' ? 'screen' : 'camera') => {
    try {
      const stream = mode === 'screen'
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        : await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      const vt0 = stream.getVideoTracks()[0]
      if (vt0) vt0.onended = () => {
        stopBroadcast()
        if (!switchingSourceRef.current && fallbackUrlRef.current) fallbackToYoutube()
      }
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      // Force H.264 video so MediaMTX can package it as HLS (browsers default to VP8, which HLS can't carry)
      try {
        const caps = RTCRtpSender.getCapabilities?.('video')
        const vt = pc.getTransceivers().find(t => t.sender?.track?.kind === 'video')
        if (caps && vt && typeof vt.setCodecPreferences === 'function') {
          const h264 = caps.codecs.filter(c => /h264/i.test(c.mimeType))
          const rest = caps.codecs.filter(c => !/h264/i.test(c.mimeType))
          if (h264.length) vt.setCodecPreferences([...h264, ...rest])
        }
      } catch {}
      await pc.setLocalDescription(await pc.createOffer())
      // Wait for ICE gathering (host candidates on LAN are near-instant)
      await new Promise<void>(resolve => {
        if (pc.iceGatheringState === 'complete') return resolve()
        const onChange = () => {
          if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', onChange); resolve() }
        }
        pc.addEventListener('icegatheringstatechange', onChange)
        setTimeout(resolve, 2000)
      })
      const res = await fetch('/mediamtx/cam/whip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription?.sdp ?? '',
      })
      if (!res.ok) throw new Error('WHIP HTTP ' + res.status)
      await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() })
      setBroadcasting(true)
      setDoc(doc(db, 'config', 'stream'), { live: true, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
      if (cameraVideoRef.current) { cameraVideoRef.current.srcObject = stream; cameraVideoRef.current.muted = true }
    } catch (e) {
      console.error('broadcast failed', e)
      alert('Diffusion impossible : ' + (e as Error).message)
      stopBroadcast()
    }
  }

  const writePip = (fields: Record<string, unknown>) => {
    setDoc(doc(db, 'config', 'stream'), { ...fields, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
  }

  const toggleSwap = () => { const nv = !pipSwapped; setPipSwapped(nv); writePip({ pipSwapped: nv }) }

  const togglePip = async (on: boolean) => {
    if (on) {
      await startBroadcast()
      setPipEnabled(true)
      writePip({ pip: true, pipX: pipPosRef.current.x, pipY: pipPosRef.current.y })
    } else {
      stopBroadcast()
      setPipEnabled(false)
      writePip({ pip: false })
    }
  }

  const goToVideo = (i: number) => {
    const list = getYouTubeIds(streamUrl)
    if (!list.length) return
    const ni = Math.max(0, Math.min(list.length - 1, i))
    setCurrentIndex(ni)
    writePip({ index: ni })
  }
  const nextVideo = () => goToVideo(currentIndex + 1)
  const prevVideo = () => goToVideo(currentIndex - 1)

  const startPipResize = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isHost) return
    e.preventDefault()
    e.stopPropagation()
    const box = playerBoxRef.current
    if (!box) return
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const startW = pipWRef.current
    const move = (clientX: number) => {
      const r = box.getBoundingClientRect()
      const delta = (clientX - startX) / r.width * 100
      const w = Math.max(10, Math.min(55, startW + delta))
      setPipW(w); pipWRef.current = w
    }
    const mm = (ev: MouseEvent) => move(ev.clientX)
    const tm = (ev: TouchEvent) => { if (ev.touches[0]) move(ev.touches[0].clientX) }
    isResizingRef.current = true
    setPipResizing(true)
    const stop = () => {
      isResizingRef.current = false
      setPipResizing(false)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('touchmove', tm)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchend', stop)
      writePip({ pipW: pipWRef.current })
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('touchmove', tm, { passive: false })
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchend', stop)
  }

  const startPipDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isHost || isResizingRef.current) return
    e.preventDefault()
    const box = playerBoxRef.current
    if (!box) return
    setPipDragging(true)
    const move = (clientX: number, clientY: number) => {
      const r = box.getBoundingClientRect()
      const pw = r.width * 0.24
      const ph = pw * 9 / 16
      let x = ((clientX - r.left - pw / 2) / r.width) * 100
      let y = ((clientY - r.top - ph / 2) / r.height) * 100
      x = Math.max(0, Math.min(100 - (pw / r.width) * 100, x))
      y = Math.max(0, Math.min(100 - (ph / r.height) * 100, y))
      setPipX(x); setPipY(y); pipPosRef.current = { x, y }
    }
    const mm = (ev: MouseEvent) => move(ev.clientX, ev.clientY)
    const tm = (ev: TouchEvent) => { if (ev.touches[0]) move(ev.touches[0].clientX, ev.touches[0].clientY) }
    const stop = () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('touchmove', tm)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchend', stop)
      setPipDragging(false)
      writePip({ pipX: pipPosRef.current.x, pipY: pipPosRef.current.y })
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('touchmove', tm, { passive: false })
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchend', stop)
  }

  const handleSignOut = async () => {
    if (broadcasting) stopBroadcast()
    setDoc(doc(db, 'config', 'stream'), { pip: false, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
    await signOut(auth)
    setUserMenuOpen(false)
    setRightDrawerOpen(false)
  }

  const blockedUids = blockedUsers.map(b => b.uid)
  const filteredMessages = messages.filter(m => !m.uid || !blockedUids.includes(m.uid))
  const enablePush = async () => {
    if (!user) return
    try {
      const { getMessaging, getToken } = await import('firebase/messaging')
      const messaging = getMessaging(app)
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
      })
      if (token) {
        await updateDoc(doc(db, 'users', user.uid), { fcmToken: token })
        setFcmEnabled(true)
        localStorage.setItem('rd_fcmEnabled', 'true')
      }
    } catch (e) {
      console.error('FCM:', e)
    }
  }

  const markNotificationsRead = async () => {
    if (!user) return
    const unread = appNotifications.filter(n => !n.read)
    if (!unread.length) return
    const batch = writeBatch(db)
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }))
    await batch.commit()
  }

  const blockUser = (uid: string, name: string) => {
    const updated = [...blockedUsers.filter(b => b.uid !== uid), { uid, name }]
    setBlockedUsers(updated)
    setUserPopup(null)
    localStorage.setItem('rd_blocked', JSON.stringify(updated))
  }
  const unblockUser = (uid: string) => {
    const updated = blockedUsers.filter(b => b.uid !== uid)
    setBlockedUsers(updated)
    localStorage.setItem('rd_blocked', JSON.stringify(updated))
  }

  const sendFriendRequest = async (toUid: string, toName: string) => {
    if (!user) return
    setUserPopup(null)
    await addDoc(collection(db, 'friendRequests'), {
      fromUid: user.uid, fromName: myDisplayName(user),
      toUid, toName, status: 'pending', createdAt: serverTimestamp(),
    })
  }

  const acceptFriendReq = async (req: FriendReq) => {
    if (!user) return
    await updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' })
    await updateDoc(doc(db, 'users', user.uid), { friends: arrayUnion({ uid: req.fromUid, name: req.fromName }) })
    await updateDoc(doc(db, 'users', req.fromUid), { friends: arrayUnion({ uid: user.uid, name: myDisplayName(user) }) })
  }

  const declineFriendReq = async (reqId: string) => {
    await updateDoc(doc(db, 'friendRequests', reqId), { status: 'declined' })
  }

  const createCrew = async () => {
    if (!user || !crewNameInput.trim() || !crewTagInput.trim()) return
    const me = { uid: user.uid, name: myDisplayName(user) }
    const ref = await addDoc(collection(db, 'crews'), {
      name: crewNameInput.trim(),
      tag: crewTagInput.trim().toUpperCase().slice(0, 4),
      leaderId: user.uid, leaderName: me.name,
      members: [me], pending: [], createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'users', user.uid), { crewId: ref.id })
    setCrewNameInput(''); setCrewTagInput(''); setShowCrewCreate(false)
  }

  const requestJoinCrew = async (crewId: string) => {
    if (!user) return
    await updateDoc(doc(db, 'crews', crewId), {
      pending: arrayUnion({ uid: user.uid, name: myDisplayName(user) }),
    })
  }

  const acceptCrewMember = async (member: CrewMember) => {
    if (!myCrew) return
    const newPending = myCrew.pending.filter(m => m.uid !== member.uid)
    await updateDoc(doc(db, 'crews', myCrew.id), { members: arrayUnion(member), pending: newPending })
    await updateDoc(doc(db, 'users', member.uid), { crewId: myCrew.id })
  }

  const leaveCrew = async () => {
    if (!user || !myCrew) return
    const newMembers = myCrew.members.filter(m => m.uid !== user.uid)
    await updateDoc(doc(db, 'crews', myCrew.id), {
      members: newMembers,
      ...(myCrew.leaderId === user.uid && newMembers.length > 0
        ? { leaderId: newMembers[0].uid, leaderName: newMembers[0].name }
        : {}),
    })
    await updateDoc(doc(db, 'users', user.uid), { crewId: null })
  }

  const crewBadge = myCrew?.leaderId === user?.uid && (myCrew?.pending?.length ?? 0) > 0

  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null
    // YouTube — handles watch?v=, watch?...&v=, youtu.be/, live/, shorts/, embed/
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1`
    // Twitch
    const twMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)
    if (twMatch) return `https://player.twitch.tv/?channel=${twMatch[1]}&parent=${window.location.hostname}&autoplay=true&muted=true`
    // Anything else — use as-is (HLS needs a player, iframe for others)
    return url
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className='h-screen w-screen bg-black text-[#00ff41] font-mono flex flex-col overflow-hidden'>

      {!unlocked && <PasswordGate onUnlock={() => setUnlocked(true)} />}
      {intro && <IntroAnimation onDone={handleIntroDone} />}
      {modal && <AuthModal mode={modal} onClose={() => setModal(null)} />}

      {/* Modal sondage — uniquement si >2 options et pas encore répondu */}
      {poll?.active && poll.options.length > 2 && user && !(user.uid in (poll.votes ?? {})) && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80'>
          <div className='bg-black border border-[#00ff41]/50 px-6 py-5 w-full max-w-sm mx-4'>
            <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-3'>SONDAGE</div>
            <div className='text-[13px] font-bold tracking-wide text-[#00ff41] mb-4'>{poll.question}</div>
            <div className='flex flex-col gap-2'>
              {poll.options.map((opt, i) => {
                const totalVotes = Object.keys(poll.votes ?? {}).length
                const count = Object.values(poll.votes ?? {}).filter(v => v === i).length
                const pct = totalVotes > 0 ? Math.round(count / totalVotes * 100) : 0
                const hasVoted = user.uid in (poll.votes ?? {})
                const voted = hasVoted && (poll.votes ?? {})[user.uid] === i
                return (
                  <button key={i} disabled={hasVoted} onClick={() => votePoll(i)}
                    className='relative text-left text-[11px] border overflow-hidden transition-all'
                    style={{ borderColor: voted ? 'rgba(0,255,65,0.7)' : 'rgba(0,255,65,0.25)', color: voted ? '#00ff41' : 'rgba(0,255,65,0.7)', padding: '8px 12px', background: 'transparent', cursor: hasVoted ? 'default' : 'pointer' }}
                  >
                    <div className='absolute inset-0 transition-all duration-500' style={{ width: hasVoted ? `${pct}%` : '0%', background: 'rgba(0,255,65,0.07)' }} />
                    <span className='relative z-10'>{opt}</span>
                    {hasVoted && <span className='relative z-10 float-right text-[10px] text-[#00ff41]/45'>{pct}%</span>}
                  </button>
                )
              })}
            </div>
            <div className='mt-3 flex items-center justify-between'>
              <span className='text-[9px] text-[#00ff41]/30 tracking-widest'>
                {Object.keys(poll.votes ?? {}).length} vote{Object.keys(poll.votes ?? {}).length !== 1 ? 's' : ''}
              </span>
              {isHost && (
                <button onClick={closePoll} className='text-[9px] tracking-widest text-[#ff4141]/50 hover:text-[#ff4141] transition-colors'>■ fermer</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className='w-full h-[2px] bg-[#00ff41] shrink-0' />

      {/* Nav */}
      <nav className='flex items-center justify-between px-3 border-b border-[#00ff41]/30 shrink-0 h-[60px]'>
        <span className='text-base sm:text-lg font-bold tracking-widest'>RoshDynamics</span>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1.5'>
            {(['⬡','◈','⊞','◉','▲'] as const).map((icon, i) => {
              const isCamToggle = i === 4
              const active = isCamToggle && rightPanel === 'cams'
              return (
                <button
                  key={i}
                  onClick={isCamToggle ? () => setRightPanel(p => p === 'cams' ? 'chat' : 'cams') : undefined}
                  title={isCamToggle ? (rightPanel === 'cams' ? 'Voir le chat' : 'Voir les caméras') : undefined}
                  style={{ minWidth:'52px', height:'29px', padding:'0 8px', border: `1.5px solid ${active ? 'rgba(0,255,65,0.9)' : 'rgba(0,255,65,0.35)'}`, background: active ? 'rgba(0,255,65,0.18)' : 'rgba(0,255,65,0.05)', color: active ? '#00ff41' : 'rgba(0,255,65,0.5)', borderRadius:'4px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', transition:'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.background='rgba(0,255,65,0.12)'; e.currentTarget.style.borderColor='rgba(0,255,65,0.7)'; e.currentTarget.style.color='#00ff41' }}
                  onMouseOut={e => { e.currentTarget.style.background= active ? 'rgba(0,255,65,0.18)' : 'rgba(0,255,65,0.05)'; e.currentTarget.style.borderColor= active ? 'rgba(0,255,65,0.9)' : 'rgba(0,255,65,0.35)'; e.currentTarget.style.color= active ? '#00ff41' : 'rgba(0,255,65,0.5)' }}
                >{isCamToggle ? (rightPanel === 'chat' ? 'Cam' : 'Chat') : icon}</button>
              )
            })}
          </div>
          <div className='flex justify-center'>
            {user ? (
              <div className='relative'>
                <button
                  onClick={() => setRightDrawerOpen(o => !o)}
                  style={{ fontFamily:'Arial,sans-serif', fontSize:'10px', height:'29px', padding:'0 10px', borderRadius:'5px', border:'1.5px solid #00ff41', background:'rgba(0,255,65,0.08)', color:'#00ff41', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontWeight:600, letterSpacing:'0.5px', maxWidth:'150px' }}
                >
                  <User size={11}/>
                  <span className='truncate'>{user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'USER'}</span>
                  {userRole && userRole !== 'user' && (
                    <span style={{
                      fontSize:'8px', padding:'1px 5px', borderRadius:'3px', fontWeight:700, letterSpacing:'0.5px',
                      background: userRole === 'admin' ? 'rgba(255,65,65,0.2)' : userRole === 'vip' ? 'rgba(255,215,0,0.2)' : 'rgba(0,191,255,0.2)',
                      color: userRole === 'admin' ? '#ff4141' : userRole === 'vip' ? '#ffd700' : '#00bfff',
                      border: `1px solid ${userRole === 'admin' ? '#ff414140' : userRole === 'vip' ? '#ffd70040' : '#00bfff40'}`,
                    }}>{userRole.toUpperCase()}</span>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setModal('login')}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(0,255,65,0.1)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                style={{ fontFamily:'Arial,sans-serif', fontSize:'10px', height:'29px', padding:'0 13px', borderRadius:'5px', border:'1.5px solid #00ff41', background:'transparent', color:'#00ff41', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontWeight:600, letterSpacing:'0.5px' }}
              ><LogIn size={11}/> CONNEXION</button>
            )}
          </div>
        </div>
      </nav>

      <div className='flex flex-1 flex-col lg:flex-row overflow-hidden'>

        {/* Left sidebar */}
        <LeftSidebar
          open={leftDrawerOpen}
          onClose={() => setLeftDrawerOpen(false)}
          onToggle={() => setLeftDrawerOpen(o => !o)}
          user={user}
          isHost={isHost}
          streamTitle={streamTitle}
          onAuthRequired={() => setModal('login')}
          viewerPipActive={viewerPipActive}
          onJoinLive={startViewerPip}
          onLeaveLive={stopViewerPip}
          adminUsers={adminUsers}
          changeRole={changeRole}
          muteChatUser={muteChatUser}
          unmuteUser={unmuteUser}
          banChatUser={banChatUser}
          unbanUser={unbanUser}
        />

        {/* Main content */}
        <div className='flex flex-col shrink-0 lg:flex-1 lg:min-h-0 overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3'>
          <div ref={playerBoxRef} className='relative border-2 border-[#00ff41] aspect-video lg:aspect-auto lg:flex-1 bg-black overflow-hidden'>
            {streamType === 'camera' || streamType === 'screen' ? (
              <>
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className='w-full h-full object-contain bg-black'
                />
                {!(live || broadcasting) && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black z-10'>
                    {schedule?.active && schedule.lines?.length ? (
                      <div className='text-center px-4'>
                        <div className='text-[10px] tracking-widest text-[#00ff41]/40 mb-3'>PROGRAMME</div>
                        <ScheduleLines lines={schedule.lines} />
                      </div>
                    ) : (
                      <div className='text-center'>
                        <div className='text-5xl opacity-20'>&#9654;</div>
                        <p className='text-[#00ff41]/30 text-xs tracking-widest mt-2'>{isHost ? 'Pret a diffuser - clique DEMARRER' : 'Bientot en direct'}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className='absolute top-2 left-3 flex items-center gap-2'>
                  <span className={`w-2 h-2 rounded-full ${broadcasting ? 'bg-[#ff4141] animate-pulse' : 'bg-[#00ff41]/30'}`} />
                  <span className='text-[18px] tracking-widest'>{(broadcasting ? 'EN DIRECT · ' : '') + (streamType === 'screen' ? 'ECRAN' : 'CAMERA')}</span>
                </div>
                {viewerCount !== null && (
                  <div className='absolute top-2 right-3 text-[15px] tracking-widest text-[#00ff41]/55 pointer-events-none'>{viewerCount} 👁</div>
                )}
              </>
            ) : ytVideoId ? (
              <>
                <div key={ytVideoId ?? ''} ref={ytWrapRef}
                  className={pipSwapped && pipEnabled ? 'absolute z-20 border border-[#00ff41]/60 bg-black overflow-hidden shadow-lg pointer-events-none' : 'w-full h-full'}
                  style={pipSwapped && pipEnabled ? { left: `${pipX}%`, top: `${pipY}%`, width: `${pipW}%`, aspectRatio: '16 / 9' } : undefined} />
                {/* YouTube chrome mask via box-shadow — renders above iframe in compositor */}
                {!isHost && (
                  <div
                    className='absolute inset-0 pointer-events-none z-[15]'
                    style={{
                      boxShadow: [
                        // bottom bar: share/queue buttons
                        'inset 0 -10% 0 0 #000',
                        // top-left end card
                        'inset 35% 0 80% -84% #000',
                        // bottom-right more videos
                        'inset -45% 30% 0 -70% #000',
                      ].join(', '),
                    }}
                  />
                )}
                {!isHost && (
                  <div
                    className='absolute inset-0 z-10 cursor-pointer'
                    onClick={() => {
                      const p = ytPlayerRef.current as { isMuted?: () => boolean; unMute?: () => void } | null
                      if (p?.isMuted?.()) { p.unMute?.(); setViewerUnmuted(true); localStorage.setItem('rd_unmuted', 'true') }
                    }}
                  />
                )}

                {!isHost && !viewerUnmuted && (
                  <div className='absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[10px] tracking-widest text-[#00ff41]/70 bg-black/60 px-3 py-1.5 border border-[#00ff41]/30 pointer-events-none'>
                    cliquez pour activer le son
                  </div>
                )}
                <div className='absolute top-2 right-3 flex flex-col items-end gap-1 pointer-events-none'>
                  <span className='text-[19px] tracking-widest text-[#00ff41]/45'>{isHost ? '● CONTROLE ADMIN' : 'SYNC ADMIN'}</span>
                  {viewerCount !== null && (
                    <span className='text-[19px] tracking-widest text-[#00ff41]/55'>{viewerCount} 👁</span>
                  )}
                </div>
                {playlist.length > 1 && (
                  <div className='absolute top-2 left-3 z-20 flex items-center gap-2 bg-black/70 border border-[#00ff41]/30 px-2 py-1'>
                    {isHost ? (
                      <>
                        <button onClick={prevVideo} disabled={currentIndex <= 0} className='text-[#00ff41] disabled:opacity-25 hover:text-white text-sm leading-none'>⏮</button>
                        <span className='text-[10px] tracking-widest text-[#00ff41]/70'>{currentIndex + 1}/{playlist.length}</span>
                        <button onClick={nextVideo} disabled={currentIndex >= playlist.length - 1} className='text-[#00ff41] disabled:opacity-25 hover:text-white text-sm leading-none'>⏭</button>
                      </>
                    ) : (
                      <span className='text-[10px] tracking-widest text-[#00ff41]/50'>{currentIndex + 1}/{playlist.length}</span>
                    )}
                  </div>
                )}

              </>
            ) : streamUrl && getEmbedUrl(streamUrl) ? (
              <iframe
                src={getEmbedUrl(streamUrl)!}
                className='w-full h-full'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
                style={{ border: 'none' }}
              />
            ) : (
              <>
                <div className='absolute top-2 left-3 flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-[#00ff41] animate-pulse' />
                  <span className='text-[18px] tracking-widest'>EN DIRECT</span>
                </div>
                {viewerCount !== null && (
                  <div className='absolute top-2 right-3 text-[18px] text-[#00ff41]/50'>{viewerCount} SPECTATEUR{viewerCount !== 1 ? 'S' : ''}</div>
                )}
                <div className='absolute inset-0 flex items-center justify-center'>
                  {schedule?.active && schedule.lines?.length ? (
                    <div className='text-center px-4'>
                      <div className='text-[10px] tracking-widest text-[#00ff41]/40 mb-3'>PROGRAMME</div>
                      <ScheduleLines lines={schedule.lines} />
                    </div>
                  ) : (
                    <div className='text-center'>
                      <div className='text-5xl opacity-20'>&#9654;</div>
                      <p className='text-[#00ff41]/30 text-xs tracking-widest mt-2'>
                        {(userRole === 'admin' || ADMIN_EMAILS.includes(user?.email ?? ''))
                          ? 'Configurez la source dans le menu admin'
                          : 'STREAM EN COURS'}
                      </p>
                    </div>
                  )}
                </div>
                <div className='absolute bottom-2 left-3 right-3 flex justify-between'>
                  <span className='text-xs text-[#00ff41]/60'>SUJET #1 - TECHNOLOGIE & SOCIETE</span>
                  <span className='text-xs text-[#00ff41]/40'>02:14:37</span>
                </div>
              </>
            )}

            {/* PiP — admin camera overlaid on the YouTube video, draggable by admin */}
            {ytVideoId && pipEnabled && (
              <div
                className={pipSwapped ? 'absolute inset-0 bg-black overflow-hidden' : 'absolute z-20 border border-[#00ff41]/60 bg-black overflow-hidden shadow-lg'}
                style={pipSwapped ? undefined : { left: `${pipX}%`, top: `${pipY}%`, width: `${pipW}%`, aspectRatio: '16 / 9', cursor: isHost ? 'move' : 'default' }}
                onMouseDown={!pipSwapped && isHost ? startPipDrag : undefined}
                onTouchStart={!pipSwapped && isHost ? startPipDrag : undefined}
              >
                <video ref={pipVideoRef} autoPlay muted playsInline className={'w-full h-full object-cover pointer-events-none transition-opacity duration-500' + (isHost || pipStreamReady ? '' : ' opacity-0')} />
                {!pipSwapped && isHost && <div className='absolute top-0.5 left-1 text-[8px] text-[#00ff41]/80 tracking-widest pointer-events-none'>PIP · GLISSER</div>}
                {!pipSwapped && isHost && <div data-resize='true' className='absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-20 flex items-end justify-end p-0.5' style={{background:'transparent'}} onMouseDown={startPipResize} onTouchStart={startPipResize}><span style={{width:'10px',height:'10px',borderRight:'2px solid rgba(0,255,65,0.8)',borderBottom:'2px solid rgba(0,255,65,0.8)',display:'block',pointerEvents:'none'}} /></div>}
              </div>
            )}
            {viewerPipActive && isHost && streamType === 'screen' && (() => {
              const myPos = remoteViewers.find(v => v.uid === user?.uid)
              return (
                <div className='absolute z-20 border border-[#00ff41]/60 bg-black overflow-hidden shadow-lg'
                  style={{ left: `${myPos?.x ?? 70}%`, top: `${myPos?.y ?? 70}%`, width: `${pipW}%`, aspectRatio: '16 / 9', cursor: 'move' }}
                  onMouseDown={e => { if (user) startViewerDrag(e, user.uid) }}
                  onTouchStart={e => { if (user) startViewerDrag(e, user.uid) }}
                >
                  <video ref={adminPipVideoRef} autoPlay muted playsInline className='w-full h-full object-cover pointer-events-none' />
                  <div className='absolute top-0.5 left-1 text-[8px] text-[#00ff41]/80 tracking-widest pointer-events-none'>MA CAM · GLISSER</div>
                  <button onMouseDown={e => e.stopPropagation()} onClick={stopViewerPip} className='absolute top-1 right-1 text-[10px] text-[#ff4141]/80 hover:text-[#ff4141] bg-black/60 px-1 leading-none z-30'>✕</button>
                </div>
              )
            })()}
            {/* Remote viewer streams — dans les carrés, pas en PiP */}
            {false && remoteViewers.filter(v => v.uid !== user?.uid).map(v => (
              <div
                key={v.uid}
                className='absolute z-20 border border-[#00ff41]/50 bg-black overflow-hidden shadow-lg'
                style={{ left: `${v.x}%`, top: `${v.y}%`, width: `${v.w}%`, aspectRatio: '1/1', cursor: isHost ? 'move' : 'default' }}
                onMouseDown={isHost ? e => startViewerDrag(e, v.uid) : undefined}
                onTouchStart={isHost ? e => startViewerDrag(e, v.uid) : undefined}
              >
                <ViewerStream uid={v.uid} name={v.name} />
                {isHost && <div className='absolute top-0.5 left-1 text-[8px] text-[#00ff41]/60 tracking-widest pointer-events-none'>⠿ {v.name}</div>}
                {isHost && <div data-resize='true' className='absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-20 flex items-end justify-end p-0.5' style={{background:'transparent'}} onMouseDown={e => startViewerResize(e, v.uid, v.w)} onTouchStart={e => startViewerResize(e, v.uid, v.w)}><span style={{width:'10px',height:'10px',borderRight:'2px solid rgba(0,255,65,0.8)',borderBottom:'2px solid rgba(0,255,65,0.8)',display:'block',pointerEvents:'none'}} /></div>}
              </div>
            ))}

            {/* drag shield: stops the YouTube iframe from swallowing mouse events while dragging */}
            {(pipDragging || pipResizing) && <div className='absolute inset-0 z-30' style={{ cursor: pipResizing ? 'se-resize' : 'move' }} />}
            {viewerDragUid && <div className='absolute inset-0 z-30' style={{ cursor: 'move' }} />}

            {/* Viewer self-cam — dans les carrés, pas en PiP */}
            {false && !isHost && viewerPipActive && (() => {
              const myPos = remoteViewers.find(v => v.uid === user?.uid)
              return (
                <div className='absolute z-20 border border-[#00ff41]/60 bg-black overflow-hidden shadow-lg'
                  style={{ left: `${myPos?.x ?? 5}%`, top: `${myPos?.y ?? 5}%`, width: `${myPos?.w ?? 18}%`, aspectRatio: '1/1' }}>
                  <video ref={viewerPipVideoRef} autoPlay muted playsInline className='w-full h-full object-cover' />
                  <button onClick={stopViewerPip} className='absolute top-1 right-1 text-[9px] text-[#ff4141]/70 hover:text-[#ff4141] bg-black/60 px-1 leading-none'>✕</button>
                  <div className='absolute bottom-0.5 left-1 text-[8px] text-[#00ff41]/60 tracking-widest pointer-events-none'>MOI</div>
                </div>
              )
            })()}
          </div>

          {/* Poll + Annonce — zone unifiée, alterne toutes les 30s quand sondage actif */}
          <div className='border border-[#00ff41]/30 px-4 bg-[#00ff41]/5 shrink-0 h-[90px] flex items-center overflow-hidden'>
            {poll?.active && poll.options.length <= 2 && annPollSlot === 'poll' ? (
              <div className='w-full'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[9px] font-bold tracking-widest text-[#00ff41] truncate flex-1 mr-2'>{poll.question}</span>
                  <div className='flex items-center gap-2 shrink-0'>
                    <span className='text-[8px] text-[#00ff41]/30 tracking-widest'>
                      {Object.keys(poll.votes ?? {}).length}v{!user && ' \u00B7 login'}
                    </span>
                    {isHost && (
                      <button onClick={closePoll} className='text-[8px] tracking-widest text-[#ff4141]/50 hover:text-[#ff4141] transition-colors'>\u25A0</button>
                    )}
                  </div>
                </div>
                <div className='flex flex-col gap-0.5'>
                  {poll.options.map((opt, i) => {
                    const totalVotes = Object.keys(poll.votes ?? {}).length
                    const count = Object.values(poll.votes ?? {}).filter(v => v === i).length
                    const pct = totalVotes > 0 ? Math.round(count / totalVotes * 100) : 0
                    const hasVoted = user ? user.uid in (poll.votes ?? {}) : false
                    const voted = hasVoted && (poll.votes ?? {})[user!.uid] === i
                    return (
                      <button key={i} disabled={hasVoted || !user} onClick={() => votePoll(i)}
                        className='relative text-left text-[10px] border overflow-hidden transition-all'
                        style={{ borderColor: voted ? 'rgba(0,255,65,0.7)' : 'rgba(0,255,65,0.2)', color: voted ? '#00ff41' : 'rgba(0,255,65,0.6)', padding: '2px 6px', background: 'transparent', cursor: hasVoted ? 'default' : 'pointer' }}
                      >
                        <div className='absolute inset-0 transition-all duration-500' style={{ width: hasVoted ? `${pct}%` : '0%', background: 'rgba(0,255,65,0.07)' }} />
                        <span className='relative z-10'>{opt}</span>
                        {hasVoted && <span className='relative z-10 float-right text-[9px] text-[#00ff41]/45'>{pct}%</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : announcements?.messages?.length ? (() => {
                const [top, bottom] = (announcements.messages[annIndex % announcements.messages.length] ?? '').split('\n')
                const renderLetters = (text: string, className: string) => (
                  <p className={className}>
                    {text.split('').map((char, i) => (
                      <span
                        key={i}
                        data-ann-letter
                        style={{ display: 'inline-block', opacity: 0 }}
                      >{char === ' ' ? '\u00A0' : char}</span>
                    ))}
                  </p>
                )
                return (
                  <div key={annIndex} ref={annBarRef} className='flex flex-col justify-center overflow-hidden'>
                    {renderLetters(top ?? '', 'text-sm font-bold tracking-wider')}
                    {bottom && renderLetters(bottom, 'text-[#00ff41]/50 text-xs mt-0.5')}
                  </div>
                )
              })() : (
              <div className='flex flex-col justify-center'>
                <h2 className='text-sm font-bold tracking-wider'>
                  {streamTitle || 'Intelligence Artificielle : Menace ou Opportunite ?'}
                </h2>
                <p className='text-[#00ff41]/50 text-xs mt-0.5'>par <span className='text-[#00ff41]/80'>@4n0nz</span> - Demarre il y a 2h - 847 interactions</p>
              </div>
            )}
          </div>
        </div>

        {rightPanel === 'chat' && (
          <>
        {/* Right sidebar — chat + drawer */}
        <div
          className='relative flex flex-col overflow-hidden w-full flex-1 min-h-0 border-t lg:border-t-0 lg:border-l border-[#00ff41]/20 lg:flex-none lg:w-[var(--chat-w)]'
          style={{ '--chat-w': `${chatWidth}px` } as CSSProperties}
        >
          <div className='flex flex-col h-full overflow-hidden'>
            <ChatPanel
              messages={filteredMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendMessage={sendMessage}
              chatFullscreen={chatFullscreen}
              setChatFullscreen={setChatFullscreen}
              chatEndRef={chatEndRef}
              user={user}
              userPopup={userPopup}
              setUserPopup={setUserPopup}
              friends={friends}
              sentReqUids={sentReqUids}
              sendFriendRequest={sendFriendRequest}
              onAuthRequired={() => setModal('login')}
              isMuted={isBanned || (mutedUntil?.getTime() ?? 0) > Date.now()}
              mutedUntil={isBanned ? null : mutedUntil}
              chatFontSize={chatFontSize}
              blockUser={blockUser}
            />
          </div>

          <RightDrawer
            open={rightDrawerOpen}
            onClose={() => setRightDrawerOpen(false)}
            rightTab={rightTab}
            setRightTab={setRightTab}
            menuSection={menuSection}
            setMenuSection={setMenuSection}
            user={user}
            userRole={userRole}
            userIcon={userIcon}
            userColor={userColor}
            saveIcon={saveIcon}
            saveColor={saveColor}
            editingName={editingName}
            setEditingName={setEditingName}
            newDisplayName={newDisplayName}
            setNewDisplayName={setNewDisplayName}
            saveName={saveName}
            userCreatedAt={userCreatedAt}
            showTimestamps={showTimestamps}
            setShowTimestamps={setShowTimestamps}
            chatFontSize={chatFontSize}
            setChatFontSize={setChatFontSize}
            streamVolume={streamVolume}
            setStreamVolume={setStreamVolume}
            notifSound={notifSound}
            setNotifSound={setNotifSound}
            ghostMode={ghostMode}
            setGhostMode={setGhostMode}
            blockedUsers={blockedUsers}
            unblockUser={unblockUser}
            fcmEnabled={fcmEnabled}
            enablePush={enablePush}
            appNotifications={appNotifications}
            markNotificationsRead={markNotificationsRead}
            handleSignOut={handleSignOut}
            messages={messages}
            incomingFriendReqs={incomingFriendReqs}
            friends={friends}
            myCrew={myCrew}
            publicCrews={publicCrews}
            crewBadge={!!crewBadge}
            adminUsers={adminUsers}
            resetChat={resetChat}
            changeRole={changeRole}
            acceptFriendReq={acceptFriendReq}
            declineFriendReq={declineFriendReq}
            showCrewCreate={showCrewCreate}
            setShowCrewCreate={setShowCrewCreate}
            crewNameInput={crewNameInput}
            setCrewNameInput={setCrewNameInput}
            crewTagInput={crewTagInput}
            setCrewTagInput={setCrewTagInput}
            createCrew={createCrew}
            requestJoinCrew={requestJoinCrew}
            acceptCrewMember={acceptCrewMember}
            leaveCrew={leaveCrew}
            streamUrl={streamUrl}
            streamTitle={streamTitle}
            streamType={streamType}
            fallbackUrl={fallbackUrl}
            saveStreamSource={saveStreamSource}
            broadcastNotify={broadcastNotify}
            broadcasting={broadcasting}
            startBroadcast={startBroadcast}
            stopBroadcast={stopBroadcast}
            pipEnabled={pipEnabled}
            togglePip={togglePip}
            pipSwapped={pipSwapped}
            toggleSwap={toggleSwap}
            viewerPipActive={viewerPipActive}
            startViewerPip={startViewerPip}
            stopViewerPip={stopViewerPip}
            announcements={announcements}
            saveAnnouncements={saveAnnouncements}
            restream={restream}
            saveRestream={saveRestream}
            restreamKeys={restreamKeys}
            loadRestreamKeys={loadRestreamKeys}
            saveRestreamKeys={saveRestreamKeys}
            poll={poll}
            createPoll={createPoll}
            closePoll={closePoll}
            schedule={schedule}
            saveSchedule={saveSchedule}
            muteChatUser={muteChatUser}
            unmuteUser={unmuteUser}
            banChatUser={banChatUser}
            unbanUser={unbanUser}
          />

        </div>
          </>
        )}

        {rightPanel === 'cams' && (
          <div
            className='border-t lg:border-t-0 lg:border-l border-[#00ff41]/20 lg:flex-none lg:w-[var(--chat-w)] shrink-0 grid grid-cols-2 gap-[1px] bg-[#00ff41]/10 p-[1px]'
            style={{ '--chat-w': `${chatWidth}px` } as CSSProperties}
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const viewer = remoteViewers[i]
              const isSelf = viewer?.uid === user?.uid

              if (viewer) return (
                <div key={viewer.uid} className='relative bg-black border border-[#00ff41]/25 overflow-hidden' style={{ aspectRatio: '1/1' }}>
                  {isSelf
                    ? <video ref={viewerPipVideoRef} autoPlay muted playsInline className='w-full h-full object-cover' />
                    : <ViewerStream uid={viewer.uid} name={viewer.name} />
                  }
                  <div className='absolute bottom-0.5 left-1 text-[8px] text-[#00ff41]/60 tracking-widest pointer-events-none'>{isSelf ? 'MOI' : viewer.name}</div>
                  {isSelf && <button onClick={stopViewerPip} className='absolute top-1 right-1 text-[8px] text-[#ff4141]/70 hover:text-[#ff4141] bg-black/60 px-1 leading-none'>✕</button>}
                </div>
              )

              if (i === remoteViewers.length && user && !isHost && !viewerPipActive) return (
                <div key='join' onClick={startViewerPip}
                  className='bg-black border border-[#00ff41]/20 hover:border-[#00ff41]/50 hover:bg-[#00ff41]/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-1'
                  style={{ aspectRatio: '1/1' }}
                >
                  <span className='text-lg'>📷</span>
                  <span className='text-[8px] tracking-widest text-[#00ff41]/45'>REJOINDRE</span>
                </div>
              )

              return <div key={i} className='bg-black border border-[#00ff41]/10' style={{ aspectRatio: '1/1' }} />
            })}
          </div>
        )}

      </div>

      <div className='w-full h-[2px] bg-[#00ff41] shrink-0' />
    </main>
  )
}
