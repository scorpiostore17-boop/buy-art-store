import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);

  const dismiss = useCallback((tid) => setToasts((t) => t.filter((x) => x.id !== tid)), []);
  const push = useCallback(
    (type, message, ms = 3800) => {
      const tid = ++id.current;
      setToasts((t) => [...t.slice(-3), { id: tid, type, message }]);
      setTimeout(() => dismiss(tid), ms);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m, 5500),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status" onClick={() => dismiss(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
