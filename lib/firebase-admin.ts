import * as admin from 'firebase-admin'
import { readFileSync } from 'fs'
import path from 'path'

function initAdmin() {
  if (admin.apps.length) return admin.app()
  try {
    const sa = JSON.parse(readFileSync(path.join(process.cwd(), 'serviceAccount.json'), 'utf8'))
    return admin.initializeApp({ credential: admin.credential.cert(sa) })
  } catch {
    return null
  }
}

const app = initAdmin()
export const adminDb   = app ? admin.firestore(app) : null
export const adminMsg  = app ? admin.messaging(app) : null
export const adminAuth = app ? admin.auth(app) : null
export const serverTs  = admin.firestore.FieldValue.serverTimestamp
