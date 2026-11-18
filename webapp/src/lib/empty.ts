/**
 * Stable stand-in for "query not loaded yet". `useLiveQuery(...) ?? []` creates a new
 * array on every render, which makes any useMemo/useEffect that depends on the result
 * re-run each time; this one has a fixed identity.
 */
export const EMPTY: never[] = Object.freeze([]) as unknown as never[];
