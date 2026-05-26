'use client'
import { useState } from 'react'
import { LogIn, UserPlus, X, Mail, Lock, User } from 'lucide-react'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'

export default function AuthModal({ mode, onClose }: { mode: 'login' | 'register'; onClose: () => void }) {
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
        <div className='h-[2px] w-full' style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />
        <div className='p-7'>
          <button
            onClick={onClose}
            className='absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-md text-[#00ff41]/40 hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-all'
          >
            <X size={16} />
          </button>
          <div className='text-center mb-1'>
            <span className='text-lg font-bold tracking-[0.2em] font-mono'>RoshDynamics</span>
          </div>
          <p className='text-center text-[11px] text-[#00ff41]/40 font-mono mb-6'>
            {isLogin ? 'Ravi de te revoir' : 'Rejoins la communaute'}
          </p>

          {/* Tab switcher */}
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

          {/* Social buttons */}
          <div className='grid grid-cols-2 gap-2'>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className='flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#00ff41]/25 text-[#00ff41]/80 hover:border-[#00ff41]/55 hover:bg-[#00ff41]/[0.05] transition-all text-[11px] font-mono disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <svg width="14" height="14" viewBox="0 0 24 24" className='shrink-0'>
                <path fill="#00ff41" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#00cc33" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#009922" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#00ff41" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => setError('Facebook — bientôt disponible')}
              disabled={loading}
              className='flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#00ff41]/25 text-[#00ff41]/80 hover:border-[#00ff41]/55 hover:bg-[#00ff41]/[0.05] transition-all text-[11px] font-mono disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#00ff41" className='shrink-0'>
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.024 4.388 11.02 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.093 24 18.097 24 12.073z"/>
              </svg>
              Facebook
            </button>
            <button
              onClick={() => setError('X — bientôt disponible')}
              disabled={loading}
              className='flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#00ff41]/25 text-[#00ff41]/80 hover:border-[#00ff41]/55 hover:bg-[#00ff41]/[0.05] transition-all text-[11px] font-mono disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#00ff41" className='shrink-0'>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
              </svg>
              X
            </button>
            <button
              onClick={() => setError('Telegram — bientôt disponible')}
              disabled={loading}
              className='flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#00ff41]/25 text-[#00ff41]/80 hover:border-[#00ff41]/55 hover:bg-[#00ff41]/[0.05] transition-all text-[11px] font-mono disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#00ff41" className='shrink-0'>
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </button>
          </div>

          <div className='flex items-center gap-3 my-5'>
            <div className='flex-1 h-px bg-[#00ff41]/15' />
            <span className='text-[10px] text-[#00ff41]/30 font-mono tracking-widest'>OU</span>
            <div className='flex-1 h-px bg-[#00ff41]/15' />
          </div>

          {/* Email/password fields */}
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
