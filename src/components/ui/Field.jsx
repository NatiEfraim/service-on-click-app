/**
 * A labelled form control: the caption above, the input / select / textarea as children. `as="div"` for a control
 * that opens its own popup (a date picker): a <label> would forward a click inside the popup to the control's button.
 */
export function Field({ label, as: Tag = 'label', children }) {
  return (
    <Tag className="field">
      <span>{label}</span>
      {children}
    </Tag>
  );
}
