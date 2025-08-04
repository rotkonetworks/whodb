import { useEffect, useRef } from "react";

/**
 * A debugging hook that logs whenever a value changes, helping to diagnose rendering loops.
 * 
 * This hook tracks how many times a value has changed and logs both the count and the current value.
 * Particularly useful for identifying unexpected re-renders or dependency changes that might cause
 * rendering loops when passed as dependencies to other hooks.
 * 
 * @param value - The value to monitor for changes (can be used to diagnose rendering loops by passing dependencies to it)
 * @param name - A descriptive name for the log entry to help identify the source
 * 
 * @example
 * ```typescript
 * // Monitor a state value that might be causing re-renders
 * const [count, setCount] = useState(0);
 * useTriggerLog(count, 'count-state');
 * 
 * // Monitor dependencies that might cause infinite loops
 * const memoizedValue = useMemo(() => computeValue(), [dependency]);
 * useTriggerLog(dependency, 'memo-dependency');
 * ```
 */
export const useTriggerLog = (value: any, name: string) => {
  const times = useRef(0);
  useEffect(() => {
    times.current += 1;
    console.debug(`useTriggerLog [${name}] times: ${times.current}, value:`, value);
  }, [value]);
};
