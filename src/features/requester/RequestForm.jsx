'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DateRangePicker';
import { EmptyState, ErrorNotice, FormError, Loading } from '@/components/ui/Feedback';
import { Fold } from '@/components/ui/Fold';
import { Icon } from '@/components/ui/Icon';
import { TimePicker } from '@/components/ui/TimePicker';
import { requesterApi } from '@/lib/api/endpoints';
import { validateValue } from '@/lib/form-fields';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { ChoiceField } from './ChoiceField';
import { ATTACH_ACCEPT, choicePath, cleanInput, fetchForm, inputRuleOf, MAX_FILE_BYTES, MAX_FILES, shownFields, submitRequest, todayIso } from './requesterData';
import { markSeen } from './seen';
import { REQUESTER_KEY } from './useRequester';
import { TypePicture } from '@/components/booking/TypePicture';

/** The file types POST /bookings/{id} accepts (jpg, jpeg, png, gif, webp, pdf). */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

/** The error of one field, or '' when its value is fine (the server checks the same again, with the same messages). */
function fieldError(field, raw, typed) {
  const value = String(raw ?? '').trim();
  // a declaration: ticked or not; unticked on a required one is the server's own 'accepted' message
  if (field.kind === 'declaration') return value === '1' || !field.required ? '' : field.rules.messages.accepted ?? field.rules.required ?? 'יש לאשר את ההצהרה';
  if (field.kind === 'select') {
    if (!value) return field.required ? field.rules.required ?? 'שדה חובה' : '';
    const chosen = choicePath(field.options, value).at(-1);
    if (chosen?.children.length) return 'יש לבחור תת-אפשרות';
    if (chosen?.isInput) {
      const text = String(typed ?? '').trim();
      if (!text) return `יש להזין ערך עבור "${chosen.name}"`;
      if (chosen.inputType === 'number' && Number.isNaN(Number(text))) return 'יש להזין מספר';
    }
    return '';
  }
  return validateValue(field.rules, value, { required: field.required, kind: field.inputType }) ?? '';
}

/** Every field to draw, in order: a field, then its sub-fields (indented). */
const flatten = (fields, depth = 0) => fields.flatMap((field) => [{ ...field, depth }, ...flatten(field.children, depth + 1)]);

/**
 * A field's width on the form's grid: its `col_span` on a form designed on four columns (the clearance grant); on the
 * other forms the rule as it always was - two columns, a text area taking the whole row. A sub-field takes the row.
 */
function spanOf(field, columns) {
  if (field.depth || field.kind === 'declaration') return columns;
  if (columns === 4) return Math.min(field.colSpan, 4);
  return field.kind === 'textarea' ? 2 : 1;
}

/** How long after the ID number is complete the person lookup runs: not on every keystroke (20 lookups a minute). */
const LOOKUP_DELAY_MS = 500;
const ID_NUMBER = /^\d{9}$/;

/**
 * One request form, built from GET /requester/form/{id}: breadcrumb, title, the fields the server sends (a select sends
 * its option id), attachments, send (POST /bookings/{id}). Server-side errors (422) show under their own field.
 * A field with `lookup_source: "person"` (the candidate's ID number on the clearance grant, the new user's on פתיחת
 * משתמש) looks the person up once it holds 9 digits and fills the fields whose `autofill_key` the answer carries: a
 * filled field is then locked (the server writes it again on submission), unless the server marks it editable
 * (`autofill_locked: false`, the mobile phone). A field may carry a help line (`hint`), a link beside its label
 * (`help_url`: a declaration may be ticked only once its guidelines were opened) or depend on another field's choice
 * (`depends_on`: shown, and required, only while that choice is picked).
 */
export function RequestForm({ found, onHome, onDone }) {
  const { topic, group, type } = found;
  const form = useQuery({ queryKey: [...REQUESTER_KEY, 'form', type.id], queryFn: ({ signal }) => fetchForm(type.id, signal), staleTime: 5 * 60_000 });
  const allFields = flatten(form.data ?? []);
  const [values, setValues] = useState({});
  // what is drawn and sent now: a field tied to another field's choice (the printer's IP) only while that choice is picked
  const fields = shownFields(allFields, values);
  // the value typed with a chosen "type in a value" choice, by its field id
  const [typed, setTyped] = useState({});
  const [touched, setTouched] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileNote, setFileNote] = useState('');
  // the server's own messages, by field id (values.<id>) and for the files; a field's goes once it is edited
  const [serverErrors, setServerErrors] = useState({});
  // the fields the person lookup filled and locked, and the declarations whose guidelines were opened
  const [locked, setLocked] = useState(() => new Set());
  const [helpSeen, setHelpSeen] = useState(() => new Set());
  const picker = useRef(null);
  // the card is capped at the window's bottom, so only its fields scroll (useFitToWindow)
  const card = useRef(null);
  useFitToWindow(card, 320);
  const client = useQueryClient();
  // a form designed on a 4-column grid (a field's col_span); every other form keeps its two columns
  const columns = fields.some((field) => field.colSpan > 1) ? 4 : 2;

  // the field that looks the person up by their ID number, and what the lookup said last
  const lookupField = fields.find((field) => field.lookupSource === 'person') ?? null;
  const [lookup, setLookup] = useState({ state: 'idle', message: '' });
  const lookedUp = useRef('');
  const lookupValue = lookupField ? String(values[lookupField.id] ?? '').trim() : '';

  const runLookup = async (idNumber) => {
    if (!lookupField || !ID_NUMBER.test(idNumber) || idNumber === lookedUp.current) return;
    lookedUp.current = idNumber;
    setLookup({ state: 'busy', message: 'מאתר פרטים…' });
    try {
      const data = await requesterApi.personLookup(type.id, idNumber);
      if (data?.found && data.person) {
        // every non-empty detail lands in the field whose autofill_key it names and locks it there - the server writes
        // those again on submission; a field marked editable (the mobile phone) and the rest (the rank) stay the user's
        const filled = fields.filter((field) => field.autofillKey && data.person[field.autofillKey] !== null && data.person[field.autofillKey] !== undefined && data.person[field.autofillKey] !== '');
        setValues((previous) => ({ ...previous, ...Object.fromEntries(filled.map((field) => [field.id, String(data.person[field.autofillKey])])) }));
        const lockedNow = filled.filter((field) => field.autofillLocked).map((field) => field.id);
        setLocked(new Set(lockedNow));
        setLookup({ state: 'found', message: lockedNow.length ? 'הפרטים אותרו ומולאו בטופס; מה שמולא מהמאגר נעול, ואת השאר ניתן לתקן לפני השליחה.' : 'הפרטים אותרו ומולאו בטופס; ניתן לתקן אותם לפני השליחה.' });
      } else {
        setLocked(new Set());
        setLookup({ state: 'none', message: data?.message || 'לא נמצאו פרטים עבור תעודת הזהות שהוזנה' });
      }
    } catch (error) {
      // the source is down (503), too many lookups (429) or a refused number (422): the fields stay the user's to fill
      lookedUp.current = '';
      setLocked(new Set());
      setLookup({ state: 'error', message: error?.message || 'שירות איתור הפרטים אינו זמין כעת, ניתן להזין את הפרטים ידנית' });
    }
  };
  useEffect(() => {
    if (!lookupField || !ID_NUMBER.test(lookupValue)) return undefined;
    const timer = window.setTimeout(() => void runLookup(lookupValue), LOOKUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [lookupValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useMutation({
    mutationFn: () => submitRequest(type.id, Object.fromEntries(fields.map((field) => [field.id, values[field.id]])), files, typed),
    onSuccess: (booking) => {
      // the user's own new request is already "seen": it must not stand out as changed
      if (booking?.uuid) markSeen([{ id: booking.uuid, statusId: booking.status_id ?? booking.status?.id }]);
      void client.invalidateQueries({ queryKey: REQUESTER_KEY });
      // the requester API's key is the uuid (the number is for display and search only)
      onDone({ serial: booking?.serial_number ?? '', uuid: booking?.uuid ?? '' });
    },
    onError: (error) => {
      const byField = {};
      for (const [key, messages] of Object.entries(error?.fieldErrors ?? {})) {
        const match = /^(?:option_)?values\.(\d+)/.exec(key);
        if (match) byField[match[1]] = messages[0];
        else if (key.startsWith('files')) byField.files = messages[0];
      }
      setServerErrors(byField);
    },
  });

  const errors = Object.fromEntries(fields.map((field) => [field.id, fieldError(field, values[field.id], typed[field.id])]));
  const valid = fields.every((field) => !errors[field.id]);
  const set = (id, value) => {
    setValues((previous) => ({ ...previous, [id]: value }));
    setServerErrors((previous) => {
      if (!previous[id]) return previous;
      const next = { ...previous };
      delete next[id];
      return next;
    });
    // a new ID number: what the last lookup said no longer applies, and nothing it filled stays locked
    if (lookupField && id === lookupField.id && String(value ?? '').trim() !== lookedUp.current) {
      setLookup({ state: 'idle', message: '' });
      setLocked(new Set());
    }
  };
  // a declaration with guidelines may be ticked only once its link was opened (the link opens in a new tab)
  const openHelp = (id) => setHelpSeen((previous) => new Set(previous).add(id));

  const addFiles = (list) => {
    const picked = Array.from(list ?? []);
    const notes = [];
    let good = picked.filter((file) => ALLOWED_TYPES.includes(file.type));
    if (good.length < picked.length) notes.push('ניתן לצרף תמונות (jpg, png, gif, webp) או PDF בלבד.');
    const small = good.filter((file) => file.size <= MAX_FILE_BYTES);
    if (small.length < good.length) notes.push('גודל קובץ מרבי הוא 10MB.');
    good = small;
    setFiles((previous) => {
      const fresh = good.filter((file) => !previous.some((other) => other.name === file.name && other.size === file.size));
      const room = Math.max(0, MAX_FILES - previous.length);
      if (fresh.length > room) notes.push(`ניתן לצרף עד ${MAX_FILES} קבצים.`);
      return [...previous, ...fresh.slice(0, room)];
    });
    setFileNote(notes.join(' '));
    setServerErrors((previous) => ({ ...previous, files: undefined }));
  };

  // every send attempt flashes the invalid fields again (its parity swaps the glow's name, which restarts it)
  const [attempts, setAttempts] = useState(0);
  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
    setAttempts((count) => count + 1);
    // POST /bookings/{id} is not idempotent: never send twice
    if (valid && !send.isPending) send.mutate();
  };

  const head = (
    <>
      {/* back to the topics, as the management screens' "חזרה" button */}
      <button type="button" className="btn sm ghost back" onClick={onHome}>
        <Icon name="right" />
        חזרה לדף הבית
      </button>
      <nav className="rq-crumbs" aria-label="מיקום">
        <button type="button" className="rq-link" onClick={onHome}>דף הבית</button>
        <span aria-hidden>›</span>
        <span>{topic.name}</span>
        <span aria-hidden>›</span>
        <span>{group.name}</span>
        <span aria-hidden>›</span>
        <b aria-current="page">{type.name}</b>
      </nav>
    </>
  );

  return (
    <form className="rq-form" onSubmit={submit} noValidate>
      {head}
      {/* fitted to the window: the title stays on top, the fields scroll, the send bar stays at the bottom */}
      <section ref={card} className="card fit-card rq-form-card">
        <div className="rq-form-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="ic"><TypePicture typeId={type.id} src={type.img} /></span>
          <div>
            <h1>{type.name}</h1>
            {type.description ? <p className="muted">{type.description}</p> : null}
          </div>
        </div>
        {form.isPending ? (
          <div className="card-body"><Loading rows={6} /></div>
        ) : form.isError ? (
          <div className="card-body"><ErrorNotice error={form.error} title="לא ניתן לטעון את הטופס." onRetry={() => void form.refetch()} /></div>
        ) : !fields.length ? (
          <EmptyState title="לטופס זה אין שדות ביחידה שלך">לא ניתן לפתוח בו קריאה כרגע. פנו למנהל המערכת.</EmptyState>
        ) : (
          <>
            <div className="fit-fill scroll-y rq-form-scroll">
            <div className="rq-fields" data-flash={attempts % 2} style={{ '--rq-cols': columns }}>
              {fields.map((field) => {
                const error = serverErrors[field.id] || (touched ? errors[field.id] : '');
                const isLookup = lookupField !== null && field.id === lookupField.id;
                // filled by the person lookup and kept as the source says it (the server writes it again on submission)
                const isLocked = locked.has(field.id);
                // a declaration with guidelines waits for them to be opened
                const needsHelp = field.kind === 'declaration' && field.helpUrl !== null && !helpSeen.has(field.id);
                // what may be typed here (digits, letters, allowed characters...); the rest is dropped as it is typed
                const rule = inputRuleOf(field.fieldName);
                // a text's length limit: the field's own rule, else the server's `max` (on a number field `max` is a value)
                const lengthCap = rule?.max ?? (field.inputType !== 'number' ? field.rules.max ?? undefined : undefined);
                const today = todayIso();
                const props = {
                  id: `rq-${field.id}`,
                  value: values[field.id] ?? '',
                  onChange: (event) => set(field.id, cleanInput(rule, event.target.value)),
                  'aria-invalid': error ? true : undefined,
                  'aria-required': field.required || undefined,
                  dir: field.ltr ? 'ltr' : undefined,
                  // the ID number: looked up as soon as the field is left (the pause after typing does it too)
                  ...(isLookup ? { onBlur: (event) => void runLookup(event.target.value.trim()), inputMode: 'numeric', autoComplete: 'off' } : {}),
                  // the length cap; a number field gets the numeric keypad; numbers, paths, names of computers go left to right
                  ...(lengthCap ? { maxLength: lengthCap } : {}),
                  ...(rule?.digits ? { inputMode: 'numeric' } : {}),
                  ...(rule?.digits || rule?.ltr ? { dir: 'ltr' } : {}),
                  ...(isLocked ? { readOnly: true, 'aria-readonly': true, 'aria-describedby': `rq-${field.id}-lock` } : {}),
                };
                return (
                  <div
                    key={field.id}
                    className={`field${field.depth ? ' sub' : ''}${isLocked ? ' rq-locked' : ''}`}
                    style={{ gridColumn: `span ${spanOf(field, columns)}`, ...(field.depth ? { paddingInlineStart: field.depth * 18 } : {}) }}
                  >
                    <label htmlFor={props.id}>
                      {field.label}
                      {field.required ? <span className="req" aria-hidden> *</span> : null}
                      {/* filled from the registry by the ID number: marked, and read only */}
                      {isLocked ? <span id={`rq-${field.id}-lock`} className="rq-lock" data-tip="מולא מהמאגר לפי תעודת הזהות ואינו ניתן לעריכה">מולא מהמאגר</span> : null}
                      {/* the guidelines behind the field (the infosec guidelines of a new user), in a new tab */}
                      {field.helpUrl ? (
                        <a className="rq-help" href={field.helpUrl} target="_blank" rel="noopener noreferrer" onClick={() => openHelp(field.id)}>
                          <Icon name="file" />
                          להנחיות
                        </a>
                      ) : null}
                    </label>
                    {field.kind === 'declaration' ? (
                      // the label above is the declaration's text; the box under it ticks it (sent as "1"), once its guidelines were opened
                      <label className={`rq-declare${needsHelp ? ' waiting' : ''}`} data-tip={needsHelp ? 'יש לפתוח את ההנחיות לפני האישור' : undefined}>
                        <input type="checkbox" id={props.id} checked={values[field.id] === '1'} disabled={needsHelp} onChange={(event) => set(field.id, event.target.checked ? '1' : '')} aria-invalid={Boolean(error) || undefined} />
                        מאשר/ת
                      </label>
                    ) : field.kind === 'textarea' ? (
                      <>
                        <textarea className="input" rows={4} {...props} />
                        {/* how much of its limit a long text has used */}
                        {lengthCap ? <span className="rq-count" aria-hidden>{String(values[field.id] ?? '').length} / {lengthCap}</span> : null}
                      </>
                    ) : field.kind === 'select' ? (
                      <ChoiceField
                        id={props.id}
                        field={field}
                        value={values[field.id] ?? ''}
                        typed={typed[field.id] ?? ''}
                        invalid={Boolean(error)}
                        onChange={(value) => set(field.id, value)}
                        onTyped={(value) => setTyped((previous) => ({ ...previous, [field.id]: value }))}
                      />
                    ) : field.inputType === 'date' ? (
                      // the app's own calendar (not the browser's); its value is 'YYYY-MM-DD' as the API expects
                      // an "until" cannot be in the past, an incident not in the future: those days are disabled in the calendar
                      <DatePicker
                        value={values[field.id] ?? ''}
                        onChange={(day) => set(field.id, day ?? '')}
                        label={field.label}
                        min={rule?.notBefore === 'today' ? today : undefined}
                        max={rule?.notAfter === 'today' ? today : undefined}
                      />
                    ) : field.inputType === 'time' ? (
                      <TimePicker value={values[field.id] ?? ''} onChange={(time) => set(field.id, time ?? '')} label={field.label} invalid={Boolean(error)} />
                    ) : (
                      <input className="input" type={field.inputType} {...props} />
                    )}
                    {/* the server's help line under the field ("יש להזין כך: ..."); a declaration says what it waits for */}
                    {field.hint ? <span className="rq-hint">{field.hint}</span> : null}
                    {needsHelp ? <span className="rq-hint">יש לפתוח את ההנחיות (הקישור ליד הכותרת) לפני סימון ההצהרה.</span> : null}
                    {/* the field's error and the lookup's word fold in and out (Fold), so the form around them glides */}
                    <Fold show={Boolean(error)}>
                      <span className="rq-err">{error}</span>
                    </Fold>
                    {/* what the person lookup said: found and filled, not found, or not available right now */}
                    <Fold show={isLookup && lookup.state !== 'idle'}>
                      <span className={`rq-lookup ${lookup.state}`} aria-live="polite">{lookup.message}</span>
                    </Fold>
                  </div>
                );
              })}
              <div className="field wide">
                <span className="label">קבצים מצורפים</span>
                <div
                  className="rq-drop"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}
                >
                  <Button size="sm" icon="clip" onClick={() => picker.current?.click()} disabled={files.length >= MAX_FILES}>צירוף קבצים</Button>
                  <span className="small muted">תמונות או PDF, עד {MAX_FILES} קבצים, עד 10MB כל אחד (לא חובה)</span>
                  <input ref={picker} type="file" hidden multiple accept={ATTACH_ACCEPT} onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
                </div>
                {fileNote || serverErrors.files ? <span className="rq-err">{serverErrors.files || fileNote}</span> : null}
                {files.length ? (
                  <ul className="rq-files">
                    {files.map((file) => (
                      <li key={`${file.name}-${file.size}`}>
                        <Icon name={file.type === 'application/pdf' ? 'file' : 'image'} />
                        <span>{file.name}</span>
                        <button type="button" aria-label={`הסרת ${file.name}`} onClick={() => setFiles((previous) => previous.filter((other) => other !== file))}>
                          <Icon name="x" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            </div>
            {/* outside the scroll: the error and the send bar stay in view whatever the fields' length */}
            <FormError>{send.isError ? send.error?.message ?? 'שליחת הקריאה נכשלה.' : ''}</FormError>
            <div className="rq-actions">
              <Button type="submit" className="rq-send" icon="check" loading={send.isPending}>שליחת הקריאה</Button>
              <Button variant="ghost" onClick={onHome} disabled={send.isPending}>ביטול</Button>
              <span className="grow" />
              <span className="small muted">שדות המסומנים ב-* הם חובה</span>
            </div>
          </>
        )}
      </section>
    </form>
  );
}
