import { SS58String } from "polkadot-api"
import { IdentityData } from "@/types/Identity"
import BigNumber from "bignumber.js"

export enum RegistrationStep {
  PickNetwork = 1,
  ConnectWallet = 2,
  PickAccount = 3,
  CheckBalance = 4,
  FillIdentityInfo = 5,
  ReviewAndSubmit = 6,
  Complete = 7,
}

export interface RegistrationState {
  currentStep: RegistrationStep
  network: string | null
  selectedAccount: SS58String | null
  identityData: IdentityData
  hasEnoughBalance: boolean | null
  isSubmitting: boolean
}

export interface StepComponentProps {
  onNext: () => void
  onBack: () => void
  canProceed: boolean
}

export interface NetworkOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  badge: string
  badgeColor: string
  features: string[]
}

export interface BalanceInfo {
  balance: BigNumber | null
  minBalance: BigNumber | null
  hasEnough: boolean | null
}
