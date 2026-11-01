'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { settingsApi } from '@/lib/api/endpoints';
import type { Settings, SystemReference } from '@/lib/api/types';
import { useToast } from '@/providers/UiProvider';
import { draftFromValue, draftProblems, draftToValue, isDatesReference, isDraftDirty, refInputKind, refKeyLabel, type RefDraft } from './refs';
import { Switch } from './Switch';
import { handleWriteError, useReloadSettings } from './useSettings';

function RefRow({ reference, bookingTypeId, unitId, readOnly }: { reference: SystemReference; bookingTypeId: number; unitId: number; readOnly: boolean }) {
  const toast = useToast();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const [draft, setDraft] = useState<RefDraft>(() => draftFromValue(reference.value));
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<Record<string, string>>({});

  // sync inputs with the server value, adjusted during render
  const serverKey = JSON.stringify(reference.value);
  const [seenKey, setSeenKey] = useState(serverKey);
  if (serverKey !== seenKey) {
    setSeenKey(serverKey);
    setDraft(draftFromValue(reference.value));
    setProblems({});
  }

  const dirty = isDraftDirty(reference.value, draft);

  const mutation = useMutation({
    mutationFn: () => settingsApi.saveSystemReferences(bookingTypeId, { [reference.id]: draftToValue(reference.value, draft) }),
    onSuccess: async () => {
      toast('ההגדרה נשמרה ונרשמה בהיסטוריית השינויים.', 'ok');
      await reload();
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) setError(shown.message);
    },
  });

  function save() {
    const found = draftProblems(reference.value, draft);
    setProblems(found);
    if (Object.keys(found).length) return;
    setError('');
    mutation.mutate();
  }

  function change(key: string, value: string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
    if (problems[key]) setProblems((current) => ({ ...current, [key]: '' }));
  }

  return (
    <div className={`setting${dirty && !readOnly ? ' dirty' : ''}${readOnly ? ' st-locked-row' : ''}`}>
      <div className="what">
        <b>{reference.title}</b>
        {reference.description ? <span>{reference.description}</span> : null}
      </div>
      <div className="vals">
        {Object.entries(reference.value).map(([key, current]) => {
          const kind = refInputKind(key, current);
          const value = draft[key];
          const label = refKeyLabel(key);
          if (kind === 'boolean') {
            return (
              <div key={key} className="st-bool">
                <Switch checked={value === true} disabled={readOnly} onChange={(checked) => change(key, checked)}>
                  {label}
                </Switch>
              </div>
            );
          }
          const problem = problems[key];
          return (
            <label key={key} className="field">
              <span>{label}</span>
              <input
                className="input"
                type={kind === 'number' ? 'number' : kind === 'time' ? 'time' : kind === 'phone' ? 'tel' : 'text'}
                {...(kind === 'number' ? { min: 1, step: 1, inputMode: 'numeric' as const } : {})}
                {...(kind === 'phone' ? { dir: 'ltr' as const } : {})}
                style={{ width: kind === 'phone' ? 150 : 110 }}
                value={typeof value === 'string' ? value : ''}
                disabled={readOnly}
                aria-invalid={problem ? true : undefined}
                title={problem || undefined}
                onChange={(event) => change(key, event.target.value)}
              />
            </label>
          );
        })}
        {!readOnly ? (
          <Button size="sm" variant="primary" className="save" loading={mutation.isPending} onClick={save}>
            שמירה
          </Button>
        ) : null}
      </div>
      {Object.values(problems).some(Boolean) || error ? (
        <div className="err" role="alert">
          {error || Object.entries(problems)
            .filter(([, text]) => text)
            .map(([key, text]) => `${refKeyLabel(key)}: ${text}`)
            .join(' · ')}
        </div>
      ) : null}
    </div>
  );
}

/** Operating settings. The server saves only the user's own unit, so other units are read-only. */
export function OperationsTab({ unitId, bookingTypeId, settings, ownUnit }: { unitId: number; bookingTypeId: number; settings: Settings; ownUnit: boolean }) {
  const references = settings.system_references.filter((reference) => !isDatesReference(reference));
  return (
    <div>
      {!ownUnit ? (
        <div className="st-readonly-bar">
          <Notice>ניתן לערוך הגדרות תפעול ליחידה שלך בלבד. כאן מוצגים הערכים של היחידה שנבחרה.</Notice>
        </div>
      ) : null}
      {references.length ? (
        references.map((reference) => <RefRow key={reference.id} reference={reference} bookingTypeId={bookingTypeId} unitId={unitId} readOnly={!ownUnit} />)
      ) : (
        <EmptyState title="אין הגדרות תפעול לתחום זה" />
      )}
    </div>
  );
}
