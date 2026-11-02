

/** Screen title block: heading, subtitle and main actions. */
export function PageHead({ title, sub, actions, back }) {
  return (
    <div className="page-head">
      <div>
        {back}
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
