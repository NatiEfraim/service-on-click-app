import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Heading of the card; without it the card has no head row. */
  title?: ReactNode;
  /** Muted text beside the heading. */
  hint?: ReactNode;
  /** Buttons / links at the end of the head row. */
  tools?: ReactNode;
  /** Adds the standard top margin between stacked cards. */
  spaced?: boolean;
}

/** A white card section with an optional head row (title, hint, tools). */
export function Card({ title, hint, tools, spaced, className = '', children, ...rest }: CardProps) {
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
export function CardBody({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={['card-body', className].filter(Boolean).join(' ')} {...rest} />;
}
