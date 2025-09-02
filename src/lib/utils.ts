import { AllowedFields, PossibleDisplayedOutputs } from "@/types/search_fields"
import { todo } from "node:test"

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

export const constructSearcObject = (query: string, desierdOutputs: string[] = PossibleDisplayedOutputs): any => {
  const parseSearchString = (input: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const regex = /(\w+):\s*([^:]+?)(?=\s+\w+:|\s*$)/g;
    let match;

    while ((match = regex.exec(input)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();

      if (key && value !== undefined) {
        if (AllowedFields.includes(key.toLowerCase()) || key.toLowerCase() === "network" || key.toLowerCase() === "result_size") {
          result[key] = value;
        }
      }
    }

    return result;
  }

  const pairs = parseSearchString(query);
  const result_size = pairs["result_size"] ? parseInt(pairs["result_size"]) : 8;
  delete pairs.network;
  delete pairs.result_size;
  const outputs: string[] = Array.from(desierdOutputs)


  // TODO: handle wrong search keys
  const filtersFields = Object.keys(pairs)
    .map(key => {
      if (mapSearchKey(key) != null) {
        return {
          // ?? is fine since we are guarenteed a string by the if guard
          field: { [mapSearchKey(key) ?? ""]: pairs[key] },
          strict: false, // Default for now
        }
      } else {
        // TODO: handle wrong search keys
      }
    });

  var search_obj = {
    version: "1.0",
    type: "SearchRegistration",
    payload: {
      outputs: outputs,
      filters: {
        fields: filtersFields,
        result_size: result_size,
      }
    }
  };

  if (pairs["network"]) { search_obj["network"] = pairs["network"] }

  return search_obj
}
