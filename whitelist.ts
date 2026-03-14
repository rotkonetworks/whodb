// Whitelist for PAPI to optimize bundle size
// Only includes the APIs actually used in the application

export const whitelist = [
  // Identity queries (Capital I for People chains)
  "query.Identity.IdentityOf",
  "query.Identity.SuperOf",
  "query.Identity.SubsOf",
  "query.Identity.Registrars",

  // System queries
  "query.System.Account",
  "query.System.Events",

  // PeopleIdentity queries (alternate pallet name)
  "query.PeopleIdentity.IdentityOf",

  // Identity transactions
  "tx.Identity.set_identity",
  "tx.Identity.request_judgement",
  "tx.Identity.cancel_request",
  "tx.Identity.clear_identity",

  // Balances transactions
  "tx.Balances.transfer_keep_alive",

  // Utility transactions
  "tx.Utility.batch_all",
  "tx.Utility.batch",

  // XCM transactions
  "tx.XcmPallet.limited_teleport_assets",
  "tx.PolkadotXcm.limited_teleport_assets",

  // Balances
  "query.Balances.Account",
  "query.Balances.TotalIssuance",
]
