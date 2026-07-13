// RoshDynamics restreamer — fan-out du feed caméra (cam2, H.264+AAC) vers les
// plateformes activées dans Firestore config/restream, avec les clés de
// .restream-keys.json. Un process ffmpeg par plateforme, -c copy (no re-encode).
// Géré par PM2 (name: restreamer), cwd = /home/anon/platform.

import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { spawn } from 'child_process'
import { createHash } from 'crypto'
import path from 'path'

const ROOT      = process.cwd()
const SA_PATH   = path.join(ROOT, 'serviceAccount.json')
const KEYS_PATH = path.join(ROOT, '.restream-keys.json')
const SOURCE    = 'rtsp://127.0.0.1:8554/cam2'          // déjà H.264 + AAC
const MTX_API   = 'http://127.0.0.1:9997/v3/paths/get/cam2'
const PLATFORMS = ['tiktok', 'youtube', 'facebook', 'x', 'luxmedia']
const TICK_MS   = 10000

const log = (...a) => console.log(new Date().toISOString(), ...a)

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) })
const db = admin.firestore()

let toggles = { tiktok: false, youtube: false, facebook: false, x: false, luxmedia: false }
let lastKeysHash = ''
const children = new Map()   // platform -> ChildProcess
let busy = false

function readKeysRaw() {
  try { return existsSync(KEYS_PATH) ? readFileSync(KEYS_PATH, 'utf8') : '{}' } catch { return '{}' }
}

function dest(url, key) {
  if (!url || !key) return null
  return url.endsWith('/') ? url + key : url + '/' + key
}

async function sourceReady() {
  // null = API indispo (on autorise), true/false = réponse MediaMTX
  try {
    const r = await fetch(MTX_API, { signal: AbortSignal.timeout(2000) })
    if (!r.ok) return false
    const j = await r.json()
    return j?.ready === true
  } catch { return null }
}

function spawnFor(platform, url, key) {
  const out = dest(url, key)
  if (!out) return
  log(`> start ${platform} -> ${url}`)
  const args = ['-rtsp_transport', 'tcp', '-i', SOURCE,
                '-c', 'copy', '-f', 'flv', out]
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'ignore'] })
  child.on('exit', (code, sig) => {
    log(`x exit ${platform} (code=${code} sig=${sig})`)
    if (children.get(platform) === child) children.delete(platform)
  })
  child.on('error', e => log(`! ffmpeg error ${platform}: ${e.message}`))
  children.set(platform, child)
}

function killFor(platform) {
  const c = children.get(platform)
  if (!c) return
  log(`- stop ${platform}`)
  children.delete(platform)
  try { c.kill('SIGKILL') } catch {}
}

async function reconcile() {
  if (busy) return
  busy = true
  try {
    const raw = readKeysRaw()
    let keys = {}
    try { keys = JSON.parse(raw) } catch {}
    const hash = createHash('sha1').update(raw).digest('hex')
    if (hash !== lastKeysHash) {
      lastKeysHash = hash
      // clés modifiées -> on relance les flux actifs pour appliquer les nouvelles creds
      for (const p of [...children.keys()]) killFor(p)
    }
    const srcReady = await sourceReady()
    for (const p of PLATFORMS) {
      const want = !!toggles[p] && !!keys?.[p]?.key && !!keys?.[p]?.url
      const running = children.has(p)
      if (!want && running) killFor(p)
      if (want && !running) {
        if (srcReady === false) continue        // source confirmée absente -> pas de thrash
        spawnFor(p, keys[p].url, keys[p].key)
      }
    }
  } finally {
    busy = false
  }
}

db.collection('config').doc('restream').onSnapshot(snap => {
  const d = snap.data() || {}
  toggles = { tiktok: !!d.tiktok, youtube: !!d.youtube, facebook: !!d.facebook, x: !!d.x, luxmedia: !!d.luxmedia }
  log('toggles', JSON.stringify(toggles))
  reconcile()
}, err => log('firestore err', err.message))

setInterval(reconcile, TICK_MS)
process.on('SIGTERM', () => { for (const p of [...children.keys()]) killFor(p); process.exit(0) })

log('restreamer up — source', SOURCE)
