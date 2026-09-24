import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async function on mount / when deps change and tracks loading + error state. */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Something went wrong' }));
      return null;
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}
