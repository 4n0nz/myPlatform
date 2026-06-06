importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCnvP4E6_4x5yTcc6moeQJbNm4cGoQtkKo',
  authDomain: 'myplateform-792dd.firebaseapp.com',
  projectId: 'myplateform-792dd',
  storageBucket: 'myplateform-792dd.firebasestorage.app',
  messagingSenderId: '1071974158578',
  appId: '1:1071974158578:web:4a7d00214eb2622ae9806b',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title ?? 'RoshDynamics'
  const body = payload.notification?.body ?? ''
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.type ?? 'general',
  })
})
