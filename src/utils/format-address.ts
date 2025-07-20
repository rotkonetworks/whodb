/**
 * Shortens a wallet address for display purposes
 * @param address The full wallet address
 * @param startLength Number of characters to show at the start
 * @param endLength Number of characters to show at the end
 * @returns Shortened address with ellipsis in the middle
 */
export function shortenAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!address) return ""
  if (address.length <= startLength + endLength) return address
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}
