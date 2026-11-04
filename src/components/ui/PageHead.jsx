

/** Screen title block: heading, subtitle, main actions, and optionally something centred in the head (`center`). */
export function PageHead({ title, sub, actions, back, center }) {
  return (
    <div className={`page-head${center ? ' has-center' : ''}`}>
      <div>
        {back}
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {center ? <div className="page-head-center">{center}</div> : null}
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
