'use client'
import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { ICONS, COLORS, ADMIN_EMAILS } from '../constants'
import type {
  FirebaseUser, UserRole, Message, FriendReq, Friend,
  Crew, CrewMember, PublicCrew, AdminUser, Poll, Schedule, AppNotification,
} from '../types'

type MenuSection = 'profil' | 'notifications' | 'parametres' | 'historique' | 'source' | 'annonces' | 'sondage' | 'programme' | 'pip'
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
  streamType: 'youtube' | 'camera'
  saveStreamSource: (url: string, title: string, type: 'youtube' | 'camera') => void
  broadcastNotify: (title: string, body: string) => void
  broadcasting: boolean
  startBroadcast: () => void
  stopBroadcast: () => void
  pipEnabled: boolean
  togglePip: (on: boolean) => void
  announcements: { messages: string[]; interval: number } | null
  saveAnnouncements: (messages: string[], interval: number) => void
  poll: Poll | null
  createPoll: (question: string, options: string[]) => void
  closePoll: () => void
  schedule: Schedule | null
  saveSchedule: (date: string, title: string) => void
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
  streamUrl, streamTitle, streamType, saveStreamSource, broadcastNotify,
  broadcasting, startBroadcast, stopBroadcast,
  pipEnabled, togglePip,
  announcements, saveAnnouncements,
  poll, createPoll, closePoll,
  schedule, saveSchedule,
  muteChatUser, unmuteUser, banChatUser, unbanUser,
}: Props) {
  const [sourceUrlInput, setSourceUrlInput] = useState(streamUrl)
  const [annMsgs, setAnnMsgs] = useState<string[]>(announcements?.messages ?? [])
  const [annInterval, setAnnInterval] = useState(announcements?.interval ?? 300)
  const [annInput, setAnnInput] = useState('')
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTitle, setScheduleTitle] = useState('')
  // Sync local state when Firestore data arrives
  useEffect(() => {
    setAnnMsgs(announcements?.messages ?? [])
    setAnnInterval(announcements?.interval ?? 5)
  }, [announcements])
  const [sourceTitleInput, setSourceTitleInput] = useState(streamTitle)
  const [sourceType, setSourceType] = useState<'youtube' | 'camera'>(streamType)
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
  useEffect(() => { setSourceTitleInput(streamTitle) }, [streamTitle])
  useEffect(() => { setSourceType(streamType) }, [streamType])
  useEffect(() => {
    if (schedule?.date) setScheduleDate(schedule.date)
    if (schedule?.title !== undefined) setScheduleTitle(schedule.title)
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
                          onClick={() => setSourceType('youtube')}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 border text-[11px] tracking-wide transition-all ${sourceType === 'youtube' ? 'border-[#00ff41]/60 text-[#00ff41] bg-[#00ff41]/10' : 'border-[#00ff41]/20 text-[#00ff41]/50 hover:border-[#00ff41]/40'}`}
                        >
                          <span className='text-[12px] leading-none'>{sourceType === 'youtube' ? '●' : '○'}</span>
                          YouTube / URL
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setSourceType('camera')}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 border text-[11px] tracking-wide transition-all ${sourceType === 'camera' ? 'border-[#00ff41]/60 text-[#00ff41] bg-[#00ff41]/10' : 'border-[#00ff41]/20 text-[#00ff41]/50 hover:border-[#00ff41]/40'}`}
                          >
                            <span className='text-[12px] leading-none'>{sourceType === 'camera' ? '●' : '○'}</span>
                            Camera de l&apos;appareil
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className='text-[9px] text-[#00ff41]/40 tracking-widest block mb-1.5'>TITRE</label>
                      <input
                        value={sourceTitleInput}
                        onChange={e => setSourceTitleInput(e.target.value)}
                        placeholder='Intelligence Artificielle : Menace ou Opportunite ?'
                        className='w-full bg-transparent border border-[#00ff41]/30 px-2 py-1.5 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60'
                      />
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
                      </div>
                    )}


                    {sourceType === 'camera' && (
                      <div className='space-y-2'>
                        <div className='border border-[#00ff41]/15 p-2 rounded-sm'>
                          <p className='text-[10px] text-[#00ff41]/55 leading-relaxed'>
                            Diffuse la camera de cet appareil vers tous les viewers via le serveur media. Applique d&apos;abord, puis demarre.
                          </p>
                          <p className='text-[9px] text-[#00ff41]/35 mt-1.5 tracking-widest'>
                            ETAT : {broadcasting ? '🔴 EN DIRECT' : '○ HORS LIGNE'}
                          </p>
                        </div>
                        {!broadcasting ? (
                          <button
                            onClick={startBroadcast}
                            className='w-full py-2 text-[10px] bg-[#ff4141]/15 border border-[#ff4141]/50 text-[#ff4141] hover:bg-[#ff4141]/25 transition-all tracking-widest'
                          >● DEMARRER LA DIFFUSION</button>
                        ) : (
                          <button
                            onClick={stopBroadcast}
                            className='w-full py-2 text-[10px] bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41]/80 hover:bg-[#00ff41]/20 transition-all tracking-widest'
                          >■ ARRETER LA DIFFUSION</button>
                        )}
                      </div>
                    )}

                    {streamUrl && (
                      <div className='border border-[#00ff41]/15 p-2 rounded-sm'>
                        <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-1'>ACTUEL</div>
                        <div className='text-[10px] text-[#00ff41]/55 break-all leading-relaxed'>{streamUrl}</div>
                      </div>
                    )}

                    <button
                      onClick={() => saveStreamSource(sourceType === 'camera' ? '' : sourceUrlInput.trim(), sourceTitleInput.trim(), sourceType)}
                      className='w-full py-2 text-[10px] bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41]/80 hover:text-[#00ff41] hover:bg-[#00ff41]/20 transition-all tracking-widest'
                    >✓ APPLIQUER</button>

                    {streamUrl && (
                      <button
                        onClick={() => broadcastNotify('🔴 RoshDynamics est EN DIRECT', sourceTitleInput.trim() || streamTitle || 'Le stream vient de démarrer')}
                        className='w-full py-2 text-[10px] border border-[#00ff41]/25 text-[#00ff41]/50 hover:text-[#00ff41]/80 hover:bg-[#00ff41]/5 transition-all tracking-widest'
                      >🔔 NOTIFIER LES MEMBRES</button>
                    )}

                    <button
                      onClick={() => { saveStreamSource('', '', 'youtube'); setSourceUrlInput(''); setSourceTitleInput(''); setSourceType('youtube') }}
                      className='w-full py-1.5 text-[9px] text-[#ff4141]/40 hover:text-[#ff4141] transition-colors tracking-widest'
                    >Retirer la source</button>
                  </div>
                )}

                {/* PIP */}
                {menuSection === 'pip' && (
                  <div className='px-3 py-4 space-y-4'>
                    <div className='text-[9px] text-[#00ff41]/35 tracking-widest'>PIP — CAMERA EN VIGNETTE</div>
                    <div className='border border-[#00ff41]/15 p-2 rounded-sm space-y-2'>
                      <p className='text-[10px] text-[#00ff41]/55 leading-relaxed'>
                        Superpose ta camera en vignette sur la video. Glisse-la sur le lecteur pour la positionner.
                      </p>
                      <button
                        onClick={() => togglePip(!pipEnabled)}
                        className={`w-full py-2 text-[10px] tracking-widest transition-all border ${pipEnabled ? 'bg-[#ff4141]/15 border-[#ff4141]/50 text-[#ff4141] hover:bg-[#ff4141]/25' : 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]/80 hover:bg-[#00ff41]/20'}`}
                      >{pipEnabled ? '■ RETIRER LE PIP' : '+ AJOUTER PIP (CAMERA)'}</button>
                    </div>
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
                  <div className='px-3 py-4 space-y-4'>
                    <div className='text-[9px] text-[#00ff41]/35 tracking-widest'>PROCHAINE SESSION</div>
                    <div>
                      <label className='text-[9px] text-[#00ff41]/40 tracking-widest block mb-1.5'>DATE ET HEURE</label>
                      <input type='datetime-local' value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                        className='w-full bg-transparent border border-[#00ff41]/30 px-2 py-1.5 text-[11px] text-[#00ff41] outline-none focus:border-[#00ff41]/60 [color-scheme:dark]' />
                    </div>
                    <div>
                      <label className='text-[9px] text-[#00ff41]/40 tracking-widest block mb-1.5'>TITRE (optionnel)</label>
                      <input value={scheduleTitle} onChange={e => setScheduleTitle(e.target.value)}
                        placeholder='Sujet de la session...'
                        className='w-full bg-transparent border border-[#00ff41]/30 px-2 py-1.5 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60' />
                    </div>
                    <button onClick={() => saveSchedule(scheduleDate, scheduleTitle)}
                      className='w-full py-2 text-[10px] bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41]/80 hover:text-[#00ff41] hover:bg-[#00ff41]/20 transition-all tracking-widest'>
                      ✓ ENREGISTRER
                    </button>
                    {scheduleDate && (
                      <button onClick={() => { saveSchedule('', ''); setScheduleDate(''); setScheduleTitle('') }}
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
                      onClick={() => setMenuSection('pip')}
                      className='w-full mb-2 py-1.5 text-[9px] border border-[#00ff41]/30 text-[#00ff41]/55 hover:bg-[#00ff41]/8 hover:text-[#00ff41] transition-all tracking-widest flex items-center justify-between px-2'
                    >
                      <span>🎥 PIP</span>
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
