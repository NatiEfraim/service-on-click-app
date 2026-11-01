'use client';

import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Seg } from '@/components/ui/Controls';
import { settingsApi } from '@/lib/api/endpoints';
import type { Settings } from '@/lib/api/types';
import { useToast } from '@/providers/UiProvider';
import { statementError, statementFromServer } from './statement';
import { Switch } from './Switch';
import { handleWriteError, useReloadSettings } from './useSettings';

type ShowTime = '0' | '1';

/** "הצהרה": the text the requester must agree to, when it appears (as the form opens / when it is sent), and whether it is on. */
export function StatementTab({ unitId, bookingTypeId, settings }: { unitId: number; bookingTypeId: number; settings: Settings }) {
  const toast = useToast();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const ids = useId();
  const canEdit = settings.can_edit_global;
  const server = settings.statement;

  const serverText = statementFromServer(server?.statement);
  const [text, setText] = useState(serverText);
  const [active, setActive] = useState(server?.is_active ?? false);
  const [showTime, setShowTime] = useState<ShowTime>(String(server?.show_time ?? 1) as ShowTime);
  const [problem, setProblem] = useState('');
  const [error, setError] = useState('');

  // follow the server after a save, or somebody else's change - adjusted during render
  const serverKey = JSON.stringify([serverText, server?.is_active ?? false, server?.show_time ?? 1]);
  const [seenKey, setSeenKey] = useState(serverKey);
  if (serverKey !== seenKey) {
    setSeenKey(serverKey);
    setText(serverText);
    setActive(server?.is_active ?? false);
    setShowTime(String(server?.show_time ?? 1) as ShowTime);
  }

  const dirty = text !== serverText || active !== (server?.is_active ?? false) || Number(showTime) !== (server?.show_time ?? 1);
  const placeholders = settings.system_references.flatMap((reference) => Object.keys(reference.value)).filter((key) => key === 'haircut_time' || key === 'clean_time');

  const mutation = useMutation({
    mutationFn: () => settingsApi.saveStatement(unitId, bookingTypeId, { statement: text.trim() === '' ? null : text.trim(), is_active: active, show_time: Number(showTime) as 0 | 1 }),
    onSuccess: async () => {
      toast('ההצהרה נשמרה ונרשמה בהיסטוריית השינויים.', 'ok');
      await reload();
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) setError(shown.message);
    },
  });

  function save() {
    const found = statementError(text, active);
    setProblem(found ?? '');
    if (found) return;
    setError('');
    mutation.mutate();
  }

  return (
    <div className="st-panel-body st-statement">
      {!canEdit ? <span className="small muted">עריכת הצהרות שמורה למנהל מערכת.</span> : null}
      <label className="field">
        <span>נוסח ההצהרה שמוצגת למבקש</span>
        <textarea
          className="input"
          rows={5}
          value={text}
          disabled={!canEdit}
          aria-invalid={problem ? true : undefined}
          aria-describedby={`${ids}-err`}
          placeholder={canEdit ? 'אין הצהרה' : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setProblem('');
          }}
        />
      </label>
      <div id={`${ids}-err`} className="err" aria-live="polite">
        {problem}
      </div>
      {placeholders.length ? (
        <span className="small muted">
          אפשר לשלב בנוסח ערכים מהגדרות התפעול:{' '}
          {placeholders.map((key) => (
            <span key={key} className="serial ltr" style={{ marginInlineEnd: 8 }}>{`{${key}}`}</span>
          ))}
        </span>
      ) : null}
      <div className="row">
        <Switch checked={active} disabled={!canEdit} onChange={(checked) => { setActive(checked); setProblem(''); }}>
          הצהרה פעילה
        </Switch>
        <Seg<ShowTime>
          label="מתי ההצהרה מוצגת"
          value={showTime}
          onChange={canEdit ? setShowTime : () => {}}
          options={[
            { value: '0', label: 'בפתיחת הטופס' },
            { value: '1', label: 'בשליחת הטופס' },
          ]}
        />
        {canEdit ? (
          <Button variant="primary" style={{ marginInlineStart: 'auto' }} disabled={!dirty} loading={mutation.isPending} onClick={save}>
            שמירה
          </Button>
        ) : null}
      </div>
      {error ? (
        <div className="err" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
