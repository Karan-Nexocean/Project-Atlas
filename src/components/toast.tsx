import React, { createContext, useContext, useMemo, useState } from 'react';

type Toast = { id: string; kind: 'success' | 'error' | 'info'; text: string };
type ToastCtx = { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void };

const Ctx = createContext<ToastCtx | null>(null);

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const api = useMemo<ToastCtx>(() => ({
    success: (text) => push('success', text),
    error: (text) => push('error', text),
    info: (text) => push('info', text),
  }), []);

  function push(kind: Toast['kind'], text: string) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts((arr) => [...arr, { id, kind, text }]);
    setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), 2600);
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[80] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-xl shadow-lg px-3 py-2 text-sm text-white ${
            t.kind === 'success' ? 'bg-emerald-600' : t.kind === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
};

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) return { success: () => {}, error: () => {}, info: () => {} };
  return v;
}

