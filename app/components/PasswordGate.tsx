'use client'
import { useState } from 'react'
import { DEV_PASSWORD } from '../constants'

export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const attempt = () => {
    if (input === DEV_PASSWORD) {
      sessionStorage.setItem('dev_unlocked', '1')
      window.location.reload()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setInput('')
    }
  }

  return (
    <div className='fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center font-mono'>
      <div className='w-full h-[2px] bg-[#00ff41] absolute top-0' />
      <div className='w-full h-[2px] bg-[#00ff41] absolute bottom-0' />
      <p className='text-lg font-bold tracking-[0.3em] mb-1'>RoshDynamics</p>
      <p className='text-[10px] text-[#00ff41]/30 tracking-widest mb-8'>ACCES RESTREINT — DEVELOPPEMENT</p>
      <div
        className='flex flex-col items-center gap-3 w-full max-w-[280px]'
        style={{ animation: shake ? 'shake 0.4s ease' : 'none' }}
      >
        <input
          autoFocus
          type='password'
          value={input}
          onChange={e => { setInput(e.target.value); setError(false) }}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder='mot de passe'
          className='w-full bg-transparent border border-[#00ff41]/30 px-4 py-2.5 text-[13px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/70 text-center tracking-widest'
          style={{ borderColor: error ? 'rgba(255,50,50,0.6)' : undefined }}
        />
        {error && <p className='text-[10px] text-red-400/70 tracking-widest'>mot de passe incorrect</p>}
        <button
          onClick={attempt}
          className='w-full py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[11px] tracking-widest text-[#00ff41]/70 hover:text-[#00ff41] hover:bg-[#00ff41]/15 transition-all'
        >
          ENTRER
        </button>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`}</style>
    </div>
  )
}
