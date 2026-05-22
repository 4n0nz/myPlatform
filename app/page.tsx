'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { LogIn, UserPlus, X, Mail, Lock, User, LogOut } from 'lucide-react'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore'
import { auth, googleProvider, db } from '@/lib/firebase'

const DEV_PASSWORD = '1q3e5t7u9o2w4r6y8i0p'

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const attempt = () => {
    if (input === DEV_PASSWORD) {
      sessionStorage.setItem('dev_unlocked', '1')
      onUnlock()
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
      <p className='text-lg font-bold tracking-[0.3em] mb-1'>IPS<span className='text-[#00ff41]/40'>.MYGOODS</span></p>
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

function IntroAnimation({ onDone }: { onDone: () => void }) {
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
    <div className='fixed inset-0 z-[100] pointer-events-none overflow-hidden'>
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

function AuthModal({ mode, onClose }: { mode: 'login' | 'register', onClose: () => void }) {
  const [tab, setTab] = useState(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLogin = tab === 'login'

  const clearError = () => setError(null)

  const handleGoogle = async () => {
    setLoading(true)
    clearError()
    try {
      await signInWithPopup(auth, googleProvider)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur Google')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    clearError()
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      onClose()
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Email ou mot de passe incorrect')
      } else if (code === 'auth/email-already-in-use') {
        setError('Email deja utilise')
      } else if (code === 'auth/weak-password') {
        setError('Mot de passe trop faible (6 caracteres min)')
      } else if (code === 'auth/invalid-email') {
        setError('Adresse email invalide')
      } else {
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className='modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4'
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className='modal-card relative w-full max-w-[400px] rounded-2xl overflow-hidden'
        style={{
          background: 'linear-gradient(160deg, #060d07 0%, #000 60%)',
          border: '1px solid rgba(0,255,65,0.35)',
          boxShadow: '0 0 1px rgba(0,255,65,0.6), 0 24px 70px -12px rgba(0,255,65,0.18), inset 0 1px 0 rgba(0,255,65,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className='h-[2px] w-full' style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />

        <div className='p-7'>
          {/* Close */}
          <button
            onClick={onClose}
            className='absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-md text-[#00ff41]/40 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all'
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className='text-center mb-1'>
            <span className='text-lg font-bold tracking-[0.2em] font-mono'>IPS<span className='text-[#00ff41]/40'>.MYGOODS</span></span>
          </div>
          <p className='text-center text-[11px] text-[#00ff41]/40 font-mono mb-6'>
            {isLogin ? 'Ravi de te revoir' : 'Rejoins la communaute'}
          </p>

          {/* Segmented tabs */}
          <div className='relative flex p-1 mb-6 rounded-lg' style={{ background: 'rgba(0,255,65,0.06)' }}>
            <div
              className='absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-transform duration-300 ease-out'
              style={{ background: '#00ff41', transform: isLogin ? 'translateX(0)' : 'translateX(calc(100% + 8px))' }}
            />
            <button
              onClick={() => { setTab('login'); clearError() }}
              className={`relative z-10 flex-1 py-2 text-[11px] tracking-widest font-mono font-bold transition-colors ${isLogin ? 'text-black' : 'text-[#00ff41]/55 hover:text-[#00ff41]'}`}
            >CONNEXION</button>
            <button
              onClick={() => { setTab('register'); clearError() }}
              className={`relative z-10 flex-1 py-2 text-[11px] tracking-widest font-mono font-bold transition-colors ${!isLogin ? 'text-black' : 'text-[#00ff41]/55 hover:text-[#00ff41]'}`}
            >REJOINDRE</button>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className='group w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-[#00ff41]/25 text-[#00ff41]/85 hover:border-[#00ff41]/60 hover:bg-[#00ff41]/[0.04] transition-all text-[13px] font-mono disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path fill="#00ff41" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#00cc33" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#009922" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#00ff41" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className='flex items-center gap-3 my-5'>
            <div className='flex-1 h-px bg-[#00ff41]/15' />
            <span className='text-[10px] text-[#00ff41]/30 font-mono tracking-widest'>OU</span>
            <div className='flex-1 h-px bg-[#00ff41]/15' />
          </div>

          {/* Form */}
          <div className='space-y-3'>
            {!isLogin && (
              <div className='group flex items-center rounded-lg border border-[#00ff41]/20 bg-[#00ff41]/[0.03] focus-within:border-[#00ff41]/60 focus-within:bg-[#00ff41]/[0.06] transition-all'>
                <User size={15} className='ml-3.5 text-[#00ff41]/40 group-focus-within:text-[#00ff41]/70 shrink-0 transition-colors' />
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className='flex-1 bg-transparent px-3 py-3 text-[13px] text-[#00ff41] placeholder-[#00ff41]/30 outline-none font-mono'
                  placeholder="Nom d'utilisateur"
                />
              </div>
            )}
            <div className='group flex items-center rounded-lg border border-[#00ff41]/20 bg-[#00ff41]/[0.03] focus-within:border-[#00ff41]/60 focus-within:bg-[#00ff41]/[0.06] transition-all'>
              <Mail size={15} className='ml-3.5 text-[#00ff41]/40 group-focus-within:text-[#00ff41]/70 shrink-0 transition-colors' />
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className='flex-1 bg-transparent px-3 py-3 text-[13px] text-[#00ff41] placeholder-[#00ff41]/30 outline-none font-mono'
                placeholder='Adresse email'
              />
            </div>
            <div className='group flex items-center rounded-lg border border-[#00ff41]/20 bg-[#00ff41]/[0.03] focus-within:border-[#00ff41]/60 focus-within:bg-[#00ff41]/[0.06] transition-all'>
              <Lock size={15} className='ml-3.5 text-[#00ff41]/40 group-focus-within:text-[#00ff41]/70 shrink-0 transition-colors' />
              <input
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className='flex-1 bg-transparent px-3 py-3 text-[13px] text-[#00ff41] placeholder-[#00ff41]/30 outline-none font-mono'
                placeholder='Mot de passe'
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className='mt-3 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-[11px] font-mono'>
              {error}
            </div>
          )}

          {isLogin && (
            <div className='text-right mt-2.5'>
              <a href='#' className='text-[11px] text-[#00ff41]/40 hover:text-[#00ff41] font-mono transition-colors'>Mot de passe oublie ?</a>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className='w-full mt-5 py-3 rounded-lg bg-[#00ff41] text-black font-bold text-[13px] tracking-widest hover:bg-[#00cc33] transition-all font-mono flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
            style={{ boxShadow: '0 6px 20px -6px rgba(0,255,65,0.5)' }}
          >
            {loading ? (
              <span className='animate-pulse'>...</span>
            ) : isLogin ? (
              <><LogIn size={15}/> SE CONNECTER</>
            ) : (
              <><UserPlus size={15}/> CREER MON COMPTE</>
            )}
          </button>

          <p className='text-center text-[11px] text-[#00ff41]/35 font-mono mt-5'>
            {isLogin ? (
              <>Pas encore de compte ? <button onClick={() => { setTab('register'); clearError() }} className='text-[#00ff41]/70 hover:text-[#00ff41] transition-colors'>Rejoindre</button></>
            ) : (
              <>Deja membre ? <button onClick={() => { setTab('login'); clearError() }} className='text-[#00ff41]/70 hover:text-[#00ff41] transition-colors'>Se connecter</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [modal, setModal] = useState<'login' | 'register' | null>(null)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  useEffect(() => {
    if (sessionStorage.getItem('dev_unlocked') === '1') setUnlocked(true)
  }, [])
  const [userRole, setUserRole] = useState<'user' | 'vip' | 'modo' | 'admin' | null>(null)
  const [adminUsers, setAdminUsers] = useState<{ uid: string; email: string; displayName: string; role: string }[]>([])
  const [intro, setIntro] = useState(true)
  const handleIntroDone = useCallback(() => setIntro(false), [])
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [messages, setMessages] = useState<{ id: string; user: string; msg: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) { setUserRole(null); return }
      const ref = doc(db, 'users', u.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        const role = u.email === 'mikeclaudo@gmail.com' ? 'admin' : 'user'
        await setDoc(ref, {
          email: u.email ?? '',
          displayName: u.displayName ?? u.email?.split('@')[0] ?? 'anon',
          role,
          createdAt: serverTimestamp(),
        })
        setUserRole(role as 'user' | 'admin')
      } else {
        setUserRole(snap.data().role as 'user' | 'vip' | 'modo' | 'admin')
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(50))
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, user: d.data().user, msg: d.data().msg })))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    const username = user
      ? (user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'anon')
      : 'anon_' + Math.floor(Math.random() * 9999)
    await addDoc(collection(db, 'messages'), {
      user: username,
      msg: text,
      createdAt: serverTimestamp(),
    })
  }

  useEffect(() => {
    if (userRole !== 'admin') return
    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50))).then(snap => {
      setAdminUsers(snap.docs.map(d => ({ uid: d.id, ...(d.data() as { email: string; displayName: string; role: string }) })))
    })
  }, [userRole])

  const changeRole = async (uid: string, role: string) => {
    await updateDoc(doc(db, 'users', uid), { role })
    setAdminUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u))
  }

  const handleSignOut = async () => {
    await signOut(auth)
    setUserMenuOpen(false)
    setRightDrawerOpen(false)
  }

  return (
    <main className='h-screen w-screen bg-black text-[#00ff41] font-mono flex flex-col overflow-hidden'>

      {!unlocked && <PasswordGate onUnlock={() => setUnlocked(true)} />}
      {intro && <IntroAnimation onDone={handleIntroDone} />}
      {modal && <AuthModal mode={modal} onClose={() => setModal(null)} />}

      <div className='w-full h-[2px] bg-[#00ff41] shrink-0' />

      <nav className='flex items-center justify-between px-3 border-b border-[#00ff41]/30 shrink-0 h-[60px]'>
        <span className='text-lg font-bold tracking-widest'>IPS<span className='text-[#00ff41]/50'>.MYGOODS</span></span>
        <div className='w-64 grid grid-cols-2 gap-2'>
          <div />
          <div className='flex justify-center'>
            {user ? (
              <div className='relative'>
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  style={{fontFamily:'Arial,sans-serif',fontSize:'10px',height:'29px',padding:'0 10px',borderRadius:'5px',border:'1.5px solid #00ff41',background:'rgba(0,255,65,0.08)',color:'#00ff41',display:'flex',alignItems:'center',gap:'6px',cursor:'pointer',fontWeight:600,letterSpacing:'0.5px',maxWidth:'150px'}}
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
                style={{fontFamily:'Arial,sans-serif',fontSize:'10px',height:'29px',padding:'0 13px',borderRadius:'5px',border:'1.5px solid #00ff41',background:'transparent',color:'#00ff41',display:'flex',alignItems:'center',gap:'6px',cursor:'pointer',fontWeight:600,letterSpacing:'0.5px'}}
              ><LogIn size={11}/> CONNEXION</button>
            )}
          </div>
        </div>
      </nav>

      <div className='flex flex-1 overflow-hidden'>

        {/* LEFT SIDEBAR — overlay drawer */}
        <div className='relative w-0 flex flex-col shrink-0 overflow-visible'>

          {/* Drawer */}
          <div
            className='absolute inset-y-0 left-0 flex flex-col bg-black border-r border-[#00ff41]/40 transition-all duration-300 overflow-hidden z-20'
            style={{
              width: leftDrawerOpen ? '220px' : '0px',
              boxShadow: leftDrawerOpen ? '4px 0 20px rgba(0,255,65,0.1)' : 'none',
            }}
          >
            <div style={{ width: '220px', minWidth: '220px' }} className='flex flex-col h-full overflow-hidden'>
              <div className='border-b border-[#00ff41]/30 px-3 py-1.5 text-[10px] tracking-widest text-[#00ff41]/60 shrink-0 flex items-center justify-between'>
                <span>CATEGORIES</span>
                <button onClick={() => setLeftDrawerOpen(false)} className='text-[#00ff41]/40 hover:text-[#00ff41] transition-colors text-xs'>✕</button>
              </div>
              <div className='flex flex-col py-2 overflow-y-auto flex-1'>
                {['TECH', 'SOCIETE', 'ECONOMIE', 'POLITIQUE', 'SCIENCE', 'CULTURE'].map((topic) => (
                  <div key={topic} className='px-4 py-2.5 flex items-center gap-3 text-[11px] tracking-widest text-[#00ff41]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/5 cursor-pointer transition-all border-l-2 border-transparent hover:border-[#00ff41]/60'>
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

          {/* Toggle bouton */}
          <button
            onClick={() => setLeftDrawerOpen(o => !o)}
            className='absolute top-1/2 -translate-y-1/2 left-0 z-30 w-6 h-10 flex items-center justify-center bg-black border border-[#00ff41]/30 text-[#00ff41]/50 hover:text-[#00ff41] hover:border-[#00ff41]/70 transition-all'
            style={{ fontSize: '9px', borderRadius: '3px 0 0 3px' }}
          >
            {leftDrawerOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className='flex flex-col flex-1 gap-3 p-3 overflow-hidden'>

          <div className='relative border-2 border-[#00ff41] flex-1 bg-black flex items-center justify-center cursor-pointer hover:shadow-[0_0_30px_rgba(0,255,65,0.15)] transition-all overflow-hidden'>
            <div className='absolute top-2 left-3 flex items-center gap-2'>
              <span className='w-2 h-2 rounded-full bg-[#00ff41] animate-pulse' />
              <span className='text-xs tracking-widest'>EN DIRECT</span>
            </div>
            <div className='absolute top-2 right-3 text-xs text-[#00ff41]/50'>2,341 SPECTATEURS</div>
            <div className='text-center'>
              <div className='text-5xl opacity-20'>&#9654;</div>
              <p className='text-[#00ff41]/30 text-xs tracking-widest mt-2'>STREAM EN COURS</p>
            </div>
            <div className='absolute bottom-2 left-3 right-3 flex justify-between'>
              <span className='text-xs text-[#00ff41]/60'>SUJET #1 - TECHNOLOGIE & SOCIETE</span>
              <span className='text-xs text-[#00ff41]/40'>02:14:37</span>
            </div>
          </div>

          <div className='border border-[#00ff41]/30 px-4 py-2 bg-[#00ff41]/5 shrink-0'>
            <h2 className='text-sm font-bold tracking-wider'>Intelligence Artificielle : Menace ou Opportunite ?</h2>
            <p className='text-[#00ff41]/50 text-xs mt-0.5'>par <span className='text-[#00ff41]/80'>@4n0nz</span> - Demarre il y a 2h - 847 interactions</p>
          </div>

        </div>

        {/* RIGHT SIDEBAR — chat toujours visible */}
        <div className='relative w-64 flex flex-col shrink-0 border-l border-[#00ff41]/20 overflow-hidden'>
          <div className='flex flex-col h-full gap-3 p-3 overflow-hidden'>

            <div className='flex-1 border border-[#00ff41]/30 flex flex-col overflow-hidden'>
              <div className='border-b border-[#00ff41]/30 px-3 py-1.5 text-[10px] tracking-widest text-[#00ff41]/60 shrink-0'>CHAT EN DIRECT</div>
              <div className='flex-1 p-2 space-y-1.5 overflow-y-auto'>
                {messages.map((m) => (
                  <div key={m.id} className='text-[11px]'>
                    <span className='text-[#00ff41]/80 font-bold'>{m.user}: </span>
                    <span className='text-[#00ff41]/50'>{m.msg}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className='border-t border-[#00ff41]/30 p-2 flex gap-1.5 shrink-0'>
                <input
                  className='flex-1 bg-transparent border border-[#00ff41]/30 px-2 py-1 text-[11px] text-[#00ff41] placeholder-[#00ff41]/20 outline-none focus:border-[#00ff41]/60'
                  placeholder='ecrire un message...'
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className='px-2 py-1 bg-[#00ff41]/10 border border-[#00ff41]/30 text-xs hover:bg-[#00ff41]/20 transition-all'
                >&#9654;</button>
              </div>
            </div>

          </div>

          {/* RIGHT DRAWER — overlay par-dessus le chat */}
          <div
            className='absolute inset-y-0 right-0 flex flex-col bg-black border-l border-[#00ff41]/40 transition-all duration-300 overflow-hidden z-20'
            style={{
              width: rightDrawerOpen ? '100%' : '0px',
              boxShadow: rightDrawerOpen ? '-4px 0 20px rgba(0,255,65,0.1)' : 'none',
            }}
          >
            <div style={{ width: '256px', minWidth: '256px' }} className='flex flex-col h-full overflow-hidden'>
              <div className='border-b border-[#00ff41]/30 px-3 py-1.5 text-[10px] tracking-widest text-[#00ff41]/60 shrink-0 flex items-center justify-between'>
                <span>MENU</span>
                <button onClick={() => setRightDrawerOpen(false)} className='text-[#00ff41]/40 hover:text-[#00ff41] transition-colors text-xs'>✕</button>
              </div>
              <div className='flex flex-col py-2 overflow-y-auto flex-1 px-2'>
                {['PROFIL', 'NOTIFICATIONS', 'PARAMETRES', 'HISTORIQUE', 'FAVORIS', 'AIDE'].map((item) => (
                  <div key={item} className='px-3 py-2.5 flex items-center gap-3 text-[11px] tracking-widest text-[#00ff41]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/5 cursor-pointer transition-all border-l-2 border-transparent hover:border-[#00ff41]/60 rounded-sm'>
                    {item}
                  </div>
                ))}

                {userRole === 'admin' && (
                  <div className='mt-3'>
                    <div className='px-3 py-1.5 text-[9px] tracking-widest text-[#ff4141]/60 border-t border-[#ff4141]/20 mb-2 flex items-center gap-2'>
                      <span>⚙</span> ADMINISTRATION
                    </div>
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
                              <button
                                key={r}
                                onClick={() => changeRole(u.uid, r)}
                                className='flex-1 py-0.5 text-[8px] tracking-widest transition-all'
                                style={{
                                  border: '1px solid',
                                  borderRadius: '2px',
                                  borderColor: u.role === r
                                    ? r === 'vip' ? '#ffd700' : r === 'modo' ? '#00bfff' : '#00ff41'
                                    : 'rgba(0,255,65,0.2)',
                                  color: u.role === r
                                    ? r === 'vip' ? '#ffd700' : r === 'modo' ? '#00bfff' : '#00ff41'
                                    : 'rgba(0,255,65,0.35)',
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
            </div>
          </div>

          {/* Toggle bouton drawer droit — connecté uniquement */}
          {user && (
            <button
              onClick={() => setRightDrawerOpen(o => !o)}
              className='absolute top-1/2 -translate-y-1/2 right-0 z-30 w-6 h-10 flex items-center justify-center bg-black border border-[#00ff41]/30 text-[#00ff41]/50 hover:text-[#00ff41] hover:border-[#00ff41]/70 transition-all'
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
