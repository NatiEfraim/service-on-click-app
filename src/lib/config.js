/** Personal-number login form; local API only, production signs in through ADFS. */
export const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN !== 'false';

/** ADFS origin; the login page loads `${ADFS_URL}/api/token` in a hidden iframe which posts the token back. */
export const ADFS_URL = process.env.NEXT_PUBLIC_ADFS_URL ?? '';

/** Sign-in address used when the personal-number form is off. */
export const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL ?? '';

export const APP_NAME = 'שירות בקליק';
