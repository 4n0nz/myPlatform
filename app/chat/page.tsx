'use client'
import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, onSnapshot as onDocSnapshot } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import type { User } from 'firebase/auth'
import type { Message } from '../types'

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [userIcon, setUserIcon] = useState('')
  const [userColor, setUserColor] = useState('#00ff41')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bc = new BroadcastChannel('chat_popup')
    bc.postMessage('open')
    const onUnload = () => bc.postMessage('close')
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      bc.postMessage('close')
      bc.close()
    }
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  useEffect(() => {
    if (!user) return
    return onDocSnapshot(doc(db, 'users', user.uid), snap => {
      if (!snap.exists()) return
      if (snap.data().icon !== undefined) setUserIcon(snap.data().icon ?? '')
      if (snap.data().color) setUserColor(snap.data().color)
    })
  }, [user?.uid])

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(50))
    return onSnapshot(q, snap => {
      const msgs: Message[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message))
      setMessages(msgs)
    })
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const displayName = (u: NonNullable<typeof user>) =>
    u.displayName?.split(' ')[0] || u.email?.split('@')[0] || 'anon'

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    const username = user ? displayName(user) : 'anon_' + Math.floor(Math.random() * 9999)
    await addDoc(collection(db, 'messages'), {
      uid: user?.uid ?? null,
      user: username,
      msg: text,
      icon: user ? userIcon : '',
      color: user ? userColor : '#00ff41',
      createdAt: serverTimestamp(),
    })
  }

  return (
    <div className='flex flex-col h-screen bg-black text-[#00ff41] font-mono overflow-hidden'>
      {/* Header */}
      <div className='border-b border-[#00ff41]/30 px-4 py-2 text-[10px] tracking-widest text-[#00ff41]/60 shrink-0 flex items-center justify-between'>
        <span>CHAT EN DIRECT</span>
        {user && <span className='text-[#00ff41]/40'>{displayName(user)}</span>}
      </div>

      {/* Messages */}
      <div className='flex-1 p-3 space-y-1.5 overflow-y-auto'>
        {messages.map(m => (
          <div key={m.id} className='text-[11px] flex items-start gap-1.5'>
            {m.icon && <span className='shrink-0 leading-tight mt-px'>{m.icon}</span>}
            <span className='shrink-0 font-bold leading-tight mt-px' style={{ color: m.color || '#00ff41' }}>
              {m.user}
            </span>
            <span className='text-[#00ff41]/70 leading-relaxed break-words min-w-0'>{m.msg}</span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className='border-t border-[#00ff41]/30 p-2 flex gap-2 shrink-0 h-[90px] items-stretch'>
        <textarea
          className='flex-1 h-full bg-transparent border border-[#00ff41]/30 px-2 py-1 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60 resize-none leading-relaxed'
          placeholder='ecrire un message...'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <button
          onClick={send}
          className='px-3 bg-[#00ff41]/10 border border-[#00ff41]/30 text-xs hover:bg-[#00ff41]/20 transition-all flex items-center justify-center'
        >&#9654;</button>
      </div>
    </div>
  )
}
