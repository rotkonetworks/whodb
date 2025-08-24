// shortenAddress moved to @/utils/format-address for consolidation

/**
 * Utility function to join class names conditionally
 */
export function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ")
}
