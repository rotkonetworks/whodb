import { RegistrarIdentity } from "@/hooks/useRegistrarIdentity";

export interface ContactLink {
  url: string;
  label: string;
  platform: string;
  instruction: string;
}

/**
 * Generate proper contact links from registrar identity
 * These links allow users to directly initiate verification
 */
export function generateContactLinks(identity: RegistrarIdentity, challengeCode?: string): Record<string, ContactLink | null> {
  const links: Record<string, ContactLink | null> = {
    email: null,
    twitter: null,
    matrix: null,
    discord: null,
    github: null,
    web: null,
  };

  // Email - mailto link
  if (identity.email) {
    const subject = encodeURIComponent('Identity Verification');
    const body = challengeCode
      ? encodeURIComponent(`Verification code: ${challengeCode}`)
      : '';
    links.email = {
      url: `mailto:${identity.email}?subject=${subject}&body=${body}`,
      label: identity.email,
      platform: 'Email',
      instruction: challengeCode
        ? `Send email to ${identity.email} with code ${challengeCode}`
        : `Send email to ${identity.email}`,
    };
  }

  // Twitter - direct link to profile or DM
  if (identity.twitter) {
    const handle = identity.twitter.replace('@', '');
    // Twitter DM link format
    links.twitter = {
      url: `https://twitter.com/${handle}`,
      label: `@${handle}`,
      platform: 'Twitter',
      instruction: challengeCode
        ? `Tweet or DM @${handle} with code ${challengeCode}`
        : `Follow or DM @${handle}`,
    };
  }

  // Matrix - matrix.to link for direct PM
  if (identity.matrix) {
    // Extract Matrix ID if it's a full ID (e.g., @user:matrix.org)
    const matrixId = identity.matrix.startsWith('@')
      ? identity.matrix
      : `@${identity.matrix}`;

    links.matrix = {
      url: `https://matrix.to/#/${matrixId}`,
      label: matrixId,
      platform: 'Matrix',
      instruction: challengeCode
        ? `Send DM to ${matrixId} with code ${challengeCode}`
        : `Send DM to ${matrixId}`,
    };
  }

  // Discord - discord link (if username is provided)
  if (identity.discord) {
    // Discord doesn't have direct DM links, just show the username
    links.discord = {
      url: `https://discord.com/users/${identity.discord}`, // This may not work without user ID
      label: identity.discord,
      platform: 'Discord',
      instruction: challengeCode
        ? `DM ${identity.discord} on Discord with code ${challengeCode}`
        : `Find ${identity.discord} on Discord`,
    };
  }

  // GitHub - profile link
  if (identity.github) {
    const username = identity.github.replace('@', '');
    links.github = {
      url: `https://github.com/${username}`,
      label: `@${username}`,
      platform: 'GitHub',
      instruction: 'Create a gist or use GitHub OAuth',
    };
  }

  // Web - direct link to website
  if (identity.web) {
    const url = identity.web.startsWith('http')
      ? identity.web
      : `https://${identity.web}`;

    links.web = {
      url,
      label: identity.web,
      platform: 'Website',
      instruction: 'Add DNS TXT record for verification',
    };
  }

  return links;
}

/**
 * Format a registrar fee for display
 */
export function formatRegistrarFee(fee: bigint, decimals: number, symbol: string): string {
  const feeNum = Number(fee) / Math.pow(10, decimals);

  if (feeNum === 0) {
    return 'Free';
  }

  return `${feeNum.toFixed(4)} ${symbol}`;
}
