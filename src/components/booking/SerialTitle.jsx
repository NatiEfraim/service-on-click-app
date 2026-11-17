/** A booking drawer's title: "קריאה" and the booking's number, with room between them (the number in a lighter weight). */
export function SerialTitle({ serial }) {
  return (
    <>
      קריאה <span className="ltr drawer-serial">{serial}</span>
    </>
  );
}
