import { ImageResponse } from 'next/og'

export const alt = 'RoshDynamics - Acces restreint'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          position: 'relative',
        }}
      >
        {/* top & bottom green bars */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#00ff41', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: '#00ff41', display: 'flex' }} />

        {/* title */}
        <div style={{ fontSize: 68, fontWeight: 700, color: '#00ff41', letterSpacing: 18, display: 'flex' }}>
          RoshDynamics
        </div>

        {/* subtitle */}
        <div style={{ fontSize: 20, color: 'rgba(0,255,65,0.35)', letterSpacing: 7, marginTop: 14, marginBottom: 52, display: 'flex' }}>
          ACCES RESTREINT — DEVELOPPEMENT
        </div>

        {/* password input */}
        <div
          style={{
            width: 480,
            height: 62,
            border: '1px solid rgba(0,255,65,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(0,255,65,0.3)',
            fontSize: 20,
            letterSpacing: 4,
          }}
        >
          mot de passe
        </div>

        {/* enter button */}
        <div
          style={{
            width: 480,
            height: 54,
            marginTop: 18,
            background: 'rgba(0,255,65,0.1)',
            border: '1px solid rgba(0,255,65,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(0,255,65,0.7)',
            fontSize: 18,
            letterSpacing: 8,
          }}
        >
          ENTRER
        </div>
      </div>
    ),
    { ...size }
  )
}
