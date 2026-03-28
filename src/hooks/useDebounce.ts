import { useState, useEffect } from 'react';

/**
 * useDebounce
 * Returns a debounced value that only updates after `delay` ms have elapsed
 * since the last change. Useful for reducing API calls on free‑typing.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}
