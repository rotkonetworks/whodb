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
