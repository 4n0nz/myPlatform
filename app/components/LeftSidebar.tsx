'use client'

type Props = {
  open: boolean
  onClose: () => void
  onToggle: () => void
}

export default function LeftSidebar({ open, onClose, onToggle }: Props) {
  return (
    <div className='relative w-0 flex flex-col shrink-0 overflow-visible'>
      <div
        className='fixed top-[62px] bottom-0 left-0 flex flex-col bg-black border-r border-[#00ff41]/40 transition-all duration-300 overflow-hidden z-40'
        style={{ width: open ? '220px' : '0px', boxShadow: open ? '4px 0 20px rgba(0,255,65,0.1)' : 'none' }}
      >
        <div style={{ width: '220px', minWidth: '220px' }} className='flex flex-col h-full overflow-hidden'>
          <div className='border-b border-[#00ff41]/30 px-3 py-1.5 text-[10px] tracking-widest text-[#00ff41]/60 shrink-0 flex items-center justify-between'>
            <span>CATEGORIES</span>
            <button onClick={onClose} className='text-[#00ff41]/40 hover:text-[#00ff41] transition-colors text-xs'>✕</button>
          </div>
          <div className='flex flex-col py-2 overflow-y-auto flex-1'>
            {['TECH', 'SOCIETE', 'ECONOMIE', 'POLITIQUE', 'SCIENCE', 'CULTURE'].map((topic) => (
              <div
                key={topic}
                className='px-4 py-2.5 flex items-center gap-3 text-[11px] tracking-widest text-[#00ff41]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/5 cursor-pointer transition-all border-l-2 border-transparent hover:border-[#00ff41]/60'
              >
                {topic}
              </div>
            ))}
          </div>
          <div className='border-t border-[#00ff41]/20 px-3 py-2 shrink-0'>
            <div className='text-[10px] text-[#00ff41]/30 tracking-widest mb-2'>STREAMS ACTIFS</div>
            {['@4n0nz', '@node_91', '@libre_tv'].map((s) => (
              <div key={s} className='flex items-center gap-2 py-1.5 text-[11px] text-[#00ff41]/50 hover:text-[#00ff41] cursor-pointer transition-colors'>
                <span className='w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse shrink-0' />
                {s}
              </div>
            ))}
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
