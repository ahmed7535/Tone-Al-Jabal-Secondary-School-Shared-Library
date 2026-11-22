'use client';
import { useCallback, useEffect, useState } from 'react';

/* تحميل بيانات غير متزامن مع حالة تحميل وخطأ وإعادة تحميل */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, loading: true, error: null }));
    Promise.resolve().then(fn).then(
      data => { if (alive) setState({ loading: false, data, error: null }); },
      error => { console.error(error); if (alive) setState({ loading: false, data: null, error }); }
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ...deps]);
  const reload = useCallback(() => setN(x => x + 1), []);
  return { ...state, reload };
}
