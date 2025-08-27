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

/**
 * Utility function to join class names conditionally
 */
export function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ")
}

export const constructSearcObject = (query: string): any => {
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

  const toPascalCase = (s: string) => s.replace(/_(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, (c) => c.toUpperCase());

  const outputs: string[] = Array.from(PossibleDisplayedOutputs).map(key => toPascalCase(key))


  const filtersFields = Object.keys(pairs)
    .map(key => ({
      field: { [toPascalCase(key)]: "%" + pairs[key] + "%" },
      strict: false, // Default to strict for now
    }));

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
