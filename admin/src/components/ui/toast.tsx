import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastValue = {
  id: number;
  title: string;
  description?: string | undefined;
};

type ToastContextValue = {
  pushToast: (title: string, description?: string | undefined) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastValue[]>([]);

  const pushToast = useCallback((
    title: string,
    description?: string | undefined
  ) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, title, description }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-50 flex w-80 flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] p-4 shadow-lg"
          >
            <div className="font-semibold text-[color:var(--dd-text)]">{toast.title}</div>
            {toast.description ? (
              <div className="mt-1 text-sm text-[color:var(--dd-muted)]">
                {toast.description}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
