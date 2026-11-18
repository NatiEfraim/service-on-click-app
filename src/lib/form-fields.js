/**
 * What a form field says about itself, read the same way everywhere a field is drawn (the request form, the handler
 * section of a route request, a move's dialog): how its server type is drawn, and the rules in its `validations`.
 *
 * `validations` is an object `{ "rule": "Hebrew message" }` or null (every type, since the clearance grant refactor);
 * older answers were a JSON string - sometimes double-encoded - with a bare `regex` key. Both shapes are read, so a
 * server that still sends the old one breaks nothing. The client checks required / regex / max / min and the type's own
 * format before sending; the server enforces the same rules (and more) with the same messages.
 */

/** How a server field type is drawn: the input's kind (`text` | `textarea` | `select`) and the HTML type of a plain input. */
const FIELD_KIND = {
  text: ['text', 'text'],
  text_box: ['text', 'text'],
  text_area: ['textarea', 'text'],
  tel: ['text', 'tel'],
  email: ['text', 'email'],
  url: ['text', 'url'],
  number: ['text', 'number'],
  number_with_asterisk: ['text', 'number'],
  date: ['text', 'date'],
  time: ['text', 'time'],
  month: ['text', 'month'],
  week: ['text', 'week'],
  select: ['select', 'text'],
  radio: ['select', 'text'],
};

const LTR_INPUTS = ['tel', 'email', 'url', 'number'];

/** `{ kind, inputType, ltr }` of a server field type name; an unknown type is a plain text input. */
export function fieldKind(typeName) {
  const [kind, inputType] = FIELD_KIND[typeName] ?? ['text', 'text'];
  return { kind, inputType, ltr: LTR_INPUTS.includes(inputType) };
}

/** The `validations` of a field as an object, whatever shape it arrived in. */
export function parseValidations(raw) {
  let value = raw;
  // a JSON string, possibly encoded twice
  for (let round = 0; round < 2 && typeof value === 'string'; round += 1) {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  // PHP serialises an empty array as [] - no rules
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

/** A PHP pattern (`/^\d{9}$/`, `~...~u`) as a RegExp; null when it cannot be read. */
export function regexFrom(pattern) {
  const text = String(pattern ?? '').trim();
  if (!text) return null;
  const delimiter = text[0];
  const end = /[a-zA-Z0-9\\\s]/.test(delimiter) ? -1 : text.lastIndexOf(delimiter);
  const [body, flags] = end > 0 ? [text.slice(1, end), text.slice(end + 1)] : [text, ''];
  try {
    return new RegExp(body, flags.replace(/[^gimsuy]/g, ''));
  } catch {
    return null;
  }
}

const number = (text) => {
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

/**
 * The rules of a field, ready to check: the required message, the regex and its message, the max / min (a length for
 * text, a value for a number) and their messages, plus every message by its rule (`messages`).
 */
export function fieldRules(raw) {
  const messages = parseValidations(raw);
  const rules = { required: null, regex: null, regexMessage: null, max: null, maxMessage: null, min: null, minMessage: null, messages };
  for (const [rule, message] of Object.entries(messages)) {
    const text = typeof message === 'string' ? message : null;
    if (rule === 'required') rules.required = text;
    else if (rule === 'regex') {
      // the old shape: the pattern itself, with no message
      rules.regex = regexFrom(message);
    } else if (rule.startsWith('regex:')) {
      rules.regex = regexFrom(rule.slice('regex:'.length));
      rules.regexMessage = text;
    } else if (rule.startsWith('max:')) {
      rules.max = number(rule.slice('max:'.length));
      rules.maxMessage = text;
    } else if (rule.startsWith('min:')) {
      rules.min = number(rule.slice('min:'.length));
      rules.minMessage = text;
    }
  }
  return rules;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/**
 * The error of one value against its field's rules, or null when it is fine (the server checks the same again).
 * `kind` is the input's HTML type (`text`, `number`, `date`, `time`...): it decides whether max / min bound a length or
 * a value, and which format the value must have. An empty value is only an error when the field is required.
 */
export function validateValue(rules, value, { required = false, kind = 'text' } = {}) {
  const text = String(value ?? '').trim();
  if (!text) return required ? rules.required ?? 'שדה חובה' : null;
  if (rules.regex && !rules.regex.test(text)) return rules.regexMessage ?? 'הערך אינו בפורמט הנדרש';
  if (kind === 'number') {
    const amount = Number(text);
    if (Number.isNaN(amount)) return rules.messages.numeric ?? 'יש להזין מספר';
    if (rules.min !== null && amount < rules.min) return rules.minMessage ?? `הערך המזערי הוא ${rules.min}`;
    if (rules.max !== null && amount > rules.max) return rules.maxMessage ?? `הערך המרבי הוא ${rules.max}`;
    return null;
  }
  if (kind === 'date' && !DATE.test(text)) return rules.messages.date ?? 'תאריך אינו תקין';
  if (kind === 'time' && !TIME.test(text)) return rules.messages['date_format:H:i'] ?? 'שעה אינה תקינה (HH:MM)';
  if (rules.max !== null && text.length > rules.max) return rules.maxMessage ?? `ניתן להזין עד ${rules.max} תווים`;
  if (rules.min !== null && text.length < rules.min) return rules.minMessage ?? `יש להזין לפחות ${rules.min} תווים`;
  return null;
}
