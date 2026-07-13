import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminMsg, serverTs } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!adminDb || !adminMsg) {
    return NextResponse.json({ error: 'Admin SDK non configuré — serviceAccount.json manquant' }, { status: 503 })
  }

  const { title, body, type } = (await req.json()) as { title: string; body: string; type: string }

  // In-app notification to ALL users; push only to the subset with a registered token
  const usersSnap = await adminDb.collection('users').get()
  const batch = adminDb.batch()
  const tokenEntries: { uid: string; token: string }[] = []

  usersSnap.docs.forEach(d => {
    const token = d.data().fcmToken as string | undefined
    if (token) tokenEntries.push({ uid: d.id, token })

    const ref = adminDb!.collection('notifications').doc()
    batch.set(ref, { uid: d.id, title, body, type, read: false, createdAt: serverTs() })
  })

  await batch.commit()

  let successCount = 0
  let failureCount = 0
  if (tokenEntries.length > 0) {
    const result = await adminMsg.sendEachForMulticast({
      tokens: tokenEntries.map(t => t.token),
      notification: { title, body },
      webpush: { notification: { title, body, icon: '/favicon.ico' } },
    })
    successCount = result.successCount
    failureCount = result.failureCount

    // Clean up invalid tokens
    result.responses.forEach((r, i) => {
      if (!r.success && (r.error?.code === 'messaging/invalid-registration-token' ||
          r.error?.code === 'messaging/registration-token-not-registered')) {
        const uid = tokenEntries[i]?.uid
        if (uid) adminDb!.collection('users').doc(uid).update({ fcmToken: null }).catch(() => {})
      }
    })
  }

  return NextResponse.json({ sent: successCount, failed: failureCount, inApp: usersSnap.size })
}
