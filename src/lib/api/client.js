import axios, { AxiosError } from 'axios';


/** Single axios instance; calls go through the Next.js proxy so the HttpOnly login cookie is sent automatically. */
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

const HEBREW = /[֐-׿]/;

/** Used when the server's own text cannot be shown (no answer, English message, empty body). */
const FALLBACK_MESSAGE = {
  0: 'אין תקשורת עם השרת. בדקו את החיבור ונסו שוב.',
  400: 'הבקשה אינה תקינה.',
  401: 'פג תוקף ההתחברות. יש להתחבר מחדש.',
  403: 'הבקשה לא ניתנת לביצוע.',
  404: 'הבקשה לא ניתנת לביצוע.',
  405: 'הבקשה לא ניתנת לביצוע.',
  409: 'הנתונים השתנו בינתיים. הם נטענו מחדש - אפשר לנסות שוב.',
  422: 'אחד או יותר מהנתונים שנשלחו אינו תקין.',
  429: 'בקשות מרובות לשרת. נא לנסות שוב מאוחר יותר.',
  500: 'אירעה שגיאה בשרת. נסו שוב מאוחר יותר.',
};

function fallbackFor(status) {
  return FALLBACK_MESSAGE[status] ?? (status >= 500 ? FALLBACK_MESSAGE[500] : 'הפעולה נכשלה.');
}

/** Normalised API failure; 403/404/405 share one vague message so record existence is never revealed. */
export class ApiError extends Error {



  constructor(status, message, fieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get unauthenticated() {
    return this.status === 401;
  }
  get denied() {
    return this.status === 403 || this.status === 404 || this.status === 405;
  }
  /** 409: the record changed under the user; reload and retry. */
  get stale() {
    return this.status === 409;
  }
  get invalid() {
    return this.status === 422;
  }
  get offline() {
    return this.status === 0;
  }
}

function firstHebrewFieldError(errors) {
  if (!errors || typeof errors !== 'object') return null;
  for (const list of Object.values(errors)) {
    const first = Array.isArray(list) ? list[0] : list;
    if (typeof first === 'string' && HEBREW.test(first)) return first;
  }
  return null;
}

function normalizeFieldErrors(errors) {
  if (!errors || typeof errors !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(errors)) {
    out[key] = (Array.isArray(value) ? value : [value]).filter((v) => typeof v === 'string');
  }
  return out;
}

export function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (!axios.isAxiosError(error)) {
    return new ApiError(0, error instanceof Error && HEBREW.test(error.message) ? error.message : FALLBACK_MESSAGE[0]);
  }

  const response = (error).response;
  if (!response) return new ApiError(0, FALLBACK_MESSAGE[0]);

  const { status, data } = response;
  let message = null;

  if (typeof data === 'string') {
    // 429 answers are plain text
    message = HEBREW.test(data) && data.length < 300 ? data.trim() : null;
  } else if (data && typeof data === 'object') {
    const body = data;
    if (typeof body.message === 'string' && HEBREW.test(body.message)) message = body.message;
    message ??= firstHebrewFieldError(body.errors);
  }

  return new ApiError(status, message ?? fallbackFor(status), normalizeFieldErrors((data)?.errors));
}


let onUnauthorized = null;

/** Registers the session layer's reaction to a 401. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const apiError = toApiError(error);
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : '';
    // a failed login is not an expired session
    if (apiError.unauthenticated && !url.endsWith('/login')) onUnauthorized?.();
    return Promise.reject(apiError);
  },
);




/** Drops empty values; lists become comma-separated strings (`types=1,2`). */
export function cleanParams(params) {
  if (!params) return undefined;
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',');
    } else if (value === true) {
      out[key] = 1;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function getData(url, params, signal) {
  const response = await http.get(url, { params: cleanParams(params), signal });
  return response.data.data;
}

export async function getPage(url, params, signal) {
  const response = await http.get(url, { params: cleanParams(params), signal });
  return response.data;
}

/** A write; returns the full envelope because the server `message` is often shown to the user. */
export async function send(
  method,
  url,
  body,
  config,
) {
  const response = await http.request({ method, url, data: body, ...config });
  // some endpoints answer 204 / empty body
  return response.data && typeof response.data === 'object' ? response.data : ({ data: undefined });
}
