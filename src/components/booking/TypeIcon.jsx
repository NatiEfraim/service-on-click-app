'use client';

/**
 * The pictures of the ICT request types added with the installations / faults / user-management groups (booking types
 * 20-25), drawn inline so their parts can move, in the style of the permissions window's category pictures (people/
 * ServiceIcon): soft fills with a dark outline. They rest still; hovering the button that holds them (a request type, a
 * category, a row) plays a short sequence that tells what the request does, and leaving reverses it. Motion: components.css (.ti-*).
 */
const STROKE = { stroke: '#26232B', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

/** התקנת תוכנה - a screen: the download arrow drops in and the progress bar fills. */
function SoftwareInstall() {
  return (
    <>
      <path d="M13 21 V25 M19 21 V25" {...STROKE} />
      <rect x="9.5" y="24.5" width="13" height="3" rx="1.5" fill="#C9CDD8" {...STROKE} />
      <rect x="3.5" y="4.5" width="25" height="17" rx="2.5" fill="#9ED3F0" {...STROKE} />
      <g className="ti-sw-arrow">
        <path d="M16 7.5 V14 M12.8 11 L16 14.2 L19.2 11" fill="none" stroke="#3E5C8A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <rect x="8.5" y="16.5" width="15" height="2.4" rx="1.2" fill="#FFFFFF" />
      <rect className="ti-sw-bar" x="8.5" y="16.5" width="15" height="2.4" rx="1.2" fill="#2FA85A" />
    </>
  );
}

/** התקנת מדפסת - a printer: the page slides out and its light turns green. */
function PrinterInstall() {
  return (
    <>
      <rect x="9" y="3.5" width="14" height="9" rx="1" fill="#FFFFFF" {...STROKE} />
      <g className="ti-pr-paper">
        <path d="M9.5 16 H22.5 V28.5 H9.5 Z" fill="#FFFFFF" {...STROKE} />
        <path d="M12.5 21 H19.5 M12.5 24.5 H17.5" stroke="#8FB3E8" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <path d="M7 21.5 H6 a2.5 2.5 0 0 1 -2.5 -2.5 V14.5 a2.5 2.5 0 0 1 2.5 -2.5 H26 a2.5 2.5 0 0 1 2.5 2.5 V19 a2.5 2.5 0 0 1 -2.5 2.5 H25" fill="#8FB3E8" {...STROKE} />
      <path d="M8 18 H24" {...STROKE} />
      <circle className="ti-pr-led" cx="24.5" cy="15" r="1.2" fill="#7D8AA6" />
    </>
  );
}

/** תקלה במייל - an envelope with a warning badge: the flap opens, the letter rises out and the badge pops. */
function EmailFault() {
  return (
    <>
      <g className="ti-em-mail">
        <rect x="2.5" y="9.5" width="22" height="15" rx="2" fill="#E0A94A" {...STROKE} />
        <path className="ti-em-flap-open" d="M2.5 9.5 L13.5 2.5 L24.5 9.5 Z" fill="#F7D488" {...STROKE} />
        <g className="ti-em-letter">
          <rect x="5.5" y="11" width="16" height="11" rx="1" fill="#FFFFFF" {...STROKE} />
          <path d="M8 14.5 H19 M8 17.5 H15" stroke="#8FB3E8" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <path d="M2.5 11.5 L13.5 18.5 L24.5 11.5 V22.5 a2 2 0 0 1 -2 2 H4.5 a2 2 0 0 1 -2 -2 Z" fill="#F2C46D" {...STROKE} />
        <path className="ti-em-flap" d="M2.5 11.5 a2 2 0 0 1 2 -2 H22.5 a2 2 0 0 1 2 2 L13.5 18.5 Z" fill="#F7D488" {...STROKE} />
      </g>
      <g className="ti-em-badge">
        <circle cx="24" cy="22.5" r="5.6" fill="#E8826A" {...STROKE} />
        <path d="M24 19.6 V22.8" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="24" cy="25.2" r="0.95" fill="#FFFFFF" />
      </g>
    </>
  );
}

/** שינוי שם משתמש - a user card: the pencil writes the new name line. */
function UserRename() {
  return (
    <>
      <rect x="2.5" y="6.5" width="22" height="17" rx="2.5" fill="#C7D8F2" {...STROKE} />
      <circle cx="9" cy="12.6" r="2.6" fill="#F2C46D" {...STROKE} />
      <path d="M5 20.5 a4 4 0 0 1 8 0 Z" fill="#F2C46D" {...STROKE} />
      <path d="M15.5 12 H21.5" stroke="#3E5C8A" strokeWidth="1.6" strokeLinecap="round" />
      <path className="ti-rn-line" d="M15.5 16.5 H20.5" stroke="#2FA85A" strokeWidth="1.8" strokeLinecap="round" pathLength="100" />
      <g className="ti-rn-pen">
        <path d="M19.5 27.5 L27.5 19.5 L30 22 L22 30 Z" fill="#E8826A" {...STROKE} />
        <path d="M19.5 27.5 L18.6 30.9 L22 30 Z" fill="#FFF3D1" {...STROKE} />
      </g>
    </>
  );
}

/** פתיחת משתמש - a person with a plus badge: the badge spins in and grows. */
function UserOpen() {
  return (
    <>
      <circle cx="12.5" cy="10" r="4.6" fill="#F2C46D" {...STROKE} />
      <path d="M3.5 27.5 a9 8.5 0 0 1 18 0 Z" fill="#8FB3E8" {...STROKE} />
      <g className="ti-uo-plus">
        <circle cx="24" cy="20.5" r="5.6" fill="#2FA85A" {...STROKE} />
        <path d="M24 17.9 V23.1 M21.4 20.5 H26.6" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
      </g>
    </>
  );
}

/** העברת משתמש יחידה - a person beside a building: the arrow pushes and the person steps across. */
function UserMove() {
  return (
    <>
      <rect x="2.5" y="8.5" width="10" height="19" rx="1.5" fill="#C9CDD8" {...STROKE} />
      <path d="M5.5 12.5 H6.8 M8.2 12.5 H9.5 M5.5 16.5 H6.8 M8.2 16.5 H9.5 M5.5 20.5 H6.8 M8.2 20.5 H9.5" stroke="#3E5C8A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.5 27.5 H12.5" {...STROKE} />
      <g className="ti-mv-arrow">
        <path d="M14.5 6.5 H20.5 M18.3 4.3 L20.5 6.5 L18.3 8.7" fill="none" stroke="#2FA85A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="ti-mv-person">
        <circle cx="23.5" cy="14" r="3.4" fill="#F2C46D" {...STROKE} />
        <path d="M17.5 27.5 a6 6.5 0 0 1 12 0 Z" fill="#8FB3E8" {...STROKE} />
      </g>
    </>
  );
}

/** By booking type id. */
const PICTURES = { 20: SoftwareInstall, 21: PrinterInstall, 22: EmailFault, 23: UserRename, 24: UserOpen, 25: UserMove };

/** Whether a booking type has an interactive picture here. */
export const hasTypeIcon = (bookingTypeId) => Boolean(PICTURES[Number(bookingTypeId)]);

/** The type's interactive picture (null when it has none); `size` in px. */
export function TypeIcon({ bookingTypeId, size = 28, className = '' }) {
  const Picture = PICTURES[Number(bookingTypeId)];
  if (!Picture) return null;
  return (
    <svg className={`ti ${className}`.trim()} viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <Picture />
    </svg>
  );
}
