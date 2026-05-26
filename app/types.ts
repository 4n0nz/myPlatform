import type { User as FirebaseUser } from 'firebase/auth'

export type { FirebaseUser }

export type UserRole = 'user' | 'vip' | 'modo' | 'admin'

export type Message = {
  id: string
  uid: string | null
  user: string
  msg: string
  icon?: string
  color?: string
}

export type FriendReq = { id: string; fromUid: string; fromName: string }
export type Friend = { uid: string; name: string }
export type CrewMember = { uid: string; name: string }
export type Crew = {
  id: string
  name: string
  tag: string
  leaderId: string
  leaderName: string
  members: CrewMember[]
  pending: CrewMember[]
}
export type PublicCrew = {
  id: string
  name: string
  tag: string
  leaderId: string
  leaderName: string
  memberCount: number
}

export type AdminUser = { uid: string; email: string; displayName: string; role: string }
