import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminMsg, serverTs } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  if (!adminDb || !adminMsg) {
    return NextResponse.json({ error: 'Admin SDK non configuré — serviceAccount.json manquant' }, { status: 503 })
  }

  const { title, body, type } = (await req.json()) as { title: string; body: string; type: string }

  // Collect all FCM tokens + user UIDs
  const usersSnap = await adminDb.collection('users').where('fcmToken', '!=', null).get()
  const tokens: string[] = []
  const batch = adminDb.batch()

  usersSnap.docs.forEach(d => {
    const token = d.data().fcmToken as string | undefined
    if (token) tokens.push(token)

    // Write in-app notification for each user
    const ref = adminDb!.collection('notifications').doc()
    batch.set(ref, {
      uid: d.id,
      title,
      body,
      type,
      read: false,
      createdAt: serverTs(),
    })
  })

  await batch.commit()

  // Send FCM push
  let successCount = 0
  let failureCount = 0
  if (tokens.length > 0) {
    const result = await adminMsg.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: { notification: { title, body, icon: '/favicon.ico' } },
    })
    successCount = result.successCount
    failureCount = result.failureCount

    // Clean up invalid tokens
    result.responses.forEach((r, i) => {
      if (!r.success && (r.error?.code === 'messaging/invalid-registration-token' ||
          r.error?.code === 'messaging/registration-token-not-registered')) {
        const uid = usersSnap.docs[i]?.id
        if (uid) adminDb!.collection('users').doc(uid).update({ fcmToken: null }).catch(() => {})
      }
    })
  }

  return NextResponse.json({ sent: successCount, failed: failureCount, inApp: usersSnap.size })
}
