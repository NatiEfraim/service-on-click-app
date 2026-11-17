/**
 * The requester's rows of a booking's details list (a `<dl className="kv">`), the same in the management drawer and the
 * requester's: the name, the ID number on its own row, and the phone. Numbers read left to right but sit on the right,
 * as the other values do. A row with no value is left out.
 */
export function RequesterRows({ name, personalId, phone }) {
  return (
    <>
      <dt>מבקש</dt>
      <dd>{name || '—'}</dd>
      {personalId ? (
        <>
          <dt>ת&quot;ז</dt>
          <dd><span className="ltr">{personalId}</span></dd>
        </>
      ) : null}
      {phone ? (
        <>
          <dt>טלפון</dt>
          <dd><span className="ltr">{phone}</span></dd>
        </>
      ) : null}
    </>
  );
}
