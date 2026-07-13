'use client'
import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { ICONS, COLORS, ADMIN_EMAILS } from '../constants'
import type {
  FirebaseUser, UserRole, Message, FriendReq, Friend,
  Crew, CrewMember, PublicCrew, AdminUser, Poll, Schedule, AppNotification,
} from '../types'

type MenuSection = 'profil' | 'notifications' | 'parametres' | 'historique' | 'source' | 'annonces' | 'sondage' | 'programme' | 'pip' | 'restream'
type RightTab = 'menu' | 'amis' | 'crew'

type Props = {
  open: boolean
  onClose: () => void
  rightTab: RightTab
  setRightTab: (t: RightTab) => void
  menuSection: MenuSection | null
  setMenuSection: (s: MenuSection | null) => void

  user: FirebaseUser | null
  userRole: UserRole | null
  userIcon: string
  userColor: string
  saveIcon: (icon: string) => void
  saveColor: (color: string) => void
  editingName: boolean
  setEditingName: (v: boolean) => void
  newDisplayName: string
  setNewDisplayName: (v: string) => void
  saveName: () => void
  userCreatedAt: string | null

  showTimestamps: boolean
  setShowTimestamps: (v: boolean) => void
  chatFontSize: 'S' | 'M' | 'L'
  setChatFontSize: (v: 'S' | 'M' | 'L') => void
  streamVolume: number
  setStreamVolume: (v: number) => void
  notifSound: boolean
  setNotifSound: (v: boolean) => void
  ghostMode: boolean
  setGhostMode: (v: boolean) => void
  blockedUsers: Array<{ uid: string; name: string }>
  unblockUser: (uid: string) => void
  fcmEnabled: boolean
  enablePush: () => Promise<void>
  appNotifications: AppNotification[]
  markNotificationsRead: () => void
  handleSignOut: () => void

  messages: Message[]
  incomingFriendReqs: FriendReq[]
  friends: Friend[]
  myCrew: Crew | null
  publicCrews: PublicCrew[]
  crewBadge: boolean

  adminUsers: AdminUser[]
  resetChat: () => void
  changeRole: (uid: string, role: string) => void

  acceptFriendReq: (req: FriendReq) => void
  declineFriendReq: (reqId: string) => void

  showCrewCreate: boolean
  setShowCrewCreate: (v: boolean) => void
  crewNameInput: string
  setCrewNameInput: (v: string) => void
  crewTagInput: string
  setCrewTagInput: (v: string) => void
  createCrew: () => void
  requestJoinCrew: (crewId: string) => void
  acceptCrewMember: (member: CrewMember) => void
  leaveCrew: () => void

  streamUrl: string
  streamTitle: string
  streamType: 'youtube' | 'camera' | 'screen'
  fallbackUrl: string
  saveStreamSource: (url: string, title: string, type: 'youtube' | 'camera' | 'screen') => void
  broadcastNotify: (title: string, body: string) => void
  broadcasting: boolean
  startBroadcast: (mode?: 'camera' | 'screen') => void
  stopBroadcast: () => void
  pipEnabled: boolean
  togglePip: (on: boolean) => void
  pipSwapped: boolean
  toggleSwap: () => void
  viewerPipActive: boolean
  startViewerPip: () => void
  stopViewerPip: () => void
  announcements: { messages: string[]; interval: number } | null
  saveAnnouncements: (messages: string[], interval: number) => void
  restream: { tiktok: boolean; youtube: boolean; facebook: boolean; x: boolean; luxmedia: boolean }
  saveRestream: (platform: 'tiktok' | 'youtube' | 'facebook' | 'x' | 'luxmedia', enabled: boolean) => void
  restreamKeys: Record<'tiktok' | 'youtube' | 'facebook' | 'x' | 'luxmedia', { url: string; keySet: boolean; keyHint: string }> | null
  loadRestreamKeys: () => void
  saveRestreamKeys: (payload: Record<string, { url?: string; key?: string }>) => Promise<void>
  poll: Poll | null
  createPoll: (question: string, options: string[]) => void
  closePoll: () => void
  schedule: Schedule | null
  saveSchedule: (lines: { text: string; format: string }[]) => void
  muteChatUser: (uid: string, minutes: number) => void
  unmuteUser: (uid: string) => void
  banChatUser: (uid: string) => void
  unbanUser: (uid: string) => void
}

export default function RightDrawer({
  open, onClose, rightTab, setRightTab, menuSection, setMenuSection,
  user, userRole, userIcon, userColor, saveIcon, saveColor,
  editingName, setEditingName, newDisplayName, setNewDisplayName, saveName, userCreatedAt,
  showTimestamps, setShowTimestamps,
  chatFontSize, setChatFontSize,
  streamVolume, setStreamVolume, notifSound, setNotifSound, ghostMode, setGhostMode,
  blockedUsers, unblockUser,
  fcmEnabled, enablePush, appNotifications, markNotificationsRead,
  handleSignOut,
  messages, incomingFriendReqs, friends, myCrew, publicCrews, crewBadge,
  adminUsers, resetChat, changeRole,
  acceptFriendReq, declineFriendReq,
  showCrewCreate, setShowCrewCreate, crewNameInput, setCrewNameInput,
  crewTagInput, setCrewTagInput, createCrew, requestJoinCrew, acceptCrewMember, leaveCrew,
  streamUrl, streamTitle, streamType, fallbackUrl, saveStreamSource, broadcastNotify,
  broadcasting, startBroadcast, stopBroadcast,
  pipEnabled, togglePip,
  pipSwapped, toggleSwap,
  viewerPipActive, startViewerPip, stopViewerPip,
  announcements, saveAnnouncements,
  restream, saveRestream,
  restreamKeys, loadRestreamKeys, saveRestreamKeys,
  poll, createPoll, closePoll,
  schedule, saveSchedule,
  muteChatUser, unmuteUser, banChatUser, unbanUser,
}: Props) {
  const [sourceUrlInput, setSourceUrlInput] = useState(streamUrl)
  const [annMsgs, setAnnMsgs] = useState<string[]>(announcements?.messages ?? [])
  const [annInterval, setAnnInterval] = useState(announcements?.interval ?? 300)
  const [annInput, setAnnInput] = useState('')
  const [keyForm, setKeyForm] = useState<Record<'tiktok' | 'youtube' | 'facebook' | 'x' | 'luxmedia', { url: string; key: string }>>({
    tiktok: { url: '', key: '' }, youtube: { url: '', key: '' }, facebook: { url: '', key: '' }, x: { url: '', key: '' }, luxmedia: { url: '', key: '' },
  })
  const [keysSaving, setKeysSaving] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [scheduleLines, setScheduleLines] = useState<{ text: string; format: string }[]>([{ text: '', format: 'titre' }])
  // Sync local state when Firestore data arrives
  useEffect(() => {
    setAnnMsgs(announcements?.messages ?? [])
    setAnnInterval(announcements?.interval ?? 5)
  }, [announcements])

  useEffect(() => {
    if (restreamKeys) setKeyForm({
      tiktok: { url: restreamKeys.tiktok.url, key: '' },
      youtube: { url: restreamKeys.youtube.url, key: '' },
      facebook: { url: restreamKeys.facebook.url, key: '' },
      x: { url: restreamKeys.x.url, key: '' },
      luxmedia: { url: restreamKeys.luxmedia.url, key: '' },
    })
  }, [restreamKeys])
  const [sourceType, setSourceType] = useState<'youtube' | 'camera' | 'screen'>(streamType)
  const isAdmin = userRole === 'admin' || ADMIN_EMAILS.includes(user?.email ?? '')

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div
      onClick={() => onChange(!value)}
      className='w-9 h-5 rounded-full transition-all cursor-pointer relative shrink-0'
      style={{ background: value ? '#00ff41' : 'rgba(0,255,65,0.12)', border: '1px solid rgba(0,255,65,0.35)' }}
    >
      <div className='absolute top-0.5 w-3.5 h-3.5 rounded-full bg-black transition-all duration-200' style={{ left: value ? '19px' : '2px' }} />
    </div>
  )

  useEffect(() => { setSourceUrlInput(streamUrl) }, [streamUrl])
  useEffect(() => { if (sourceType === 'youtube') setSourceUrlInput(fallbackUrl) }, [sourceType, fallbackUrl])
  useEffect(() => { setSourceType(streamType) }, [streamType])
  useEffect(() => {
    if (schedule?.lines?.length) setScheduleLines((schedule.lines as unknown[]).map(l => typeof l === 'string' ? { text: l, format: 'paragraphe' } : { text: (l as { text?: string }).text ?? '', format: (l as { format?: string }).format ?? 'paragraphe' }))
  }, [schedule])
  const unreadNotifs = appNotifications.filter(n => !n.read).length
  const totalNotifBadge = incomingFriendReqs.length + (crewBadge ? (myCrew?.pending.length ?? 0) : 0) + unreadNotifs

  return (
    <div
      className='fixed lg:absolute top-[62px] lg:top-0 bottom-0 right-0 flex flex-col bg-black border-l border-[#00ff41]/40 transition-all duration-300 overflow-hidden z-40'
      style={{ width: open ? '100%' : '0px', boxShadow: open ? '-4px 0 20px rgba(0,255,65,0.1)' : 'none' }}
    >
      <div className='w-full flex flex-col h-full overflow-hidden'>

        {/* Tab header */}
        <div className='border-b border-[#00ff41]/30 shrink-0 relative'>
          <div className='flex'>
            {(['menu', 'amis', 'crew'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`relative flex-1 py-2 text-[9px] tracking-widest transition-all ${rightTab === tab ? 'text-[#00ff41]' : 'text-[#00ff41]/35 hover:text-[#00ff41]/70'}`}
              >
                {tab === 'amis' && incomingFriendReqs.length > 0 && (
                  <span className='absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-[#ff4141] text-[7px] flex items-center justify-center text-white font-bold'>
                    {incomingFriendReqs.length}
                  </span>
                )}
                {tab === 'crew' && crewBadge && (
                  <span className='absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-[#ffd700] text-[7px] flex items-center justify-center text-black font-bold'>
                    {myCrew!.pending.length}
                  </span>
                )}
                {tab.toUpperCase()}
                {rightTab === tab && <div className='absolute bottom-0 left-0 right-0 h-[1px] bg-[#00ff41]' />}
              </button>
            ))}
          </div>
        </div>

        {/* ── MENU tab ── */}
        {rightTab === 'menu' && (
          <div className='flex flex-col overflow-y-auto flex-1'>
            {menuSection ? (
              <>
                <button
                  onClick={() => setMenuSection(null)}
                  className='flex items-center gap-2 px-3 py-2 text-[10px] text-[#00ff41]/40 hover:text-[#00ff41] border-b border-[#00ff41]/15 transition-colors shrink-0 tracking-widest'
                >‹ {menuSection.toUpperCase()}</button>

                {/* PROFIL */}
                {menuSection === 'profil' && (
                  <div className='px-3 py-4 space-y-4'>
                    <div className='flex flex-col items-center gap-3'>
                      <div
                        className='w-16 h-16 rounded-full border-2 border-[#00ff41]/50 flex items-center justify-center'
                        style={{ background: 'rgba(0,255,65,0.05)' }}
                      >
                        {userIcon ? (
                          <span className='text-3xl'>{userIcon}</span>
                        ) : (
                          <span style={{ color: userColor, fontSize: '26px', fontWeight: 700 }}>
                            {(user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Icon grid */}
                      <div className='grid grid-cols-6 gap-1 w-full'>
                        <button
                          onClick={() => saveIcon('')}
                          className='text-[11px] flex items-center justify-center rounded transition-all font-bold'
                          style={{
                            padding: '4px', height: '28px',
                            background: userIcon === '' ? 'rgba(0,255,65,0.15)' : 'transparent',
                            border: userIcon === '' ? '1px solid rgba(0,255,65,0.5)' : '1px solid rgba(0,255,65,0.15)',
                            color: userColor,
                          }}
                        >{(user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '?')[0].toUpperCase()}</button>
                        {ICONS.map(ic => (
                          <button
                            key={ic}
                            onClick={() => saveIcon(ic)}
                            className='text-[16px] flex items-center justify-center rounded transition-all'
                            style={{
                              padding: '4px',
                              background: userIcon === ic ? 'rgba(0,255,65,0.15)' : 'transparent',
                              border: userIcon === ic ? '1px solid rgba(0,255,65,0.5)' : '1px solid transparent',
                            }}
                          >{ic}</button>
                        ))}
                      </div>
                      {/* Color picker — only when no emoji */}
                      {userIcon === '' && (
                        <div className='w-full'>
                          <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-2'>COULEUR</div>
                          <div className='grid grid-cols-6 gap-1.5'>
                            {COLORS.map(c => (
                              <button
                                key={c}
                                onClick={() => saveColor(c)}
                                className='w-full rounded-sm transition-all'
                                style={{
                                  height: '18px', background: c,
                                  outline: userColor === c ? '2px solid #fff' : '2px solid transparent',
                                  outlineOffset: '1px',
                                  opacity: userColor === c ? 1 : 0.6,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Name edit */}
                    {editingName ? (
                      <div className='flex gap-1'>
                        <input
                          value={newDisplayName}
                          onChange={e => setNewDisplayName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveName()}
                          autoFocus
                          className='flex-1 bg-transparent border border-[#00ff41]/40 px-2 py-1 text-[11px] text-[#00ff41] outline-none focus:border-[#00ff41]/70'
                        />
                        <button onClick={saveName} className='px-2 text-[11px] border border-[#00ff41]/40 text-[#00ff41]/70 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all'>✓</button>
                        <button onClick={() => setEditingName(false)} className='px-2 text-[11px] border border-[#00ff41]/15 text-[#00ff41]/30 hover:text-[#00ff41] transition-all'>✗</button>
                      </div>
                    ) : (
                      <div className='text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <span className='text-[13px] font-bold text-[#00ff41]'>
                            {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'anon'}
                          </span>
                          <button
                            onClick={() => { setNewDisplayName(user?.displayName?.split(' ')[0] || ''); setEditingName(true) }}
                            className='text-[#00ff41]/25 hover:text-[#00ff41]/70 transition-colors text-[11px]'
                          >✎</button>
                        </div>
                        <div className='text-[10px] text-[#00ff41]/35 mt-0.5'>{user?.email}</div>
                      </div>
                    )}
                    {/* Role badge */}
                    {userRole && (
                      <div className='flex justify-center'>
                        <span style={{
                          fontSize:'10px', padding:'2px 10px', borderRadius:'3px', fontWeight:700, letterSpacing:'0.05em',
                          background: userRole === 'admin' ? 'rgba(255,65,65,0.15)' : userRole === 'vip' ? 'rgba(255,215,0,0.15)' : userRole === 'modo' ? 'rgba(0,191,255,0.15)' : 'rgba(0,255,65,0.08)',
                          color: userRole === 'admin' ? '#ff4141' : userRole === 'vip' ? '#ffd700' : userRole === 'modo' ? '#00bfff' : '#00ff41',
                          border: `1px solid ${userRole === 'admin' ? '#ff414125' : userRole === 'vip' ? '#ffd70025' : userRole === 'modo' ? '#00bfff25' : '#00ff4125'}`,
                        }}>{userRole.toUpperCase()}</span>
                      </div>
                    )}
                    {/* Stats */}
                    <div className='border-t border-[#00ff41]/10 pt-3 space-y-2'>
                      {[
                        { label: 'Amis', value: friends.length },
                        { label: 'Crew', value: myCrew ? `[${myCrew.tag}] ${myCrew.name}` : '—' },
                        { label: 'Membre depuis', value: userCreatedAt ?? '—' },
                      ].map(row => (
                        <div key={row.label} className='flex justify-between items-center text-[10px]'>
                          <span className='text-[#00ff41]/35'>{row.label}</span>
                          <span className='text-[#00ff41]/65'>{String(row.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS */}
                {menuSection === 'notifications' && (
                  <div className='px-2 py-2 space-y-3' onClick={() => markNotificationsRead()}>

                    {/* Push opt-in */}
                    {!fcmEnabled ? (
                      <button
                        onClick={enablePush}
                        className='w-full flex items-center justify-between px-3 py-2.5 border border-[#00ff41]/30 bg-[#00ff41]/5 text-[#00ff41]/70 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all text-[10px] tracking-widest'
                      >
                        <span>🔔 Activer les notifications push</span>
                        <span className='text-[#00ff41]/30 text-[12px]'>›</span>
                      </button>
                    ) : (
                      <div className='flex items-center gap-2 px-3 py-2 border border-[#00ff41]/15 bg-[#00ff41]/3'>
                        <span className='w-1.5 h-1.5 rounded-full bg-[#00ff41] shrink-0' />
                        <span className='text-[10px] text-[#00ff41]/50 tracking-widest'>NOTIFICATIONS PUSH ACTIVES</span>
                      </div>
                    )}

                    {/* Friend requests */}
                    {incomingFriendReqs.length > 0 && (
                      <div>
                        <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-2 px-1'>DEMANDES D&apos;AMIS</div>
                        {incomingFriendReqs.map(req => (
                          <div key={req.id} className='px-2 py-2 border border-[#00ff41]/15 rounded-sm mb-1.5'>
                            <div className='text-[11px] text-[#00ff41]/80 font-bold mb-2'>{req.fromName}</div>
                            <div className='flex gap-1.5'>
                              <button onClick={() => acceptFriendReq(req)} className='flex-1 py-1 text-[9px] border border-[#00ff41]/40 text-[#00ff41]/70 hover:bg-[#00ff41]/10 hover:text-[#00ff41] transition-all rounded-sm tracking-widest'>✓ ACCEPTER</button>
                              <button onClick={() => declineFriendReq(req.id)} className='flex-1 py-1 text-[9px] border border-[#ff4141]/30 text-[#ff4141]/50 hover:bg-[#ff4141]/10 hover:text-[#ff4141] transition-all rounded-sm tracking-widest'>✗ REFUSER</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Crew requests */}
                    {crewBadge && (
                      <div>
                        <div className='text-[9px] text-[#ffd700]/50 tracking-widest mb-2 px-1'>DEMANDES CREW</div>
                        {myCrew!.pending.map(m => (
                          <div key={m.uid} className='px-2 py-2 border border-[#00ff41]/15 rounded-sm mb-1.5'>
                            <div className='text-[11px] text-[#00ff41]/80 font-bold mb-1.5'>{m.name}</div>
                            <button onClick={() => acceptCrewMember(m)} className='w-full py-1 text-[9px] border border-[#00ff41]/40 text-[#00ff41]/70 hover:bg-[#00ff41]/10 hover:text-[#00ff41] transition-all tracking-widest rounded-sm'>✓ ACCEPTER</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* App notifications feed */}
                    {appNotifications.length > 0 && (
                      <div>
                        <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-2 px-1'>ALERTES</div>
                        {appNotifications.map(n => (
                          <div key={n.id} className={`px-2 py-2 border rounded-sm mb-1.5 transition-all ${n.read ? 'border-[#00ff41]/8 bg-transparent' : 'border-[#00ff41]/25 bg-[#00ff41]/5'}`}>
                            <div className='flex items-start justify-between gap-1'>
                              <span className='text-[11px] text-[#00ff41]/80 font-bold leading-tight'>{n.title}</span>
                              {!n.read && <span className='w-1.5 h-1.5 rounded-full bg-[#00ff41] shrink-0 mt-1' />}
                            </div>
                            <p className='text-[10px] text-[#00ff41]/50 mt-0.5 leading-snug'>{n.body}</p>
                            {n.createdAt && (
                              <p className='text-[9px] text-[#00ff41]/25 mt-1'>
                                {n.createdAt.toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {incomingFriendReqs.length === 0 && !crewBadge && appNotifications.length === 0 && (
                      <p className='text-[10px] text-[#00ff41]/25 px-2 py-4 text-center'>Aucune notification</p>
                    )}

                    {/* Sound toggle */}
                    <div className='border-t border-[#00ff41]/10 pt-3 px-1 flex items-center justify-between'>
                      <div>
                        <span className='text-[11px] text-[#00ff41]/65'>Son notifications</span>
                        <p className='text-[9px] text-[#00ff41]/30 mt-0.5'>bip sur nouveau message chat</p>
                      </div>
                      <Toggle value={notifSound} onChange={v => { setNotifSound(v); localStorage.setItem('rd_notifSound', String(v)) }} />
                    </div>
                  </div>
                )}

                {/* PARAMETRES */}
                {menuSection === 'parametres' && (
                  <div className='px-3 py-4 space-y-5'>

                    {/* AFFICHAGE */}
                    <div>
                      <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-3'>AFFICHAGE</div>
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <span className='text-[11px] text-[#00ff41]/65'>Taille police chat</span>
                          <div className='flex gap-1'>
                            {(['S', 'M', 'L'] as const).map(s => (
                              <button key={s} onClick={() => { setChatFontSize(s); localStorage.setItem('rd_chatFontSize', s) }}
                                className='w-7 h-6 text-[9px] tracking-widest transition-all'
                                style={{
                                  border: '1px solid',
                                  borderColor: chatFontSize === s ? '#00ff41' : 'rgba(0,255,65,0.2)',
                                  color: chatFontSize === s ? '#00ff41' : 'rgba(0,255,65,0.35)',
                                  background: chatFontSize === s ? 'rgba(0,255,65,0.1)' : 'transparent',
                                }}
                              >{s}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AUDIO */}
                    <div>
                      <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-3'>AUDIO</div>
                      <div className='space-y-3'>
                        <div className='flex items-center gap-3'>
                          <span className='text-[11px] text-[#00ff41]/65 shrink-0'>Volume stream</span>
                          <input type='range' min={0} max={100} value={streamVolume}
                            onChange={e => setStreamVolume(Number(e.target.value))}
                            className='flex-1 accent-[#00ff41]' />
                          <span className='text-[10px] text-[#00ff41]/50 w-8 text-right shrink-0'>{streamVolume}%</span>
                        </div>
                      </div>
                    </div>

                    {/* CONFIDENTIALITÉ */}
                    <div>
                      <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-3'>CONFIDENTIALITÉ</div>
                      <div className='flex items-center justify-between'>
                        <div>
                          <span className='text-[11px] text-[#00ff41]/65'>Mode fantôme</span>
                          <p className='text-[9px] text-[#00ff41]/30 mt-0.5'>invisible dans le viewer count</p>
                        </div>
                        <Toggle value={ghostMode} onChange={v => { setGhostMode(v); localStorage.setItem('rd_ghostMode', String(v)) }} />
                      </div>
                    </div>

                    {/* CHAT */}
                    <div>
                      <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-3'>CHAT</div>
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <span className='text-[11px] text-[#00ff41]/65'>Timestamps</span>
                          <Toggle value={showTimestamps} onChange={v => { setShowTimestamps(v); localStorage.setItem('rd_timestamps', String(v)) }} />
                        </div>
                        {blockedUsers.length > 0 && (
                          <div>
                            <div className='text-[9px] text-[#00ff41]/30 tracking-widest mb-1.5'>BLOQUÉS ({blockedUsers.length})</div>
                            {blockedUsers.map(b => (
                              <div key={b.uid} className='flex items-center justify-between py-1 border-b border-[#00ff41]/8'>
                                <span className='text-[10px] text-[#00ff41]/50 truncate'>{b.name}</span>
                                <button onClick={() => unblockUser(b.uid)} className='text-[9px] text-[#ff4141]/50 hover:text-[#ff4141] transition-colors ml-2 shrink-0'>DÉBLOQUER</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COMPTE */}
                    <div className='border-t border-[#00ff41]/10 pt-4'>
                      <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-3'>COMPTE</div>
                      <button
                        onClick={handleSignOut}
                        className='w-full flex items-center justify-center gap-2 py-2 text-[11px] text-[#ff4141]/60 hover:text-[#ff4141] border border-[#ff4141]/20 hover:border-[#ff4141]/50 hover:bg-[#ff4141]/5 transition-all tracking-widest'
                      >
                        <LogOut size={11}/> DÉCONNEXION
                      </button>
                    </div>

                  </div>
                )}

                {/* SOURCE */}
                {menuSection === 'source' && (
                  <div className='px-3 py-4 space-y-4'>
                    <div className='text-[9px] text-[#00ff41]/35 tracking-widest'>SOURCE DU STREAM</div>

                    {/* Type selector */}
                    <div>
                      <label className='text-[9px] text-[#00ff41]/40 tracking-widest block mb-1.5'>TYPE</label>
                      <div className='space-y-1.5'>
                        <button
                          onClick={() => { setSourceType('youtube'); if (streamType !== 'youtube') { if (pipEnabled) togglePip(false); else if (broadcasting) stopBroadcast() } }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 border text-[11px] tracking-wide transition-all ${sourceType === 'youtube' ? 'border-[#00ff41]/60 text-[#00ff41] bg-[#00ff41]/10' : 'border-[#00ff41]/20 text-[#00ff41]/50 hover:border-[#00ff41]/40'}`}
                        >
                          <span className='text-[12px] leading-none'>{sourceType === 'youtube' ? '●' : '○'}</span>
                          YouTube / URL
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setSourceType('camera'); if (streamType !== 'camera') { if (pipEnabled) togglePip(false); saveStreamSource('', streamTitle, 'camera') } }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 border text-[11px] tracking-wide transition-all ${sourceType === 'camera' ? 'border-[#00ff41]/60 text-[#00ff41] bg-[#00ff41]/10' : 'border-[#00ff41]/20 text-[#00ff41]/50 hover:border-[#00ff41]/40'}`}
                          >
                            <span className='text-[12px] leading-none'>{sourceType === 'camera' ? '●' : '○'}</span>
                            Camera de l&apos;appareil
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => { setSourceType('screen'); if (streamType !== 'screen') { if (pipEnabled) togglePip(false); saveStreamSource('', streamTitle, 'screen') } }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 border text-[11px] tracking-wide transition-all ${sourceType === 'screen' ? 'border-[#00ff41]/60 text-[#00ff41] bg-[#00ff41]/10' : 'border-[#00ff41]/20 text-[#00ff41]/50 hover:border-[#00ff41]/40'}`}
                          >
                            <span className='text-[12px] leading-none'>{sourceType === 'screen' ? '●' : '○'}</span>
                            Partage d&apos;ecran
                          </button>
                        )}
                      </div>
                    </div>

                    {sourceType === 'youtube' && (
                      <div>
                        <label className='text-[9px] text-[#00ff41]/40 tracking-widest block mb-1.5'>URL</label>
                        <textarea
                          rows={3}
                          value={sourceUrlInput}
                          onChange={e => setSourceUrlInput(e.target.value)}
                          placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.twitch.tv/channel\nhttps://...stream.m3u8'}
                          className='w-full bg-transparent border border-[#00ff41]/30 px-2 py-1.5 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60 resize-none leading-relaxed font-mono'
                        />
                        <p className='text-[9px] text-[#00ff41]/25 mt-1'>YouTube, Twitch ou URL directe. Plusieurs liens YouTube (un par ligne) = playlist avec boutons ⏮ ⏭</p>
                        {isAdmin && (
                          <button
                            onClick={() => togglePip(!pipEnabled)}
                            className={`w-full mt-2 py-2 text-[10px] border tracking-widest transition-all ${pipEnabled ? 'border-[#ff4141]/40 text-[#ff4141]/70 hover:bg-[#ff4141]/10' : 'border-[#00ff41]/40 text-[#00ff41]/70 hover:bg-[#00ff41]/10'}`}
                          >{pipEnabled ? '✕ RETIRER MA CAMERA (PIP)' : '➕ AJOUTER MA CAMERA (PIP)'}</button>
                        )}
                        {isAdmin && pipEnabled && (
                          <button
                            onClick={toggleSwap}
                            className={`w-full mt-1 py-2 text-[10px] border tracking-widest transition-all ${pipSwapped ? 'border-[#00ff41]/60 text-[#00ff41] bg-[#00ff41]/10' : 'border-[#00ff41]/40 text-[#00ff41]/70 hover:bg-[#00ff41]/10'}`}
                          >⇄ INVERSER FOND / PIP</button>
                        )}
                      </div>
                    )}


                    {(sourceType === 'camera' || sourceType === 'screen') && (
                      <div className='space-y-2'>
                        <div className='border border-[#00ff41]/15 p-2 rounded-sm'>
                          <p className='text-[10px] text-[#00ff41]/55 leading-relaxed'>
                            {sourceType === 'screen' ? "Partage l'ecran de cet appareil" : 'Diffuse la camera de cet appareil'} vers tous les viewers via le serveur media. Applique d&apos;abord, puis demarre.
                          </p>
                          <p className='text-[9px] text-[#00ff41]/35 mt-1.5 tracking-widest'>
                            ETAT : {broadcasting ? '🔴 EN DIRECT' : '○ HORS LIGNE'}
                          </p>
                        </div>
                        {!broadcasting ? (
                          <button
                            onClick={() => { saveStreamSource('', streamTitle, sourceType); startBroadcast(sourceType === 'screen' ? 'screen' : 'camera') }}
                            className='w-full py-2 text-[10px] bg-[#ff4141]/15 border border-[#ff4141]/50 text-[#ff4141] hover:bg-[#ff4141]/25 transition-all tracking-widest'
                          >● DEMARRER LA DIFFUSION</button>
                        ) : (
                          <button
                            onClick={stopBroadcast}
                            className='w-full py-2 text-[10px] bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41]/80 hover:bg-[#00ff41]/20 transition-all tracking-widest'
                          >■ ARRETER LA DIFFUSION</button>
                        )}
                        {broadcasting && sourceType === 'screen' && (
                          <button
                            onClick={() => viewerPipActive ? stopViewerPip() : startViewerPip()}
                            className={`w-full py-2 text-[10px] border tracking-widest transition-all ${viewerPipActive ? 'border-[#ff4141]/40 text-[#ff4141]/70 hover:bg-[#ff4141]/10' : 'border-[#00ff41]/40 text-[#00ff41]/70 hover:bg-[#00ff41]/10'}`}
                          >{viewerPipActive ? '✕ RETIRER MA CAMERA (PIP)' : '➕ AJOUTER MA CAMERA (PIP)'}</button>
                        )}
                      </div>
                    )}

                    {streamUrl && (
                      <div className='border border-[#00ff41]/15 p-2 rounded-sm'>
                        <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-1'>ACTUEL</div>
                        <div className='text-[10px] text-[#00ff41]/55 break-all leading-relaxed'>{streamUrl}</div>
                      </div>
                    )}

                    {sourceType === 'youtube' && (
                      <button
                        onClick={() => saveStreamSource(sourceUrlInput.trim(), streamTitle, sourceType)}
                        className='w-full py-2 text-[10px] bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41]/80 hover:text-[#00ff41] hover:bg-[#00ff41]/20 transition-all tracking-widest'
                      >✓ APPLIQUER</button>
                    )}

                    {streamUrl && (
                      <button
                        onClick={() => broadcastNotify('🔴 RoshDynamics est EN DIRECT', streamTitle || 'Le stream vient de démarrer')}
                        className='w-full py-2 text-[10px] border border-[#00ff41]/25 text-[#00ff41]/50 hover:text-[#00ff41]/80 hover:bg-[#00ff41]/5 transition-all tracking-widest'
                      >🔔 NOTIFIER LES MEMBRES</button>
                    )}

                    <button
                      onClick={() => { saveStreamSource('', '', 'youtube'); setSourceUrlInput(''); setSourceType('youtube') }}
                      className='w-full py-1.5 text-[9px] text-[#ff4141]/40 hover:text-[#ff4141] transition-colors tracking-widest'
                    >Retirer la source</button>
                  </div>
                )}

                {/* HISTORIQUE */}
                {menuSection === 'historique' && (
                  <div className='px-2 py-2'>
                    <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-2 px-1'>TES MESSAGES</div>
                    {messages.filter(m => m.uid === user?.uid).length === 0 ? (
                      <p className='text-[10px] text-[#00ff41]/25 px-2 py-6 text-center'>Aucun message envoyé</p>
                    ) : (
                      messages.filter(m => m.uid === user?.uid).slice(-30).reverse().map(m => (
                        <div key={m.id} className='px-2 py-2 border-b border-[#00ff41]/8 text-[10px] text-[#00ff41]/50 hover:text-[#00ff41]/75 transition-colors leading-relaxed'>
                          {m.msg}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ANNONCES */}
                {menuSection === 'annonces' && (
                  <div className='px-2 py-2 flex flex-col gap-3'>
                    <div className='text-[9px] text-[#00ff41]/35 tracking-widest px-1'>MESSAGES DE LA BARRE</div>

                    {/* Interval setting */}
                    <div className='flex items-center gap-2 px-1'>
                      <span className='text-[9px] text-[#00ff41]/50 tracking-widest shrink-0'>INTERVALLE</span>
                      <input
                        type='range' min={60} max={1800} step={60}
                        value={annInterval}
                        onChange={e => setAnnInterval(Number(e.target.value))}
                        className='flex-1 accent-[#00ff41]'
                      />
                      <span className='text-[10px] text-[#00ff41]/70 w-10 text-right shrink-0'>{Math.round(annInterval / 60)}min</span>
                    </div>

                    {/* Message list */}
                    <div className='flex flex-col gap-1 max-h-40 overflow-y-auto'>
                      {annMsgs.length === 0 && (
                        <p className='text-[10px] text-[#00ff41]/25 text-center py-3'>Aucun message</p>
                      )}
                      {annMsgs.map((msg, i) => (
                        <div key={i} className='flex items-start gap-2 px-2 py-1.5 border border-[#00ff41]/15 bg-[#00ff41]/3'>
                          <div className='flex-1 min-w-0'>
                            <p className='text-[10px] text-[#00ff41]/80 font-bold leading-snug break-words'>{msg.split('\n')[0]}</p>
                            {msg.includes('\n') && <p className='text-[9px] text-[#00ff41]/40 leading-snug break-words mt-0.5'>{msg.split('\n')[1]}</p>}
                          </div>
                          <button
                            onClick={() => setAnnMsgs(prev => prev.filter((_, j) => j !== i))}
                            className='text-[#ff4141]/50 hover:text-[#ff4141] text-[11px] shrink-0 mt-0.5'
                          >✕</button>
                        </div>
                      ))}
                    </div>

                    {/* Add message input */}
                    <div className='flex gap-1'>
                      <textarea
                        rows={2}
                        value={annInput}
                        onChange={e => setAnnInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && annInput.trim()) {
                            e.preventDefault()
                            setAnnMsgs(prev => [...prev, annInput.trim()])
                            setAnnInput('')
                          }
                        }}
                        placeholder='Titre (ligne 1)
Sous-titre (ligne 2)'
                        className='flex-1 bg-black border border-[#00ff41]/30 text-[#00ff41] text-[10px] px-2 py-1.5 outline-none focus:border-[#00ff41]/70 placeholder:text-[#00ff41]/25 resize-none'
                      />
                      <button
                        onClick={() => { if (annInput.trim()) { setAnnMsgs(prev => [...prev, annInput.trim()]); setAnnInput('') } }}
                        className='px-3 text-[11px] border border-[#00ff41]/40 text-[#00ff41]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all'
                      >+</button>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={() => saveAnnouncements(annMsgs, annInterval)}
                      className='w-full py-1.5 text-[9px] tracking-widest border border-[#00ff41]/50 text-[#00ff41]/70 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all'
                    >✓ SAUVEGARDER</button>

                    {/* Clear all */}
                    {annMsgs.length > 0 && (
                      <button
                        onClick={() => { setAnnMsgs([]); saveAnnouncements([], annInterval) }}
                        className='w-full py-1 text-[9px] tracking-widest text-[#ff4141]/40 hover:text-[#ff4141] transition-colors'
                      >⌫ VIDER TOUT</button>
                    )}
                  </div>
                )}

                {/* RESTREAM */}
                {menuSection === 'restream' && (
                  <div className='px-2 py-2 flex flex-col gap-3'>
                    <div className='text-[9px] text-[#00ff41]/35 tracking-widest px-1'>DIFFUSION MULTI-PLATEFORME</div>
                    {([
                      ['tiktok', 'TikTok', (
                        <svg viewBox='0 0 24 24' width='18' height='18'><path fill='#fff' d='M16.6 5.8a4.8 4.8 0 0 1-1-.9 4.6 4.6 0 0 1-1.1-2.7h-3.3v13.2a2.8 2.8 0 1 1-2-2.7V9.3a6.1 6.1 0 1 0 5.3 6V9a7.9 7.9 0 0 0 4.6 1.5V7.2a4.6 4.6 0 0 1-2.5-1.4z'/></svg>
                      )],
                      ['youtube', 'YouTube', (
                        <svg viewBox='0 0 24 24' width='20' height='20'><path fill='#FF0000' d='M23 7.5a3 3 0 0 0-2.1-2.1C19 5 12 5 12 5s-7 0-8.9.4A3 3 0 0 0 1 7.5 31 31 0 0 0 .6 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1C5 19 12 19 12 19s7 0 8.9-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.4 12 31 31 0 0 0 23 7.5z'/><path fill='#fff' d='M9.8 15.3V8.7l5.7 3.3z'/></svg>
                      )],
                      ['facebook', 'Facebook', (
                        <svg viewBox='0 0 24 24' width='20' height='20'><path fill='#1877F2' d='M24 12a12 12 0 1 0-13.9 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z'/></svg>
                      )],
                      ['x', 'X (Twitter)', (
                        <svg viewBox='0 0 24 24' width='17' height='17'><path fill='#fff' d='M18.9 1.2h3.7l-8 9.1L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9zM17.6 20.6h2L6.5 3.3H4.3z'/></svg>
                      )],
                      ['luxmedia', 'Lux Media', (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src='/luxmedia.jpg' alt='Lux Media' width='20' height='20' className='rounded-sm object-cover' />
                      )],
                    ] as const).map(([key, label, logo]) => (
                      <div key={key} className='border border-[#00ff41]/15 bg-[#00ff41]/3 p-2 flex flex-col gap-1.5'>
                        <div className='flex items-center gap-3'>
                          <span className='shrink-0 w-5 h-5 flex items-center justify-center'>{logo}</span>
                          <span className='flex-1 text-[11px] text-[#00ff41]/80 font-bold'>{label}</span>
                          <input
                            type='checkbox'
                            checked={restream[key]}
                            onChange={e => saveRestream(key, e.target.checked)}
                            className='w-4 h-4 accent-[#00ff41] cursor-pointer'
                          />
                        </div>
                        <input
                          value={keyForm[key]?.url ?? ''}
                          onChange={e => setKeyForm(prev => ({ ...prev, [key]: { ...prev[key], url: e.target.value } }))}
                          placeholder='Serveur RTMP (rtmp://...)'
                          className='bg-black border border-[#00ff41]/25 text-[#00ff41] text-[10px] px-2 py-1 outline-none focus:border-[#00ff41]/60 placeholder:text-[#00ff41]/25'
                        />
                        <input
                          type='password'
                          value={keyForm[key]?.key ?? ''}
                          onChange={e => setKeyForm(prev => ({ ...prev, [key]: { ...prev[key], key: e.target.value } }))}
                          placeholder={restreamKeys?.[key]?.keySet ? `Clé enregistrée (${restreamKeys?.[key]?.keyHint ?? ''}) — vide = garder` : 'Clé de stream'}
                          className='bg-black border border-[#00ff41]/25 text-[#00ff41] text-[10px] px-2 py-1 outline-none focus:border-[#00ff41]/60 placeholder:text-[#00ff41]/25'
                        />
                      </div>
                    ))}
                    <button
                      onClick={async () => { setKeysSaving(true); await saveRestreamKeys(keyForm); setKeysSaving(false) }}
                      disabled={keysSaving}
                      className='w-full py-1.5 text-[9px] tracking-widest border border-[#00ff41]/50 text-[#00ff41]/70 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all disabled:opacity-40'
                    >{keysSaving ? '…' : '✓ SAUVEGARDER LES CLÉS'}</button>
                    <p className='text-[9px] text-[#00ff41]/30 leading-relaxed px-1'>Checkbox = restream ON/OFF. Clés stockées côté serveur (jamais dans la base publique). Champ clé vide = on garde l'existante.</p>
                  </div>
                )}

                {/* SONDAGE */}
                {menuSection === 'sondage' && (
                  <div className='px-2 py-2 flex flex-col gap-3'>
                    <div className='text-[9px] text-[#00ff41]/35 tracking-widest px-1'>SONDAGE EN DIRECT</div>
                    {poll?.active ? (
                      <div className='border border-[#00ff41]/20 p-2 rounded-sm space-y-1.5'>
                        <div className='text-[10px] text-[#00ff41]/70 font-bold mb-2'>{poll.question}</div>
                        {poll.options.map((opt, i) => {
                          const total = Object.keys(poll.votes ?? {}).length
                          const count = Object.values(poll.votes ?? {}).filter(v => v === i).length
                          const pct = total > 0 ? Math.round(count / total * 100) : 0
                          return (
                            <div key={i} className='text-[10px] flex justify-between items-center gap-2'>
                              <span className='text-[#00ff41]/55 truncate'>{opt}</span>
                              <span className='text-[#00ff41]/40 shrink-0'>{pct}% ({count})</span>
                            </div>
                          )
                        })}
                        <div className='text-[9px] text-[#00ff41]/25 pt-1'>{Object.keys(poll.votes ?? {}).length} votes au total</div>
                        <button onClick={closePoll}
                          className='w-full mt-1 py-1 text-[9px] tracking-widest text-[#ff4141]/60 hover:text-[#ff4141] border border-[#ff4141]/30 transition-all'>
                          ■ FERMER LE SONDAGE
                        </button>
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        <div>
                          <label className='text-[9px] text-[#00ff41]/40 tracking-widest block mb-1'>QUESTION</label>
                          <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                            placeholder='Votre question...'
                            className='w-full bg-transparent border border-[#00ff41]/30 px-2 py-1.5 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60' />
                        </div>
                        <div>
                          <label className='text-[9px] text-[#00ff41]/40 tracking-widest block mb-1'>OPTIONS</label>
                          {pollOptions.map((opt, i) => (
                            <div key={i} className='flex gap-1 mb-1'>
                              <input value={opt} onChange={e => setPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                                placeholder={`Option ${i + 1}`}
                                className='flex-1 bg-transparent border border-[#00ff41]/30 px-2 py-1 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60' />
                              {pollOptions.length > 2 && (
                                <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                                  className='px-2 text-[#ff4141]/50 hover:text-[#ff4141] transition-colors text-[11px]'>✕</button>
                              )}
                            </div>
                          ))}
                          {pollOptions.length < 4 && (
                            <button onClick={() => setPollOptions(prev => [...prev, ''])}
                              className='w-full py-1 text-[9px] tracking-widest text-[#00ff41]/40 hover:text-[#00ff41] border border-[#00ff41]/20 hover:border-[#00ff41]/40 transition-all'>
                              + OPTION
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => { const opts = pollOptions.filter(o => o.trim()); if (!pollQuestion.trim() || opts.length < 2) return; createPoll(pollQuestion.trim(), opts); setPollQuestion(''); setPollOptions(['', '']) }}
                          className='w-full py-2 text-[10px] bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41]/80 hover:text-[#00ff41] hover:bg-[#00ff41]/20 transition-all tracking-widest'>
                          ▶ LANCER LE SONDAGE
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* PROGRAMME */}
                {menuSection === 'programme' && (
                  <div className='px-3 py-4 space-y-3'>
                    <div className='text-[9px] text-[#00ff41]/35 tracking-widest'>PROGRAMME (texte + format par ligne)</div>
                    <div className='flex flex-col gap-1.5'>
                      {scheduleLines.map((line, i) => (
                        <div key={i} className='flex items-center gap-1.5'>
                          <input value={line.text}
                            onChange={e => setScheduleLines(prev => prev.map((l, j) => j === i ? { ...l, text: e.target.value } : l))}
                            placeholder={`Ligne ${i + 1}`}
                            className='flex-1 min-w-0 bg-transparent border border-[#00ff41]/30 px-2 py-1.5 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60' />
                          <select value={line.format}
                            onChange={e => setScheduleLines(prev => prev.map((l, j) => j === i ? { ...l, format: e.target.value } : l))}
                            className='bg-black border border-[#00ff41]/30 text-[#00ff41] text-[10px] px-1 py-1.5 outline-none focus:border-[#00ff41]/60 [color-scheme:dark] shrink-0'>
                            <option value='titre'>Titre</option>
                            <option value='soustitre'>Sous-titre</option>
                            <option value='paragraphe'>Paragraphe</option>
                          </select>
                          <button onClick={() => setScheduleLines(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : [{ text: '', format: 'titre' }])}
                            className='text-[#ff4141]/50 hover:text-[#ff4141] text-[12px] px-1 shrink-0'>✕</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setScheduleLines(prev => [...prev, { text: '', format: 'paragraphe' }])}
                      className='w-full py-1.5 text-[9px] tracking-widest border border-[#00ff41]/30 text-[#00ff41]/55 hover:text-[#00ff41] hover:bg-[#00ff41]/8 transition-all'>
                      + AJOUTER UNE LIGNE
                    </button>
                    <button onClick={() => saveSchedule(scheduleLines.filter(l => l.text.trim()))}
                      className='w-full py-2 text-[10px] bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41]/80 hover:text-[#00ff41] hover:bg-[#00ff41]/20 transition-all tracking-widest'>
                      ✓ ENREGISTRER
                    </button>
                    {scheduleLines.some(l => l.text.trim()) && (
                      <button onClick={() => { saveSchedule([]); setScheduleLines([{ text: '', format: 'titre' }]) }}
                        className='w-full py-1.5 text-[9px] text-[#ff4141]/40 hover:text-[#ff4141] transition-colors tracking-widest'>
                        Retirer le programme
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Menu home */
              <div className='flex flex-col py-2 px-2'>
                {([
                  { key: 'profil', label: 'PROFIL' },
                  { key: 'notifications', label: 'NOTIFICATIONS', badge: totalNotifBadge },
                  { key: 'parametres', label: 'PARAMETRES' },
                  { key: 'historique', label: 'HISTORIQUE' },
                ] as { key: MenuSection; label: string; badge?: number }[]).map(item => (
                  <button
                    key={item.key}
                    onClick={() => setMenuSection(item.key)}
                    className='px-3 py-2.5 flex items-center justify-between text-[11px] tracking-widest text-[#00ff41]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/5 transition-all border-l-2 border-transparent hover:border-[#00ff41]/60 rounded-sm text-left'
                  >
                    <span>{item.label}</span>
                    <div className='flex items-center gap-2'>
                      {(item.badge ?? 0) > 0 && (
                        <span className='w-4 h-4 rounded-full bg-[#ff4141] text-[7px] flex items-center justify-center text-white font-bold'>
                          {item.badge}
                        </span>
                      )}
                      <span className='text-[#00ff41]/20 text-[12px]'>›</span>
                    </div>
                  </button>
                ))}

                <button
                  onClick={handleSignOut}
                  className='px-3 py-2.5 flex items-center gap-2 text-[11px] tracking-widest text-[#ff4141]/50 hover:text-[#ff4141] hover:bg-[#ff4141]/5 transition-all border-l-2 border-transparent hover:border-[#ff4141]/60 rounded-sm text-left mt-1'
                >
                  <LogOut size={12}/> LOGOFF
                </button>

                {/* Admin section */}
                {(userRole === 'admin' || ADMIN_EMAILS.includes(user?.email ?? '')) && (
                  <div className='mt-3'>
                    <div className='px-3 py-1.5 text-[9px] tracking-widest text-[#ff4141]/60 border-t border-[#ff4141]/20 mb-2 flex items-center gap-2'>
                      <span>⚙</span> ADMINISTRATION
                    </div>
                    <button
                      onClick={() => setMenuSection('source')}
                      className='w-full mb-2 py-1.5 text-[9px] border border-[#00ff41]/30 text-[#00ff41]/55 hover:bg-[#00ff41]/8 hover:text-[#00ff41] transition-all tracking-widest flex items-center justify-between px-2'
                    >
                      <span>📡 SOURCE STREAM</span>
                      <span className='text-[#00ff41]/25 text-[12px]'>›</span>
                    </button>
                    <button
                      onClick={() => setMenuSection('annonces')}
                      className='w-full mb-2 py-1.5 text-[9px] border border-[#00ff41]/30 text-[#00ff41]/55 hover:bg-[#00ff41]/8 hover:text-[#00ff41] transition-all tracking-widest flex items-center justify-between px-2'
                    >
                      <span>📢 ANNONCES / PUB</span>
                      <span className='text-[#00ff41]/25 text-[12px]'>›</span>
                    </button>
                    <button
                      onClick={() => { setMenuSection('restream'); loadRestreamKeys() }}
                      className='w-full mb-2 py-1.5 text-[9px] border border-[#00ff41]/30 text-[#00ff41]/55 hover:bg-[#00ff41]/8 hover:text-[#00ff41] transition-all tracking-widest flex items-center justify-between px-2'
                    >
                      <span>📡 RESTREAM</span>
                      <span className='text-[#00ff41]/25 text-[12px]'>›</span>
                    </button>
                    <button
                      onClick={() => setMenuSection('sondage')}
                      className='w-full mb-2 py-1.5 text-[9px] border border-[#00ff41]/30 text-[#00ff41]/55 hover:bg-[#00ff41]/8 hover:text-[#00ff41] transition-all tracking-widest flex items-center justify-between px-2'
                    >
                      <span>📊 SONDAGE</span>
                      <span className='text-[#00ff41]/25 text-[12px]'>›</span>
                    </button>
                    <button
                      onClick={() => setMenuSection('programme')}
                      className='w-full mb-2 py-1.5 text-[9px] border border-[#00ff41]/30 text-[#00ff41]/55 hover:bg-[#00ff41]/8 hover:text-[#00ff41] transition-all tracking-widest flex items-center justify-between px-2'
                    >
                      <span>🕐 PROGRAMME</span>
                      <span className='text-[#00ff41]/25 text-[12px]'>›</span>
                    </button>
                    <button
                      onClick={() => window.confirm('Effacer tout le chat ?') && resetChat()}
                      className='w-full mb-3 py-1.5 text-[9px] border border-[#ff4141]/40 text-[#ff4141]/60 hover:bg-[#ff4141]/10 hover:text-[#ff4141] transition-all tracking-widest'
                    >⌫ RESET CHAT</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── AMIS tab ── */}
        {rightTab === 'amis' && (
          <div className='flex flex-col py-2 overflow-y-auto flex-1 px-2 space-y-3'>
            {incomingFriendReqs.length > 0 && (
              <div>
                <div className='text-[9px] text-[#ff4141]/70 tracking-widest mb-2 px-1'>DEMANDES REÇUES</div>
                {incomingFriendReqs.map(req => (
                  <div key={req.id} className='px-2 py-2 border border-[#00ff41]/15 rounded-sm mb-1.5'>
                    <div className='text-[11px] text-[#00ff41]/80 mb-2 font-bold'>{req.fromName}</div>
                    <div className='flex gap-1.5'>
                      <button onClick={() => acceptFriendReq(req)} className='flex-1 py-1 text-[9px] border border-[#00ff41]/40 text-[#00ff41]/70 hover:bg-[#00ff41]/10 hover:text-[#00ff41] transition-all rounded-sm tracking-widest'>✓ ACCEPTER</button>
                      <button onClick={() => declineFriendReq(req.id)} className='flex-1 py-1 text-[9px] border border-[#ff4141]/30 text-[#ff4141]/50 hover:bg-[#ff4141]/10 hover:text-[#ff4141] transition-all rounded-sm tracking-widest'>✗ REFUSER</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <div className='text-[9px] text-[#00ff41]/40 tracking-widest mb-2 px-1'>
                AMIS ({friends.length})
              </div>
              {friends.length === 0 ? (
                <p className='text-[10px] text-[#00ff41]/25 px-2 py-1 leading-relaxed'>
                  Clique sur un pseudo dans le chat pour ajouter des amis
                </p>
              ) : (
                friends.map(f => (
                  <div key={f.uid} className='px-3 py-2 flex items-center gap-2 text-[11px] text-[#00ff41]/60 hover:text-[#00ff41] transition-colors cursor-pointer'>
                    <span className='w-1.5 h-1.5 rounded-full bg-[#00ff41]/50 shrink-0' />
                    {f.name}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── CREW tab ── */}
        {rightTab === 'crew' && (
          <div className='flex flex-col py-2 overflow-y-auto flex-1 px-2'>
            {myCrew ? (
              <div>
                <div className='text-center py-3 mb-2 border-b border-[#00ff41]/15'>
                  <div className='text-xl font-bold text-[#00ff41] tracking-widest'>[{myCrew.tag}]</div>
                  <div className='text-[12px] text-[#00ff41]/70 mt-0.5'>{myCrew.name}</div>
                  <div className='text-[9px] text-[#00ff41]/30 mt-0.5'>Chef : {myCrew.leaderName}</div>
                </div>
                <div className='text-[9px] text-[#00ff41]/40 tracking-widest mb-2 px-1'>
                  MEMBRES ({myCrew.members.length})
                </div>
                {myCrew.members.map(m => (
                  <div key={m.uid} className='px-2 py-1.5 flex items-center gap-2 text-[11px] text-[#00ff41]/60'>
                    {m.uid === myCrew.leaderId && <span className='text-[#ffd700] text-[10px]'>♛</span>}
                    <span>{m.name}</span>
                  </div>
                ))}
                {myCrew.leaderId === user?.uid && myCrew.pending?.length > 0 && (
                  <div className='mt-3'>
                    <div className='text-[9px] text-[#ffd700]/70 tracking-widest mb-2 px-1 border-t border-[#ffd700]/20 pt-2'>
                      DEMANDES ({myCrew.pending.length})
                    </div>
                    {myCrew.pending.map(m => (
                      <div key={m.uid} className='px-2 py-2 border border-[#00ff41]/15 rounded-sm mb-1.5'>
                        <div className='text-[11px] text-[#00ff41]/80 mb-1.5 font-bold'>{m.name}</div>
                        <button
                          onClick={() => acceptCrewMember(m)}
                          className='w-full py-1 text-[9px] border border-[#00ff41]/40 text-[#00ff41]/70 hover:bg-[#00ff41]/10 hover:text-[#00ff41] transition-all tracking-widest rounded-sm'
                        >✓ ACCEPTER</button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={leaveCrew}
                  className='mt-4 w-full py-1.5 text-[9px] border border-[#ff4141]/30 text-[#ff4141]/50 hover:bg-[#ff4141]/10 hover:text-[#ff4141] transition-all tracking-widest'
                >QUITTER LE CREW</button>
              </div>
            ) : showCrewCreate ? (
              <div className='space-y-2 px-1'>
                <div className='text-[9px] text-[#00ff41]/40 tracking-widest mb-3'>CRÉER UN CREW</div>
                <input
                  value={crewNameInput}
                  onChange={e => setCrewNameInput(e.target.value)}
                  placeholder='Nom du crew'
                  className='w-full bg-transparent border border-[#00ff41]/30 px-2 py-1.5 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60'
                />
                <input
                  value={crewTagInput}
                  onChange={e => setCrewTagInput(e.target.value.slice(0, 4))}
                  placeholder='TAG (4 car. max)'
                  className='w-full bg-transparent border border-[#00ff41]/30 px-2 py-1.5 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60'
                />
                <button
                  onClick={createCrew}
                  className='w-full py-2 text-[10px] bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41]/80 hover:text-[#00ff41] hover:bg-[#00ff41]/20 transition-all tracking-widest mt-1'
                >CRÉER</button>
                <button
                  onClick={() => setShowCrewCreate(false)}
                  className='w-full text-[10px] text-[#00ff41]/25 hover:text-[#00ff41]/50 py-1 transition-colors'
                >Annuler</button>
              </div>
            ) : (
              <div className='px-1'>
                <div className='text-[10px] text-[#00ff41]/30 py-2 mb-2'>Tu n&apos;as pas de crew</div>
                <button
                  onClick={() => setShowCrewCreate(true)}
                  className='w-full py-2 text-[10px] border border-[#00ff41]/40 text-[#00ff41]/70 hover:bg-[#00ff41]/10 hover:text-[#00ff41] transition-all tracking-widest mb-4'
                >+ CRÉER UN CREW</button>
                <div className='text-[9px] text-[#00ff41]/40 tracking-widest mb-2'>CREWS PUBLICS</div>
                {publicCrews.length === 0 ? (
                  <p className='text-[10px] text-[#00ff41]/20'>Aucun crew pour l&apos;instant</p>
                ) : (
                  publicCrews.map(c => (
                    <div key={c.id} className='px-2 py-2 border border-[#00ff41]/15 rounded-sm mb-1.5'>
                      <div className='flex items-center justify-between mb-0.5'>
                        <span className='text-[11px] text-[#00ff41]/80 font-bold'>[{c.tag}] {c.name}</span>
                        <span className='text-[9px] text-[#00ff41]/30'>{c.memberCount}</span>
                      </div>
                      <div className='text-[9px] text-[#00ff41]/35 mb-1.5'>Chef : {c.leaderName}</div>
                      <button
                        onClick={() => requestJoinCrew(c.id)}
                        className='w-full py-0.5 text-[9px] border border-[#00ff41]/25 text-[#00ff41]/50 hover:bg-[#00ff41]/10 hover:text-[#00ff41] transition-all rounded-sm tracking-widest'
                      >DEMANDER À REJOINDRE</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
