// Whitelist for PAPI to optimize bundle size
// Only includes the APIs actually used in the application

export const whitelist = [
  // Identity queries
  "query.Identity.IdentityOf",
  "query.Identity.SuperOf",
  "query.Identity.SubsOf",
  "query.Identity.Registrars",

  // System queries
  "query.System.Account",
  "query.System.Events",

  // Identity transactions
  "tx.Identity.setIdentity",
  "tx.Identity.requestJudgement",
  "tx.Identity.cancelRequest",

  // Utility transactions
  "tx.Utility.batchAll",

  // XCM transactions
  "tx.XcmPallet.limitedTeleportAssets",
]
