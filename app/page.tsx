'use client'
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import { LogIn, User, LogOut } from 'lucide-react'
import {
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  collection, addDoc, query, orderBy, limit, onSnapshot,
  serverTimestamp, doc, getDoc, setDoc, getDocs, updateDoc,
  where, arrayUnion, writeBatch,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

import PasswordGate from './components/PasswordGate'
import IntroAnimation from './components/IntroAnimation'
import AuthModal from './components/AuthModal'
import LeftSidebar from './components/LeftSidebar'
import ChatPanel from './components/ChatPanel'
import RightDrawer from './components/RightDrawer'

import type {
  UserRole, Message, FriendReq, Friend,
  Crew, CrewMember, PublicCrew, AdminUser,
} from './types'

function getYouTubeIds(text: string): string[] {
  if (!text) return []
  const re = /(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g
  const ids: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) ids.push(m[1])
  return ids
}

export default function Home() {
  // ── Auth & gate ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState<'login' | 'register' | null>(null)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const isHost = userRole === 'admin' || user?.email === 'mikeclaudo@gmail.com'
  const [chatWidth, setChatWidth] = useState(340)

  useEffect(() => {
    if (sessionStorage.getItem('dev_unlocked') === '1') setUnlocked(true)
  }, [])

  // Resizable chat width (desktop): user drags the divider between stream and chat
  useEffect(() => {
    const saved = Number(localStorage.getItem('chat_width'))
    if (saved >= 260) setChatWidth(saved)
  }, [])
  useEffect(() => { localStorage.setItem('chat_width', String(chatWidth)) }, [chatWidth])
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
  const [menuSection, setMenuSection] = useState<'profil' | 'notifications' | 'parametres' | 'historique' | 'source' | null>(null)

  // ── Profile state ─────────────────────────────────────────────────────────
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null)
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [userIcon, setUserIcon] = useState('')
  const [userColor, setUserColor] = useState('#00ff41')

  // ── Stream source ─────────────────────────────────────────────────────────
  const [streamUrl, setStreamUrl] = useState('')
  const [streamTitle, setStreamTitle] = useState('')
  const [streamType, setStreamType] = useState<'youtube' | 'camera'>('youtube')
  const [broadcasting, setBroadcasting] = useState(false)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  // ── YouTube synced playback (admin = host, viewers follow) ─────────────────
  const [ytApiReady, setYtApiReady] = useState(false)
  const [viewerUnmuted, setViewerUnmuted] = useState(false)
  const ytWrapRef = useRef<HTMLDivElement | null>(null)
  const ytPlayerRef = useRef<unknown>(null)
  const playbackRef = useRef<{ playing?: boolean; time?: number; videoId?: string; updatedAt?: { seconds: number } } | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const playlist = streamType === 'youtube' ? getYouTubeIds(streamUrl) : []
  const ytVideoId = playlist.length ? (playlist[Math.min(currentIndex, playlist.length - 1)] ?? null) : null

  // ── Picture-in-Picture: admin camera overlaid on the YouTube video ─────────
  const [pipEnabled, setPipEnabled] = useState(false)
  const [pipX, setPipX] = useState(72)
  const [pipY, setPipY] = useState(66)
  const [pipDragging, setPipDragging] = useState(false)
  const pipVideoRef = useRef<HTMLVideoElement | null>(null)
  const playerBoxRef = useRef<HTMLDivElement | null>(null)
  const pipPosRef = useRef({ x: 72, y: 66 })

  const syncViewer = useCallback(() => {
    const d = playbackRef.current
    const player = ytPlayerRef.current as { getCurrentTime?: () => number; getPlayerState?: () => number; seekTo?: (t: number, allow: boolean) => void; playVideo?: () => void; pauseVideo?: () => void } | null
    if (!d || !player || typeof player.getCurrentTime !== 'function') return
    if (d.videoId && ytVideoId && d.videoId !== ytVideoId) return
    const nowSec = Date.now() / 1000
    const ts = d.updatedAt?.seconds ?? nowSec
    const elapsed = d.playing ? Math.max(0, nowSec - ts) : 0
    const target = (d.time ?? 0) + elapsed
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
    setShowTimestamps(localStorage.getItem('ips_timestamps') === 'true')
  }, [])

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
          if (typeof d.index === 'number') setCurrentIndex(d.index)
          setPipEnabled(!!d.pip)
          if (typeof d.pipX === 'number') { setPipX(d.pipX); pipPosRef.current.x = d.pipX }
          if (typeof d.pipY === 'number') { setPipY(d.pipY); pipPosRef.current.y = d.pipY }
        }
      },
      () => {}
    )
    return () => unsub()
  }, [])

  // Viewer playback: when source is camera and we're NOT the broadcaster, play the HLS feed
  useEffect(() => {
    if (streamType !== 'camera' || broadcasting) return
    const video = cameraVideoRef.current
    if (!video) return
    const src = '/cam2/index.m3u8'
    let hls: { destroy: () => void } | null = null
    let cancelled = false
    ;(async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src // Safari / iOS native HLS
      } else {
        const Hls = (await import('hls.js')).default
        if (cancelled || !Hls.isSupported()) return
        const h = new Hls({ lowLatencyMode: true, backBufferLength: 10 })
        h.loadSource(src)
        h.attachMedia(video)
        hls = h
      }
    })()
    return () => { cancelled = true; hls?.destroy(); video.removeAttribute('src'); video.load() }
  }, [streamType, broadcasting])

  // PiP — admin: show own camera locally in the PiP box
  useEffect(() => {
    if (!broadcasting || !pipEnabled) return
    const v = pipVideoRef.current
    if (v && localStreamRef.current) { v.srcObject = localStreamRef.current; v.muted = true }
  }, [broadcasting, pipEnabled, ytVideoId])

  // PiP — viewers: play the camera HLS feed in the PiP box
  useEffect(() => {
    if (!pipEnabled || broadcasting || streamType !== 'youtube') return
    const video = pipVideoRef.current
    if (!video) return
    const src = '/cam2/index.m3u8'
    let hls: { destroy: () => void } | null = null
    let cancelled = false
    ;(async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
      } else {
        const Hls = (await import('hls.js')).default
        if (cancelled || !Hls.isSupported()) return
        const h = new Hls({ lowLatencyMode: true, backBufferLength: 10 })
        h.loadSource(src)
        h.attachMedia(video)
        hls = h
      }
    })()
    return () => { cancelled = true; hls?.destroy(); video.removeAttribute('src'); video.load() }
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
        onReady: () => { if (!isHost) syncViewer() },
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
      wrap.innerHTML = ''
    }
  }, [ytApiReady, ytVideoId, isHost, syncViewer])

  // Viewers: follow the host's playback in real time + correct drift
  useEffect(() => {
    if (isHost || !ytVideoId) return
    const unsub = onSnapshot(doc(db, 'config', 'playback'), snap => {
      playbackRef.current = (snap.data() as typeof playbackRef.current) ?? null
      syncViewer()
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
      const isAdmin = u.email === 'mikeclaudo@gmail.com'
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
      const cached = localStorage.getItem('ips_messages')
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
        try { localStorage.setItem('ips_messages', JSON.stringify(merged)) } catch {}
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
    try { localStorage.removeItem('ips_messages') } catch {}
    const snap = await getDocs(collection(db, 'messages'))
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
  }

  const changeRole = async (uid: string, role: string) => {
    await updateDoc(doc(db, 'users', uid), { role })
    setAdminUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u))
  }

  const saveStreamSource = async (url: string, title: string, type: 'youtube' | 'camera' = 'youtube') => {
    setStreamUrl(url)
    setStreamTitle(title)
    setStreamType(type)
    setCurrentIndex(0)
    await setDoc(doc(db, 'config', 'stream'), { url, title, type, index: 0, updatedAt: serverTimestamp() }, { merge: true })
  }

  const stopBroadcast = () => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null
    setBroadcasting(false)
  }

  // Publish this device's camera to MediaMTX via WHIP (admin only)
  const startBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
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

  const startPipDrag = (e: { preventDefault: () => void }) => {
    if (!isHost) return
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
    await signOut(auth)
    setUserMenuOpen(false)
    setRightDrawerOpen(false)
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

      <div className='w-full h-[2px] bg-[#00ff41] shrink-0' />

      {/* Nav */}
      <nav className='flex items-center justify-between px-3 border-b border-[#00ff41]/30 shrink-0 h-[60px]'>
        <span className='text-base sm:text-lg font-bold tracking-widest'>RoshDynamics</span>
        <div className='w-auto sm:w-64 grid grid-cols-2 gap-2'>
          <div />
          <div className='flex justify-center'>
            {user ? (
              <div className='relative'>
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
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
                {userMenuOpen && (
                  <div
                    className='absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-40'
                    style={{ background: '#060d07', border: '1px solid rgba(0,255,65,0.3)', minWidth: '140px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
                  >
                    <div className='px-3 py-2 border-b border-[#00ff41]/20 text-[10px] text-[#00ff41]/50 font-mono truncate'>
                      {user.email}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className='w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-mono text-[#00ff41]/70 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all'
                    >
                      <LogOut size={12}/> Deconnexion
                    </button>
                  </div>
                )}
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
        />

        {/* Main content */}
        <div className='flex flex-col shrink-0 lg:flex-1 lg:min-h-0 overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3'>
          <div ref={playerBoxRef} className='relative border-2 border-[#00ff41] aspect-video lg:aspect-auto lg:flex-1 bg-black overflow-hidden'>
            {streamType === 'camera' ? (
              <>
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className='w-full h-full object-contain bg-black'
                />
                <div className='absolute top-2 left-3 flex items-center gap-2'>
                  <span className={`w-2 h-2 rounded-full ${broadcasting ? 'bg-[#ff4141] animate-pulse' : 'bg-[#00ff41]/30'}`} />
                  <span className='text-xs tracking-widest'>{broadcasting ? 'EN DIRECT · CAMERA' : 'CAMERA'}</span>
                </div>
              </>
            ) : ytVideoId ? (
              <>
                <div ref={ytWrapRef} className='w-full h-full' />
                {!isHost && (
                  <div
                    className='absolute inset-0 z-10 cursor-pointer'
                    onClick={() => {
                      const p = ytPlayerRef.current as { isMuted?: () => boolean; unMute?: () => void } | null
                      if (p?.isMuted?.()) { p.unMute?.(); setViewerUnmuted(true) }
                    }}
                  />
                )}
                <div className='absolute top-2 right-3 text-[10px] tracking-widest text-[#00ff41]/45 pointer-events-none'>
                  {isHost ? '● CONTROLE ADMIN' : 'SYNC ADMIN'}
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
                {!isHost && !viewerUnmuted && (
                  <div className='absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[10px] tracking-widest text-[#00ff41]/70 bg-black/60 px-3 py-1.5 border border-[#00ff41]/30 pointer-events-none'>
                    cliquez pour activer le son
                  </div>
                )}
              </>
            ) : streamUrl && getEmbedUrl(streamUrl) ? (
              <iframe
                src={getEmbedUrl(streamUrl)!}
                className='w-full h-full'
                allow='autoplay; fullscreen; encrypted-media'
                allowFullScreen
                style={{ border: 'none' }}
              />
            ) : (
              <>
                <div className='absolute top-2 left-3 flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-[#00ff41] animate-pulse' />
                  <span className='text-xs tracking-widest'>EN DIRECT</span>
                </div>
                <div className='absolute top-2 right-3 text-xs text-[#00ff41]/50'>2,341 SPECTATEURS</div>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='text-center'>
                    <div className='text-5xl opacity-20'>&#9654;</div>
                    <p className='text-[#00ff41]/30 text-xs tracking-widest mt-2'>
                      {(userRole === 'admin' || user?.email === 'mikeclaudo@gmail.com')
                        ? 'Configurez la source dans le menu admin'
                        : 'STREAM EN COURS'}
                    </p>
                  </div>
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
                className='absolute z-20 border border-[#00ff41]/60 bg-black overflow-hidden shadow-lg'
                style={{ left: `${pipX}%`, top: `${pipY}%`, width: '24%', aspectRatio: '16 / 9', cursor: isHost ? 'move' : 'default' }}
                onMouseDown={isHost ? startPipDrag : undefined}
                onTouchStart={isHost ? startPipDrag : undefined}
              >
                <video ref={pipVideoRef} autoPlay muted={isHost ? true : !viewerUnmuted} playsInline className='w-full h-full object-cover pointer-events-none' />
                {isHost && <div className='absolute top-0.5 left-1 text-[8px] text-[#00ff41]/80 tracking-widest pointer-events-none'>PIP · GLISSER</div>}
              </div>
            )}
            {/* drag shield: stops the YouTube iframe from swallowing mouse events while dragging */}
            {pipDragging && <div className='absolute inset-0 z-30' style={{ cursor: 'move' }} />}
          </div>
          <div className='border border-[#00ff41]/30 px-4 bg-[#00ff41]/5 shrink-0 h-[65px] flex flex-col justify-center'>
            <h2 className='text-sm font-bold tracking-wider'>
              {streamTitle || 'Intelligence Artificielle : Menace ou Opportunite ?'}
            </h2>
            <p className='text-[#00ff41]/50 text-xs mt-0.5'>par <span className='text-[#00ff41]/80'>@4n0nz</span> - Demarre il y a 2h - 847 interactions</p>
          </div>
        </div>

        {/* Resize handle (desktop only) — drag to share width between stream and chat */}
        <div
          onMouseDown={onResizeStart}
          onTouchStart={onResizeStart}
          title='Glisser pour redimensionner'
          className='hidden lg:flex shrink-0 w-1.5 cursor-col-resize bg-[#00ff41]/10 hover:bg-[#00ff41]/40 active:bg-[#00ff41]/60 transition-colors items-center justify-center group select-none'
        >
          <div className='w-[2px] h-8 bg-[#00ff41]/40 group-hover:bg-[#00ff41] rounded' />
        </div>

        {/* Right sidebar — chat + drawer */}
        <div
          className='relative flex flex-col overflow-hidden w-full flex-1 min-h-0 border-t lg:border-t-0 lg:border-l border-[#00ff41]/20 lg:flex-none lg:w-[var(--chat-w)]'
          style={{ '--chat-w': `${chatWidth}px` } as CSSProperties}
        >
          <div className='flex flex-col h-full overflow-hidden'>
            <ChatPanel
              messages={messages}
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
            saveStreamSource={saveStreamSource}
            broadcasting={broadcasting}
            startBroadcast={startBroadcast}
            stopBroadcast={stopBroadcast}
            pipEnabled={pipEnabled}
            togglePip={togglePip}
          />

          {user && (
            <button
              onClick={() => setRightDrawerOpen(o => !o)}
              className='absolute top-1/2 -translate-y-1/2 right-0 z-50 w-6 h-10 flex items-center justify-center bg-black border border-[#00ff41]/30 text-[#00ff41]/50 hover:text-[#00ff41] hover:border-[#00ff41]/70 transition-all'
              style={{ fontSize: '9px', borderRadius: '0 3px 3px 0' }}
            >
              {rightDrawerOpen ? '▶' : '◀'}
            </button>
          )}
        </div>

      </div>

      <div className='w-full h-[2px] bg-[#00ff41] shrink-0' />
    </main>
  )
}
