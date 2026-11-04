/** Personal-number login form; local API only, production signs in through ADFS. */
export const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN !== 'false';

/** Sign-in address used when the personal-number form is off. */
export const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL ?? '';

/** The ADFS service; its `/api/token` page, loaded hidden, posts the user's token to this window. Empty = off. */
export const ADFS_URL = (process.env.NEXT_PUBLIC_ADFS_URL ?? '').replace(/\/+$/, '');

export const APP_NAME = 'שירות בקליק';
