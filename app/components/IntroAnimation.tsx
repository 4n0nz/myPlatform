'use client'
import { useState, useEffect } from 'react'

export default function IntroAnimation({ onDone }: { onDone: () => void }) {
  const [split, setSplit] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setSplit(true), 350)
    const t2 = setTimeout(() => setFadeOut(true), 750)
    const t3 = setTimeout(() => { setGone(true); onDone() }, 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  if (gone) return null

  return (
    <div className='fixed inset-0 z-[300] pointer-events-none overflow-hidden'>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'black',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.55s ease',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '2px',
        background: '#00ff41',
        boxShadow: '0 0 8px rgba(0,255,65,0.8)',
        top: split ? '0px' : 'calc(50% - 1px)',
        transition: 'top 0.75s cubic-bezier(0.76, 0, 0.24, 1)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '2px',
        background: '#00ff41',
        boxShadow: '0 0 8px rgba(0,255,65,0.8)',
        top: split ? 'calc(100% - 2px)' : 'calc(50% - 1px)',
        transition: 'top 0.75s cubic-bezier(0.76, 0, 0.24, 1)',
      }} />
    </div>
  )
}
