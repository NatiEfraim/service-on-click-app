

/** Screen title block: heading, subtitle, main actions, and optionally something centred in the head (`center`). */
export function PageHead({ title, sub, actions, back, center, hideTitle = false }) {
  // a hidden title with nothing beside it takes no room: the screen starts right under the top bar
  if (hideTitle && !sub && !actions && !center && !back) return <h1 className="sr">{title}</h1>;
  return (
    <div className={`page-head${center ? ' has-center' : ''}`}>
      <div>
        {back}
        {/* `hideTitle`: the screen speaks for itself; the title stays for screen readers and the page outline */}
        <h1 className={hideTitle ? 'sr' : undefined}>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {center ? <div className="page-head-center">{center}</div> : null}
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
