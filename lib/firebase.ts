import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCnvP4E6_4x5yTcc6moeQJbNm4cGoQtkKo',
  authDomain: 'myplateform-792dd.firebaseapp.com',
  projectId: 'myplateform-792dd',
  storageBucket: 'myplateform-792dd.firebasestorage.app',
  messagingSenderId: '1071974158578',
  appId: '1:1071974158578:web:4a7d00214eb2622ae9806b',
  measurementId: 'G-N8F04QZNVR',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export default app
