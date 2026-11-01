'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/** Toasts and a promise-based confirmation dialog, available everywhere under the providers. */

export type ToastKind = 'ok' | 'bad' | '';
type ToastFn = (message: string, kind?: ToastKind) => void;

export interface ConfirmOptions {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
}
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ToastContext = createContext<ToastFn>(() => {});
const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback<ToastFn>((message, kind = '') => {
    const id = nextId.current++;
    setToasts((items) => [...items, { id, message, kind }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 5000);
  }, []);

  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (answer: boolean) => void } | null>(null);
  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending({ options, resolve });
      }),
    [],
  );

  const answer = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const toastValue = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={toastValue}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <div className="toasts" aria-live="polite">
          {toasts.map((item) => (
            <div key={item.id} className={`toast ${item.kind}`.trim()} role="status">
              {item.message}
            </div>
          ))}
        </div>
        {pending ? (
          <Modal
            title={pending.options.title}
            onClose={() => answer(false)}
            footer={
              <>
                <Button variant={pending.options.tone === 'danger' ? 'danger-solid' : 'primary'} onClick={() => answer(true)}>
                  {pending.options.confirmLabel ?? 'אישור'}
                </Button>
                <Button onClick={() => answer(false)}>{pending.options.cancelLabel ?? 'ביטול'}</Button>
              </>
            }
          >
            {typeof pending.options.body === 'string' ? <p style={{ margin: 0 }}>{pending.options.body}</p> : pending.options.body}
          </Modal>
        ) : null}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastFn => useContext(ToastContext);
export const useConfirm = (): ConfirmFn => useContext(ConfirmContext);
