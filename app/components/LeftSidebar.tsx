'use client'
import type { User as FirebaseUser } from 'firebase/auth'

type Props = {
  open: boolean
  onClose: () => void
  onToggle: () => void
  user: FirebaseUser | null
  isHost: boolean
  streamTitle: string
  onAuthRequired: () => void
  viewerPipActive: boolean
  onJoinLive: () => void
  onLeaveLive: () => void
}

export default function LeftSidebar({ open, onClose, onToggle, user, isHost, streamTitle, onAuthRequired, viewerPipActive, onJoinLive, onLeaveLive }: Props) {
  return (
    <div className='relative w-0 flex flex-col shrink-0 overflow-visible'>
      <div
        className='fixed top-[62px] bottom-0 left-0 flex flex-col bg-black border-r border-[#00ff41]/40 transition-all duration-300 overflow-hidden z-40'
        style={{ width: open ? '220px' : '0px', boxShadow: open ? '4px 0 20px rgba(0,255,65,0.1)' : 'none' }}
      >
        <div style={{ width: '220px', minWidth: '220px' }} className='flex flex-col h-full overflow-hidden'>
          <div className='border-b border-[#00ff41]/30 px-3 py-1.5 text-[10px] tracking-widest text-[#00ff41]/60 shrink-0 flex items-center justify-between'>
            <span>LIVE</span>
            <button onClick={onClose} className='text-[#00ff41]/40 hover:text-[#00ff41] transition-colors text-xs'>✕</button>
          </div>

          <div className='flex flex-col flex-1 overflow-y-auto px-3 py-4 gap-4'>
            {!isHost && (
              <>
                {/* Live status */}
                <div className='flex flex-col gap-2 p-3 border border-[#00ff41]/20 bg-[#00ff41]/3'>
                  <div className='flex items-center gap-2'>
                    <span className='w-2 h-2 rounded-full bg-[#ff4141] animate-pulse shrink-0' />
                    <span className='text-[10px] tracking-widest text-[#ff4141]/80'>EN DIRECT</span>
                  </div>
                  <p className='text-[11px] text-[#00ff41]/70 leading-relaxed'>
                    {streamTitle || 'RoshDynamics Live'}
                  </p>
                </div>

                {/* Join / Leave CTA */}
                {!user ? (
                  <div className='flex flex-col gap-2'>
                    <p className='text-[10px] text-[#00ff41]/40 tracking-wide leading-relaxed'>
                      Connecte-toi pour participer au live, chatter et interagir.
                    </p>
                    <button
                      onClick={() => { onAuthRequired(); onClose() }}
                      className='w-full py-2.5 text-[10px] tracking-widest border border-[#00ff41]/60 text-[#00ff41] bg-[#00ff41]/8 hover:bg-[#00ff41]/15 transition-all'
                    >
                      ▶ JOINDRE LE LIVE
                    </button>
                  </div>
                ) : !viewerPipActive ? (
                  <div className='flex flex-col gap-2'>
                    <p className='text-[10px] text-[#00ff41]/40 tracking-wide leading-relaxed'>
                      Active ta caméra pour apparaître dans le live.
                    </p>
                    <button
                      onClick={() => { onJoinLive(); onClose() }}
                      className='w-full py-2.5 text-[10px] tracking-widest border border-[#00ff41]/60 text-[#00ff41] bg-[#00ff41]/8 hover:bg-[#00ff41]/15 transition-all'
                    >
                      ▶ JOINDRE LE LIVE
                    </button>
                  </div>
                ) : (
                  <div className='flex flex-col gap-2'>
                    <div className='flex items-center gap-2 py-2 px-3 border border-[#00ff41]/30 bg-[#00ff41]/5'>
                      <span className='w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse shrink-0' />
                      <span className='text-[10px] tracking-widest text-[#00ff41]/80'>CAMÉRA ACTIVE</span>
                    </div>
                    <button
                      onClick={() => { onLeaveLive(); onClose() }}
                      className='w-full py-2.5 text-[10px] tracking-widest border border-[#ff4141]/40 text-[#ff4141]/70 hover:text-[#ff4141] hover:bg-[#ff4141]/8 transition-all'
                    >
                      ✕ QUITTER LE LIVE
                    </button>
                  </div>
                )}
              </>
            )}

            {isHost && (
              <div className='flex flex-col gap-2 p-3 border border-[#ff4141]/20 bg-[#ff4141]/3'>
                <div className='flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-[#ff4141] animate-pulse shrink-0' />
                  <span className='text-[10px] tracking-widest text-[#ff4141]/80'>MODE ADMIN</span>
                </div>
                <p className='text-[10px] text-[#00ff41]/40 leading-relaxed'>
                  Tu contrôles le live. Les viewers suivent ta lecture.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        className='fixed top-1/2 -translate-y-1/2 left-0 z-50 w-6 h-10 flex items-center justify-center bg-black border border-[#00ff41]/30 text-[#00ff41]/50 hover:text-[#00ff41] hover:border-[#00ff41]/70 transition-all'
        style={{ fontSize: '9px', borderRadius: '3px 0 0 3px' }}
      >
        {open ? '◀' : '▶'}
      </button>
    </div>
  )
}
