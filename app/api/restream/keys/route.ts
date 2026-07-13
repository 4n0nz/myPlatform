import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

// Keep in sync with app/constants.ts ADMIN_EMAILS
const ADMIN_EMAILS = ['mikeclaudo@gmail.com', 'yann.roshdy@gmail.com']

type Platform = 'tiktok' | 'youtube' | 'facebook' | 'x' | 'luxmedia'
const PLATFORMS: Platform[] = ['tiktok', 'youtube', 'facebook', 'x', 'luxmedia']
const KEYS_PATH = path.join(process.cwd(), '.restream-keys.json')

const DEFAULTS: Record<Platform, { url: string; key: string }> = {
  tiktok:   { url: '', key: '' },
  youtube:  { url: 'rtmp://a.rtmp.youtube.com/live2', key: '' },
  facebook: { url: 'rtmps://live-api-s.facebook.com:443/rtmp/', key: '' },
  x:        { url: '', key: '' },
  luxmedia: { url: '', key: '' },
}

function readKeys(): Record<Platform, { url: string; key: string }> {
  try {
    if (existsSync(KEYS_PATH)) {
      const data = JSON.parse(readFileSync(KEYS_PATH, 'utf8'))
      const out = {} as Record<Platform, { url: string; key: string }>
      for (const p of PLATFORMS) out[p] = { url: data?.[p]?.url ?? DEFAULTS[p].url, key: data?.[p]?.key ?? '' }
      return out
    }
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULTS))
}

async function requireAdmin(req: NextRequest): Promise<string | null> {
  if (!adminAuth) return null
  const authz = req.headers.get('authorization') || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : ''
  if (!token) return null
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const email = decoded.email || ''
    return ADMIN_EMAILS.includes(email) ? email : null
  } catch {
    return null
  }
}

function masked(keys: Record<Platform, { url: string; key: string }>) {
  const out = {} as Record<Platform, { url: string; keySet: boolean; keyHint: string }>
  for (const p of PLATFORMS) {
    const k = keys[p].key
    out[p] = { url: keys[p].url, keySet: !!k, keyHint: k ? '••••' + k.slice(-4) : '' }
  }
  return out
}

export async function GET(req: NextRequest) {
  if (!adminAuth) return NextResponse.json({ error: 'Admin SDK non configuré — serviceAccount.json manquant' }, { status: 503 })
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json(masked(readKeys()))
}

export async function POST(req: NextRequest) {
  if (!adminAuth) return NextResponse.json({ error: 'Admin SDK non configuré — serviceAccount.json manquant' }, { status: 503 })
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = (await req.json()) as Partial<Record<Platform, { url?: string; key?: string }>>
  const keys = readKeys()
  for (const p of PLATFORMS) {
    const incoming = body?.[p]
    if (!incoming) continue
    if (typeof incoming.url === 'string' && incoming.url.trim() !== '') keys[p].url = incoming.url.trim()
    if (typeof incoming.key === 'string' && incoming.key.trim() !== '') keys[p].key = incoming.key.trim()
  }
  writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2), { mode: 0o600 })
  try { chmodSync(KEYS_PATH, 0o600) } catch {}
  return NextResponse.json(masked(keys))
}
