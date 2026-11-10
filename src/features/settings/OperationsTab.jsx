'use client';

import { useState } from 'react';
import { TimePicker } from '@/components/ui/TimePicker';
import { Button } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { settingsApi } from '@/lib/api/endpoints';
import { useSaveMutation } from '@/lib/useSaveMutation';

import { draftFromValue, draftProblems, draftToValue, isDatesReference, isDraftDirty, refInputKind, refKeyLabel } from './refs';
import { Switch } from './Switch';
import { useReloadSettings } from './useSettings';

function RefRow({ reference, bookingTypeId, unitId, readOnly }) {
  const reload = useReloadSettings(unitId, bookingTypeId);
  const [draft, setDraft] = useState(() => draftFromValue(reference.value));
  const [error, setError] = useState('');
  const [problems, setProblems] = useState({});

  // sync inputs with the server value, adjusted during render
  const serverKey = JSON.stringify(reference.value);
  const [seenKey, setSeenKey] = useState(serverKey);
  if (serverKey !== seenKey) {
    setSeenKey(serverKey);
    setDraft(draftFromValue(reference.value));
    setProblems({});
  }

  const dirty = isDraftDirty(reference.value, draft);

  const mutation = useSaveMutation({
    mutationFn: () => settingsApi.saveSystemReferences(bookingTypeId, { [reference.id]: draftToValue(reference.value, draft) }),
    success: 'ההגדרה נשמרה ונרשמה בהיסטוריית השינויים.',
    reload,
    onFailed: (shown) => setError(shown.message),
  });

  function save() {
    const found = draftProblems(reference.value, draft);
    setProblems(found);
    if (Object.keys(found).length) return;
    setError('');
    mutation.mutate();
  }

  function change(key, value) {
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
          if (kind === 'time') return <div key={key} className="field"><span>{label}</span><TimePicker label={label} value={typeof value === 'string' ? value : ''} onChange={(time) => change(key, time)} disabled={readOnly} invalid={Boolean(problem)} title={problem || undefined} /></div>;
          return (
            <label key={key} className="field">
              <span>{label}</span>
              <input
                className="input"
                type={kind === 'number' ? 'number' : kind === 'time' ? 'time' : kind === 'phone' ? 'tel' : 'text'}
                {...(kind === 'number' ? { min: 1, step: 1, inputMode: 'numeric', dir: 'ltr' } : {})}
                {...(kind === 'phone' ? { dir: 'ltr', inputMode: 'numeric', maxLength: 10, pattern: '[0-9]{1,10}' } : {})}
                style={{ width: kind === 'phone' ? 150 : 110, textAlign: kind === 'number' ? 'right' : undefined }}
                value={typeof value === 'string' ? value : ''}
                disabled={readOnly}
                aria-invalid={problem ? true : undefined}
                title={problem || undefined}
                onChange={(event) => change(key, kind === 'phone' ? event.target.value.replace(/[^0-9]/g, '').slice(0, 10) : event.target.value)}
              />
            </label>
          );
        })}
        {!readOnly ? (
          <div className="st-operation-save"><Button size="sm" variant="primary" className="save" loading={mutation.isPending} onClick={save}>
            שמירה
          </Button></div>
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
export function OperationsTab({ unitId, bookingTypeId, settings, ownUnit }) {
  const references = settings.system_references.filter((reference) => !isDatesReference(reference));
  return (
    <div className="st-readable-settings">
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
