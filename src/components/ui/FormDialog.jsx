'use client';

import { useRef } from 'react';
import { useConfirm } from '@/providers/UiProvider';
import { Button } from './Button';
import { Modal } from './Modal';

/**
 * A dialog with the console's usual footer: the action button (spinner while `busy`) and "ביטול".
 * Closing (ביטול, Escape, a click outside) is blocked while `busy`; with `dirty`, it first asks before dropping the changes.
 * The action is `onSubmit`, or with `formId` the button submits that <form> (so Enter in a field submits too).
 */
export function FormDialog({
  title,
  onClose,
  busy = false,
  dirty = false,
  submitLabel = 'שמירה',
  submitVariant = 'primary',
  submitDisabled = false,
  onSubmit,
  formId,
  wide,
  initialFocus,
  children,
}) {
  const confirm = useConfirm();
  const asking = useRef(false);

  async function requestClose() {
    if (busy || asking.current) return;
    if (!dirty) {
      onClose();
      return;
    }
    asking.current = true;
    const ok = await confirm({
      title: 'לסגור בלי לשמור?',
      body: 'השינויים שעשיתם בחלון הזה לא נשמרו ויאבדו.',
      confirmLabel: 'סגירה בלי שמירה',
      cancelLabel: 'המשך עריכה',
      tone: 'danger',
    });
    asking.current = false;
    if (ok) onClose();
  }

  return (
    <Modal
      title={title}
      onClose={requestClose}
      busy={busy}
      wide={wide}
      initialFocus={initialFocus}
      footer={
        <>
          <Button
            variant={submitVariant}
            loading={busy}
            disabled={submitDisabled}
            {...(formId ? { type: 'submit', form: formId } : { onClick: onSubmit })}
          >
            {submitLabel}
          </Button>
          <Button onClick={requestClose} disabled={busy}>
            ביטול
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
