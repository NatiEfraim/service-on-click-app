import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { Envelope, Paginated } from './types';

/**
 * One axios instance for the whole app. Every call is relative (`/api/...`) and goes through the Next.js proxy
 * (next.config.ts), so the browser has one origin and the API's HttpOnly login cookie travels by itself:
 * the app never reads, stores or sends a token.
 */
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

const HEBREW = /[֐-׿]/;

/** Said when the server's own text cannot be shown (no answer, a technical English message, an empty body). */
const FALLBACK_MESSAGE: Record<number, string> = {
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

function fallbackFor(status: number): string {
  return FALLBACK_MESSAGE[status] ?? (status >= 500 ? FALLBACK_MESSAGE[500] : 'הפעולה נכשלה.');
}

/**
 * What the API answers with, in the one shape the UI needs.
 * - `403/404/405` carry one deliberately vague text (the system never says whether a record exists): shown as is.
 * - `409` means the record changed under the user (stale `version`, or an open sync conflict): reload and retry.
 * - `422` shows the server's Hebrew text (a business rule `{message}` or the first field error).
 */
export class ApiError extends Error {
  /** 0 = the server did not answer at all. */
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** 401: not logged in (or the session ended). */
  get unauthenticated(): boolean {
    return this.status === 401;
  }
  /** 403 / 404 / 405: refused. The text is always the same on purpose. */
  get denied(): boolean {
    return this.status === 403 || this.status === 404 || this.status === 405;
  }
  /** 409: someone changed it first - reload the record and let the user retry. */
  get stale(): boolean {
    return this.status === 409;
  }
  /** 422: the input was not valid. */
  get invalid(): boolean {
    return this.status === 422;
  }
  /** No answer from the server. */
  get offline(): boolean {
    return this.status === 0;
  }
}

function firstHebrewFieldError(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;
  for (const list of Object.values(errors as Record<string, unknown>)) {
    const first = Array.isArray(list) ? list[0] : list;
    if (typeof first === 'string' && HEBREW.test(first)) return first;
  }
  return null;
}

function normalizeFieldErrors(errors: unknown): Record<string, string[]> {
  if (!errors || typeof errors !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    out[key] = (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === 'string');
  }
  return out;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (!axios.isAxiosError(error)) {
    return new ApiError(0, error instanceof Error && HEBREW.test(error.message) ? error.message : FALLBACK_MESSAGE[0]);
  }

  const response = (error as AxiosError).response;
  if (!response) return new ApiError(0, FALLBACK_MESSAGE[0]);

  const { status, data } = response;
  let message: string | null = null;

  if (typeof data === 'string') {
    // e.g. the 429 answer is plain text, not json
    message = HEBREW.test(data) && data.length < 300 ? data.trim() : null;
  } else if (data && typeof data === 'object') {
    const body = data as { message?: unknown; errors?: unknown };
    if (typeof body.message === 'string' && HEBREW.test(body.message)) message = body.message;
    message ??= firstHebrewFieldError(body.errors);
  }

  return new ApiError(status, message ?? fallbackFor(status), normalizeFieldErrors((data as { errors?: unknown } | null)?.errors));
}

// ---------- 401 handling

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** The session layer registers what to do when the server says "not logged in" (clear caches, go to the login page). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const apiError = toApiError(error);
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : '';
    // a wrong personal number on the login form is not "the session ended"
    if (apiError.unauthenticated && !url.endsWith('/login')) onUnauthorized?.();
    return Promise.reject(apiError);
  },
);

// ---------- request helpers

export type ParamValue = string | number | boolean | null | undefined | readonly (string | number)[];
export type Params = Record<string, ParamValue>;

/** Drops empty values and turns lists into the comma separated strings the API expects (`types=1,2`). */
export function cleanParams(params?: Params): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',');
    } else if (value === true) {
      out[key] = 1;
    } else {
      out[key] = value as string | number;
    }
  }
  return out;
}

export async function getData<T>(url: string, params?: Params, signal?: AbortSignal): Promise<T> {
  const response = await http.get<Envelope<T>>(url, { params: cleanParams(params), signal });
  return response.data.data;
}

export async function getPage<T>(url: string, params?: Params, signal?: AbortSignal): Promise<Paginated<T>> {
  const response = await http.get<Paginated<T>>(url, { params: cleanParams(params), signal });
  return response.data;
}

/** A write. Returns the whole envelope because the server's `message` is often the text to show the user. */
export async function send<T = unknown>(
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string,
  body?: unknown,
  config?: Pick<AxiosRequestConfig, 'headers' | 'params' | 'signal'>,
): Promise<Envelope<T>> {
  const response = await http.request<Envelope<T>>({ method, url, data: body, ...config });
  // a few legacy endpoints answer 204 / an empty body
  return response.data && typeof response.data === 'object' ? response.data : ({ data: undefined as T } as Envelope<T>);
}
