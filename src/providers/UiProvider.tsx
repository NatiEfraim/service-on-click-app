'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cssTransition, toast as toastify, ToastContainer } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/** As in Rio: a toast rises from below while fading in, and fades out in place (keyframes in components.css). */
const RiseFade = cssTransition({ enter: 'toast-rise-in', exit: 'toast-fade-out', collapseDuration: 180 });

/** Toastify's own look (white card, coloured icon, close button, progress bar), same as Rio. */
const toast: ToastFn = (message, kind = '') => {
  if (kind === 'ok') toastify.success(message);
  else if (kind === 'bad') toastify.error(message);
  else toastify.info(message);
};

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

export function UiProvider({ children }: { children: ReactNode }) {
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

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <ToastContainer position="bottom-left" autoClose={2500} rtl stacked pauseOnFocusLoss={false} transition={RiseFade} />
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
