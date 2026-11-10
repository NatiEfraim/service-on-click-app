'use client';

import { useMutation } from '@tanstack/react-query';
import { toApiError } from '@/lib/api/client';
import { useToast } from '@/providers/UiProvider';

/** Write-error handling: returns errors the screen shows (422, network); null once handled (409/403/404: toast + reload). */
export async function handleWriteError(error, toast, reload) {
  const apiError = toApiError(error);
  if (apiError.stale || apiError.denied) {
    toast(apiError.message, 'bad');
    await reload?.();
    return null;
  }
  return apiError;
}

/**
 * A save with the console's usual endings: on success a toast, then `reload`, then `onSaved`;
 * on a stale / forbidden answer a toast and `reload` (then `onHandled`); any other error goes to `onFailed`
 * (by default a toast), so a dialog can show it next to its fields instead.
 *
 * @param {object} options
 * @param {(variables: any) => Promise<any>} options.mutationFn
 * @param {string | ((result: any, variables: any) => string)} options.success the toast after saving
 * @param {() => Promise<unknown>} [options.reload] refetches what the save changed
 * @param {(result: any, variables: any) => void} [options.onSaved] after the toast and the reload
 * @param {(error: import('@/lib/api/client').ApiError, variables: any) => void} [options.onFailed] an error to show
 * @param {() => void} [options.onHandled] after a stale / forbidden answer was handled
 */
export function useSaveMutation({ mutationFn, success, reload, onSaved, onFailed, onHandled }) {
  const toast = useToast();
  return useMutation({
    mutationFn,
    onSuccess: async (result, variables) => {
      const message = typeof success === 'function' ? success(result, variables) : success;
      if (message) toast(message, 'ok');
      await reload?.();
      onSaved?.(result, variables);
    },
    onError: async (error, variables) => {
      const shown = await handleWriteError(error, toast, reload);
      if (!shown) {
        onHandled?.();
        return;
      }
      if (onFailed) onFailed(shown, variables);
      else toast(shown.message, 'bad');
    },
  });
}
