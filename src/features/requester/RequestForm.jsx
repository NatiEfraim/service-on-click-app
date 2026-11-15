'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { hasTypeIcon, TypeIcon } from '@/components/booking/TypeIcon';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DateRangePicker';
import { EmptyState, ErrorNotice, FormError, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { TimePicker } from '@/components/ui/TimePicker';
import { ATTACH_ACCEPT, fetchForm, MAX_FILE_BYTES, MAX_FILES, submitRequest } from './requesterData';
import { markSeen } from './seen';
import { REQUESTER_KEY } from './useRequester';

/** The file types POST /bookings/{id} accepts (jpg, jpeg, png, gif, webp, pdf). */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

/** The error of one field, or '' when its value is fine (the server checks the same again). */
function fieldError(field, raw) {
  const value = String(raw ?? '').trim();
  if (!value) return field.required ? 'שדה חובה' : '';
  if (field.regex && !field.regex.test(value)) return 'הערך אינו בפורמט הנדרש';
  if (field.inputType === 'number' && Number.isNaN(Number(value))) return 'יש להזין מספר';
  return '';
}

/** Every field to draw, in order: a field, then its sub-fields (indented). */
const flatten = (fields, depth = 0) => fields.flatMap((field) => [{ ...field, depth }, ...flatten(field.children, depth + 1)]);

/**
 * One request form, built from GET /requester/form/{id}: breadcrumb, title, the fields the server sends (a select sends
 * its option id), attachments, send (POST /bookings/{id}). Server-side errors (422) show under their own field.
 */
export function RequestForm({ found, onHome, onDone }) {
  const { topic, group, type } = found;
  const form = useQuery({ queryKey: [...REQUESTER_KEY, 'form', type.id], queryFn: ({ signal }) => fetchForm(type.id, signal), staleTime: 5 * 60_000 });
  const fields = flatten(form.data ?? []);
  const [values, setValues] = useState({});
  const [touched, setTouched] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileNote, setFileNote] = useState('');
  // the server's own messages, by field id (values.<id>) and for the files; a field's goes once it is edited
  const [serverErrors, setServerErrors] = useState({});
  const picker = useRef(null);
  const client = useQueryClient();

  const send = useMutation({
    mutationFn: () => submitRequest(type.id, values, files),
    onSuccess: (booking) => {
      // the user's own new request is already "seen": it must not stand out as changed
      if (booking?.uuid) markSeen([{ id: booking.uuid, statusId: booking.status_id ?? booking.status?.id }]);
      void client.invalidateQueries({ queryKey: REQUESTER_KEY });
      onDone(booking?.serial_number ?? '');
    },
    onError: (error) => {
      const byField = {};
      for (const [key, messages] of Object.entries(error?.fieldErrors ?? {})) {
        const match = /^values\.(\d+)/.exec(key);
        if (match) byField[match[1]] = messages[0];
        else if (key.startsWith('files')) byField.files = messages[0];
      }
      setServerErrors(byField);
    },
  });

  const errors = Object.fromEntries(fields.map((field) => [field.id, fieldError(field, values[field.id])]));
  const valid = fields.every((field) => !errors[field.id]);
  const set = (id, value) => {
    setValues((previous) => ({ ...previous, [id]: value }));
    setServerErrors((previous) => {
      if (!previous[id]) return previous;
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

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

  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
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
      <section className="card">
        <div className="rq-form-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="ic">{hasTypeIcon(type.id) ? <TypeIcon bookingTypeId={type.id} /> : type.img ? <img src={type.img} alt="" /> : <Icon name="layers" />}</span>
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
            <div className="rq-fields">
              {fields.map((field) => {
                const error = serverErrors[field.id] || (touched ? errors[field.id] : '');
                const props = {
                  id: `rq-${field.id}`,
                  value: values[field.id] ?? '',
                  onChange: (event) => set(field.id, event.target.value),
                  'aria-invalid': error ? true : undefined,
                  'aria-required': field.required || undefined,
                  dir: field.ltr ? 'ltr' : undefined,
                };
                return (
                  <div key={field.id} className={`field${field.kind === 'textarea' ? ' wide' : ''}${field.depth ? ' sub' : ''}`} style={field.depth ? { paddingInlineStart: field.depth * 18 } : undefined}>
                    <label htmlFor={props.id}>
                      {field.label}
                      {field.required ? <span className="req" aria-hidden> *</span> : null}
                    </label>
                    {field.kind === 'textarea' ? (
                      <textarea className="input" rows={4} {...props} />
                    ) : field.kind === 'select' ? (
                      <Select {...props}>
                        <option value="">בחירה…</option>
                        {field.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </Select>
                    ) : field.inputType === 'date' ? (
                      // the app's own calendar (not the browser's); its value is 'YYYY-MM-DD' as the API expects
                      <DatePicker value={values[field.id] ?? ''} onChange={(day) => set(field.id, day ?? '')} label={field.label} />
                    ) : field.inputType === 'time' ? (
                      <TimePicker value={values[field.id] ?? ''} onChange={(time) => set(field.id, time ?? '')} label={field.label} invalid={Boolean(error)} />
                    ) : (
                      <input className="input" type={field.inputType} {...props} />
                    )}
                    {error ? <span className="rq-err">{error}</span> : null}
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
            {send.isError ? <FormError>{send.error?.message ?? 'שליחת הקריאה נכשלה.'}</FormError> : null}
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
