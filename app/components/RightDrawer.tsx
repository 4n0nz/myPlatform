'use client'
import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { ICONS, COLORS } from '../constants'
import type {
  FirebaseUser, UserRole, Message, FriendReq, Friend,
  Crew, CrewMember, PublicCrew, AdminUser,
} from '../types'

type MenuSection = 'profil' | 'notifications' | 'parametres' | 'historique' | 'source'
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
  broadcasting: boolean
  startBroadcast: () => void
  stopBroadcast: () => void
  pipEnabled: boolean
  togglePip: (on: boolean) => void
}

export default function RightDrawer({
  open, onClose, rightTab, setRightTab, menuSection, setMenuSection,
  user, userRole, userIcon, userColor, saveIcon, saveColor,
  editingName, setEditingName, newDisplayName, setNewDisplayName, saveName, userCreatedAt,
  showTimestamps, setShowTimestamps, handleSignOut,
  messages, incomingFriendReqs, friends, myCrew, publicCrews, crewBadge,
  adminUsers, resetChat, changeRole,
  acceptFriendReq, declineFriendReq,
  showCrewCreate, setShowCrewCreate, crewNameInput, setCrewNameInput,
  crewTagInput, setCrewTagInput, createCrew, requestJoinCrew, acceptCrewMember, leaveCrew,
  streamUrl, streamTitle, streamType, saveStreamSource,
  broadcasting, startBroadcast, stopBroadcast,
  pipEnabled, togglePip,
}: Props) {
  const [sourceUrlInput, setSourceUrlInput] = useState(streamUrl)
  const [sourceTitleInput, setSourceTitleInput] = useState(streamTitle)
  const [sourceType, setSourceType] = useState<'youtube' | 'camera'>(streamType)
  const isAdmin = userRole === 'admin' || user?.email === 'mikeclaudo@gmail.com'

  useEffect(() => { setSourceUrlInput(streamUrl) }, [streamUrl])
  useEffect(() => { setSourceTitleInput(streamTitle) }, [streamTitle])
  useEffect(() => { setSourceType(streamType) }, [streamType])
  const totalNotifBadge = incomingFriendReqs.length + (crewBadge ? (myCrew?.pending.length ?? 0) : 0)

  return (
    <div
      className='fixed lg:absolute top-[62px] lg:top-0 bottom-0 right-0 flex flex-col bg-black border-l border-[#00ff41]/40 transition-all duration-300 overflow-hidden z-40'
      style={{ width: open ? '100%' : '0px', boxShadow: open ? '-4px 0 20px rgba(0,255,65,0.1)' : 'none' }}
    >
      <div className='w-full lg:w-80 lg:min-w-[320px] flex flex-col h-full overflow-hidden'>

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
          <button
            onClick={onClose}
            className='absolute top-1.5 right-1.5 text-[#00ff41]/30 hover:text-[#00ff41] transition-colors text-xs'
          >✕</button>
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
                  <div className='px-2 py-2'>
                    {incomingFriendReqs.length === 0 && !crewBadge ? (
                      <p className='text-[10px] text-[#00ff41]/25 px-2 py-6 text-center'>Aucune notification</p>
                    ) : (
                      <div className='space-y-3'>
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
                      </div>
                    )}
                  </div>
                )}

                {/* PARAMETRES */}
                {menuSection === 'parametres' && (
                  <div className='px-3 py-4 space-y-5'>
                    <div>
                      <div className='text-[9px] text-[#00ff41]/35 tracking-widest mb-3'>AFFICHAGE</div>
                      <div className='flex items-center justify-between'>
                        <span className='text-[11px] text-[#00ff41]/65'>Timestamps chat</span>
                        <div
                          onClick={() => { const v = !showTimestamps; setShowTimestamps(v); localStorage.setItem('ips_timestamps', String(v)) }}
                          className='w-9 h-5 rounded-full transition-all cursor-pointer relative shrink-0'
                          style={{ background: showTimestamps ? '#00ff41' : 'rgba(0,255,65,0.12)', border: '1px solid rgba(0,255,65,0.35)' }}
                        >
                          <div className='absolute top-0.5 w-3.5 h-3.5 rounded-full bg-black transition-all duration-200' style={{ left: showTimestamps ? '19px' : '2px' }} />
                        </div>
                      </div>
                    </div>
                    <div>
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

                    {sourceType === 'youtube' && (
                      <div className='border border-[#00ff41]/15 p-2 rounded-sm space-y-2'>
                        <p className='text-[10px] text-[#00ff41]/55 leading-relaxed'>
                          PiP : superpose ta camera en vignette sur la video. Glisse-la sur le lecteur pour la positionner.
                        </p>
                        <button
                          onClick={() => togglePip(!pipEnabled)}
                          className={`w-full py-2 text-[10px] tracking-widest transition-all border ${pipEnabled ? 'bg-[#ff4141]/15 border-[#ff4141]/50 text-[#ff4141] hover:bg-[#ff4141]/25' : 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]/80 hover:bg-[#00ff41]/20'}`}
                        >{pipEnabled ? '■ RETIRER LE PIP' : '+ AJOUTER PIP (CAMERA)'}</button>
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

                    <button
                      onClick={() => { saveStreamSource('', '', 'youtube'); setSourceUrlInput(''); setSourceTitleInput(''); setSourceType('youtube') }}
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

                {/* Admin section */}
                {(userRole === 'admin' || user?.email === 'mikeclaudo@gmail.com') && (
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
                      onClick={() => window.confirm('Effacer tout le chat ?') && resetChat()}
                      className='w-full mb-3 py-1.5 text-[9px] border border-[#ff4141]/40 text-[#ff4141]/60 hover:bg-[#ff4141]/10 hover:text-[#ff4141] transition-all tracking-widest'
                    >⌫ RESET CHAT</button>
                    <div className='space-y-1'>
                      {adminUsers.filter(u => u.email !== 'mikeclaudo@gmail.com').map(u => (
                        <div key={u.uid} className='px-2 py-2 bg-[#00ff41]/3 border border-[#00ff41]/10 rounded-sm'>
                          <div className='flex items-center justify-between gap-1 mb-1.5'>
                            <span className='text-[10px] text-[#00ff41]/70 truncate'>{u.displayName}</span>
                            <span style={{
                              fontSize:'8px', padding:'1px 4px', borderRadius:'2px', fontWeight:700,
                              background: u.role === 'vip' ? 'rgba(255,215,0,0.15)' : u.role === 'modo' ? 'rgba(0,191,255,0.15)' : 'rgba(0,255,65,0.1)',
                              color: u.role === 'vip' ? '#ffd700' : u.role === 'modo' ? '#00bfff' : '#00ff41',
                            }}>{u.role.toUpperCase()}</span>
                          </div>
                          <div className='flex gap-1'>
                            {(['user', 'vip', 'modo'] as const).map(r => (
                              <button key={r} onClick={() => changeRole(u.uid, r)}
                                className='flex-1 py-0.5 text-[8px] tracking-widest transition-all'
                                style={{
                                  border: '1px solid', borderRadius: '2px',
                                  borderColor: u.role === r ? (r === 'vip' ? '#ffd700' : r === 'modo' ? '#00bfff' : '#00ff41') : 'rgba(0,255,65,0.2)',
                                  color: u.role === r ? (r === 'vip' ? '#ffd700' : r === 'modo' ? '#00bfff' : '#00ff41') : 'rgba(0,255,65,0.35)',
                                  background: u.role === r ? 'rgba(0,255,65,0.08)' : 'transparent',
                                }}
                              >{r.toUpperCase()}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {adminUsers.length === 0 && (
                        <p className='text-[10px] text-[#00ff41]/30 px-3 py-2'>Aucun utilisateur</p>
                      )}
                    </div>
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
