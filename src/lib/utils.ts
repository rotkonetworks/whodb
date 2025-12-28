import { AllowedFields, PossibleDisplayedOutputs } from "@/types/search_fields"

/**
 * Shortens a blockchain address by showing only the beginning and end parts
 * @param address The full blockchain address
 * @param startChars Number of characters to show at the beginning
 * @param endChars Number of characters to show at the end
 * @returns Shortened address string
 */
export function shortenAddress(address: string, startChars = 8, endChars = 8): string {
  if (!address) return ""
  if (address.length <= startChars + endChars) return address

  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`
}

export function mapSearchKey(key: string): string | null {
  switch (key) {
    case "discord":
      return "Discord"
    case "id":
      return "AccountId32"
    case "twitter":
      return "Twitter"
    case "x":
      return "Twitter"
    case "matrix":
      return "Matrix"
    case "web":
      return "Web"
    case "email":
      return "Email"
    case "network":
      return "Network"
    case "pgp":
      return "PGPFingerprint"
    case "github":
      return "Github"
    case "display_name":
      return "Display"
    default:
      return null
  }
}

/**
 * Utility function to join class names conditionally
 */
export function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ")
}

export const constructSearchObject = (query: string, desiredOutputs: string[] = PossibleDisplayedOutputs): any => {
  const parseSearchString = (input: string): { structuredFields: Record<string, string>, genericTerms: string } => {
    const result: Record<string, string> = {};
    const regex = /(\w+):\s*(\S+)/g;
    let match;
    let lastIndex = 0;
    const genericTerms: string[] = [];

    while ((match = regex.exec(input)) !== null) {
      // Extract any text before this match as generic terms
      if (match.index > lastIndex) {
        const beforeMatch = input.substring(lastIndex, match.index).trim();
        if (beforeMatch) {
          genericTerms.push(beforeMatch);
        }
      }

      const key = match[1].trim();
      const value = match[2].trim();

      if (key && value !== undefined && AllowedFields.includes(key.toLowerCase())) {
        result[key] = value;
      }

      lastIndex = regex.lastIndex;
    }

    // Extract any remaining text after the last match as generic terms
    if (lastIndex < input.length) {
      const afterLastMatch = input.substring(lastIndex).trim();
      if (afterLastMatch) {
        genericTerms.push(afterLastMatch);
      }
    }

    // If no structured fields found and no generic terms collected yet, treat the entire input as generic
    if (Object.keys(result).length === 0 && genericTerms.length === 0 && input.trim()) {
      genericTerms.push(input.trim());
    }

    return {
      structuredFields: result,
      genericTerms: genericTerms.join(' ').trim()
    };
  }

  const { structuredFields, genericTerms } = parseSearchString(query);
  const result_size = structuredFields["result_size"] ? parseInt(structuredFields["result_size"]) : 8;
  const network = structuredFields["network"];
  delete structuredFields.network;
  delete structuredFields.result_size;
  const outputs: string[] = Array.from(desiredOutputs)

  // Build filters array starting with Generic field if we have generic terms
  const filtersFields = [];

  // Add Generic field for uncategorized terms
  if (genericTerms) {
    filtersFields.push({
      field: { "Generic": genericTerms },
      strict: false
    });
  }

  // Add structured field filters
  Object.keys(structuredFields).forEach(key => {
    if (mapSearchKey(key) !== null) {
      filtersFields.push({
        field: { [mapSearchKey(key) ?? ""]: structuredFields[key] },
        strict: false
      });
    }
    // TODO: handle wrong search keys
  });

  var search_obj = {
    version: "1.1",
    type: "SearchRegistration",
    payload: {
      network: network || null,
      outputs: outputs,
      filters: {
        fields: filtersFields,
        result_size: result_size,
        time: null
      }
    }
  };

  return search_obj
}
