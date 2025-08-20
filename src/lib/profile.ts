// Profile type definition
export interface Profile {
  id: string
  displayName: string
  nickname: string | null
  walletAddress: string
  verified: boolean
  judgement: string
  isOwnProfile?: boolean
  avatar?: string
  email?: string
  matrix?: string
  discord?: string
  twitter?: string
  github?: string
  web?: string
  pgp_fingerprint?: string
  image?: string
  legal?: string
  subaccounts?: Profile[]
  deposit?: string
  network?: string
}
