'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { ATTACH_ACCEPT, findType, FORMS, iconSrc, submitRequest } from './requesterData';
import { markSeen } from './seen';

const isAllowedFile = (file) => file.type === 'application/pdf' || file.type.startsWith('image/');

/** The error of one field, or '' when its value is fine. */
function fieldError(field, raw) {
  const value = String(raw ?? '').trim();
  if (!value) return field.required ? 'שדה חובה' : '';
  if (field.pattern && !field.pattern.test(value)) return field.message;
  if (field.kind === 'number' && !(Number(value) > 0)) return 'מספר חיובי';
  return '';
}

/** One request form: breadcrumb, title, the type's fields, attachments, send. */
export function RequestForm({ typeId, onHome, onDone }) {
  const { topic, group, type } = findType(typeId);
  const fields = FORMS[typeId] ?? [];
  const [values, setValues] = useState({});
  const [touched, setTouched] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileNote, setFileNote] = useState('');
  const picker = useRef(null);
  const client = useQueryClient();

  const send = useMutation({
    mutationFn: () => submitRequest(typeId, values, files),
    onSuccess: (request) => {
      // the user's own new request is already "seen": it must not stand out as changed
      markSeen([request]);
      void client.invalidateQueries({ queryKey: ['requester-demo'] });
      onDone();
    },
  });

  const errors = Object.fromEntries(fields.map((field) => [field.id, fieldError(field, values[field.id])]));
  const valid = fields.every((field) => !errors[field.id]);
  const set = (id, value) => setValues((previous) => ({ ...previous, [id]: value }));

  const addFiles = (list) => {
    const picked = Array.from(list ?? []);
    const good = picked.filter(isAllowedFile);
    setFileNote(good.length < picked.length ? 'ניתן לצרף תמונות או קובצי PDF בלבד.' : '');
    setFiles((previous) => [...previous, ...good.filter((file) => !previous.some((other) => other.name === file.name && other.size === file.size))]);
  };

  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (valid) send.mutate();
  };

  return (
    <form className="rq-form" onSubmit={submit} noValidate>
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
      <section className="card">
        <div className="rq-form-head">
          <span className="ic"><img src={iconSrc(typeId)} alt="" /></span>
          <div>
            <h1>{type.name}</h1>
            <p className="muted">{type.description}</p>
          </div>
        </div>
        <div className="rq-fields">
          {fields.map((field) => {
            const error = touched ? errors[field.id] : '';
            const props = {
              id: `rq-${field.id}`,
              value: values[field.id] ?? '',
              onChange: (event) => set(field.id, event.target.value),
              'aria-invalid': error ? true : undefined,
              'aria-required': field.required || undefined,
              dir: field.ltr ? 'ltr' : undefined,
              placeholder: field.placeholder,
            };
            return (
              <div key={field.id} className={`field${field.kind === 'textarea' ? ' wide' : ''}`}>
                <label htmlFor={props.id}>
                  {field.label}
                  {field.required ? <span className="req" aria-hidden> *</span> : null}
                </label>
                {field.kind === 'textarea' ? (
                  <textarea className="input" rows={4} {...props} />
                ) : field.kind === 'select' ? (
                  <Select {...props}>
                    <option value="">בחירה…</option>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Select>
                ) : (
                  <input className="input" type={field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'} min={field.kind === 'number' ? 1 : undefined} {...props} />
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
              <Button size="sm" icon="clip" onClick={() => picker.current?.click()}>צירוף קבצים</Button>
              <span className="small muted">תמונות או PDF (לא חובה)</span>
              <input ref={picker} type="file" hidden multiple accept={ATTACH_ACCEPT} onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
            </div>
            {fileNote ? <span className="rq-err">{fileNote}</span> : null}
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
          <Button variant="ghost" onClick={onHome}>ביטול</Button>
          <span className="grow" />
          <span className="small muted">שדות המסומנים ב-* הם חובה</span>
        </div>
      </section>
    </form>
  );
}
