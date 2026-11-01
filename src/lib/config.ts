/** Build-time settings (NEXT_PUBLIC_*). See .env.example. */

/** Show the "log in with a personal number" form. The local API accepts a bare personal number; production signs in through ADFS. */
export const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN !== 'false';

/** Where a user whose session ended is sent when the personal-number form is off (e.g. the ADFS sign-in address). */
export const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL ?? '';

export const APP_NAME = 'שירות בקליק';
