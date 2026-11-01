import type { ReactNode } from 'react';

/** An on / off switch: a real checkbox (keyboard, label, form behaviour) drawn as a switch. */
export function Switch({ checked, onChange, children, disabled, hint }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; disabled?: boolean; hint?: ReactNode }) {
  return (
    <div className="st-switch-wrap">
      <label className="st-switch">
        <input type="checkbox" role="switch" className="sr" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <span className="track" aria-hidden="true" />
        <span>{children}</span>
      </label>
      {hint ? <span className="small muted">{hint}</span> : null}
    </div>
  );
}
