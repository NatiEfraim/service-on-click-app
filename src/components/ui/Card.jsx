/** A white card section with an optional head row (title, hint, tools). */
export function Card({ title, hint, tools, spaced, className = '', children, ...rest }) {
  return (
    <section className={['card', spaced ? 'mt' : '', className].filter(Boolean).join(' ')} {...rest}>
      {title !== undefined || hint !== undefined || tools !== undefined ? (
        <div className="card-head">
          {title !== undefined ? <h2>{title}</h2> : null}
          {hint !== undefined ? <span className="hint">{hint}</span> : null}
          {tools !== undefined ? <span className="tools">{tools}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Padded content area of a card. */
export function CardBody({ className = '', ...rest }) {
  return <div className={['card-body', className].filter(Boolean).join(' ')} {...rest} />;
}
