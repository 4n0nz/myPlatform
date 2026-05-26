'use client'
import { RefObject } from 'react'
import type { FirebaseUser, Message, Friend, FriendReq } from '../types'

type UserPopup = { uid: string; name: string }

type Props = {
  messages: Message[]
  chatInput: string
  setChatInput: (v: string) => void
  sendMessage: () => void
  chatFullscreen: boolean
  setChatFullscreen: (fn: (v: boolean) => boolean) => void
  chatEndRef: RefObject<HTMLDivElement | null>
  user: FirebaseUser | null
  userPopup: UserPopup | null
  setUserPopup: (v: UserPopup | null) => void
  friends: Friend[]
  sentReqUids: string[]
  sendFriendRequest: (toUid: string, toName: string) => void
  onAuthRequired: () => void
}

export default function ChatPanel({
  messages, chatInput, setChatInput, sendMessage,
  chatFullscreen, setChatFullscreen, chatEndRef,
  user, userPopup, setUserPopup,
  friends, sentReqUids, sendFriendRequest,
  onAuthRequired,
}: Props) {
  return (
    <div
      className='flex flex-col overflow-hidden relative p-3 gap-3'
      style={chatFullscreen
        ? { position: 'fixed', inset: 0, zIndex: 200, background: '#000' }
        : { flex: '1 1 0' }
      }
    >
      {/* Chat box: header + messages */}
      <div className='flex flex-col flex-1 border border-[#00ff41]/30 overflow-hidden'>
      {/* Header */}
      <div className='border-b border-[#00ff41]/30 px-3 py-1.5 text-[10px] tracking-widest text-[#00ff41]/60 shrink-0 flex items-center justify-between'>
        <span>CHAT EN DIRECT</span>
        <button
          onClick={() => setChatFullscreen(f => !f)}
          title={chatFullscreen ? 'Réduire' : 'Plein écran'}
          className='text-[#00ff41]/35 hover:text-[#00ff41] transition-colors leading-none'
          style={{ fontSize: '12px' }}
        >{chatFullscreen ? '⊠' : '⤢'}</button>
      </div>

      {/* Messages */}
      <div className='flex-1 p-2 space-y-1.5 overflow-y-auto'>
        {messages.map((m) => (
          <div key={m.id} className='text-[11px] flex items-start gap-1.5'>
            <span
              className='shrink-0 leading-tight mt-px'
              style={{
                fontSize: m.icon ? '13px' : '11px',
                color: m.icon ? undefined : (m.color ?? '#00ff41'),
                fontWeight: m.icon ? undefined : 700,
                minWidth: '13px',
                display: 'inline-block',
                textAlign: 'center',
              }}
            >
              {m.icon || (m.user[0] ?? '?').toUpperCase()}
            </span>
            <span>
              {m.uid && m.uid !== user?.uid ? (
                <button
                  onClick={() => setUserPopup({ uid: m.uid!, name: m.user })}
                  className='text-[#00ff41]/80 font-bold hover:text-[#00ff41] hover:underline cursor-pointer'
                >{m.user}:</button>
              ) : (
                <span className='text-[#00ff41]/80 font-bold'>{m.user}:</span>
              )}
              {' '}<span className='text-[#00ff41]/50'>{m.msg}</span>
            </span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      </div>

      {/* User popup */}
      {userPopup && (
        <div
          className='absolute inset-0 bg-black/70 z-50 flex items-center justify-center'
          onClick={() => setUserPopup(null)}
        >
          <div
            className='bg-black border border-[#00ff41]/40 p-4 rounded-sm w-[180px]'
            onClick={e => e.stopPropagation()}
          >
            <div className='text-[12px] text-[#00ff41] font-bold mb-3 tracking-widest'>{userPopup.name}</div>
            {friends.some(f => f.uid === userPopup.uid) ? (
              <div className='text-[10px] text-[#00ff41]/40 tracking-widest'>✓ AMI</div>
            ) : sentReqUids.includes(userPopup.uid) ? (
              <div className='text-[10px] text-[#00ff41]/40 tracking-widest'>Demande envoyée...</div>
            ) : (
              <button
                onClick={() => sendFriendRequest(userPopup.uid, userPopup.name)}
                className='w-full py-1.5 text-[10px] border border-[#00ff41]/40 text-[#00ff41]/70 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all tracking-widest'
              >+ AJOUTER EN AMI</button>
            )}
            <button
              onClick={() => setUserPopup(null)}
              className='w-full mt-2 text-[10px] text-[#00ff41]/25 hover:text-[#00ff41]/50 transition-colors'
            >Fermer</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className='border border-[#00ff41]/30 p-1.5 flex gap-1.5 items-stretch shrink-0 h-[65px]'>
        <textarea
          className='flex-1 h-full bg-transparent border border-[#00ff41]/30 px-2 py-1 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60 resize-none leading-relaxed'
          placeholder='ecrire un message...'
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          onFocus={() => { if (!user) onAuthRequired() }}
        />
        <button
          onClick={sendMessage}
          className='px-3 bg-[#00ff41]/10 border border-[#00ff41]/30 text-xs hover:bg-[#00ff41]/20 transition-all flex items-center justify-center'
        >&#9654;</button>
      </div>
    </div>
  )
}
