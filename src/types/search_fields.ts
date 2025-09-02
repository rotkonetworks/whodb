// NOTE: move this to another folder, like consts or something
const AllowedFields = [
  "display_name", "wallet_id", "id", "discord", "twitter", "matrix", "pgp_fingerprint", "web", "email", "result_size", "network"
]

const FullDisplayedOutputs = [
  "Timeline", "Display", "WalletID", "Discord", "Twitter", "Matrix", "PGPFingerprint", "Web", "Email", "Github", "Network",
]

const PartialDisplayedOutputs = [
  "Display", "WalletID", "Web", "Email", "Network"
]

export { PartialDisplayedOutputs as PossibleDisplayedOutputs }

export { FullDisplayedOutputs }
export { PartialDisplayedOutputs }
export { AllowedFields }
