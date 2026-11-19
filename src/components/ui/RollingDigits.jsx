'use client';

import { useLayoutEffect, useRef } from 'react';
import { EASE_IN, EASE_OUT, prefersReducedMotion } from '@/lib/motion';

/**
 * One character of a RollingDigits: when it changes, the old one rolls out and fades while the new one rolls in from the
 * other side (`direction` 1: the number went up, so the new digit comes from below; -1: from above).
 */
function RollingChar({ char, direction }) {
  const slot = useRef(null);
  const current = useRef(null);
  const previous = useRef(char);

  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = char;
    if (old === char || prefersReducedMotion()) return undefined;
    const ghost = document.createElement('span');
    ghost.className = 'rd-old';
    ghost.textContent = old;
    ghost.setAttribute('aria-hidden', 'true');
    slot.current.appendChild(ghost);
    const shift = direction >= 0 ? 1 : -1;
    const exit = ghost.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${-70 * shift}%)` }], { duration: 200, easing: EASE_IN, fill: 'forwards' });
    const enter = current.current.animate([{ opacity: 0, transform: `translateY(${70 * shift}%)` }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 40, easing: EASE_OUT, fill: 'backwards' });
    exit.onfinish = () => ghost.remove();
    return () => {
      exit.cancel();
      enter.cancel();
      ghost.remove();
    };
  }, [char]); // eslint-disable-line react-hooks/exhaustive-deps -- the direction is read when the digit changes

  return (
    <span ref={slot} className="rd-slot">
      <span ref={current} className="rd-char">
        {char}
      </span>
    </span>
  );
}

/**
 * A number or a time ("16:40") whose digits roll like a clock's when they change: only the digits that changed move,
 * up when the value grew and down when it shrank, fading as they go. A separator (":") stays still. With reduced motion
 * the digits just change. Styles: components.css (.rd-*).
 */
export function RollingDigits({ value, className = '', ...rest }) {
  const text = String(value);
  const previous = useRef(text);
  const direction = useRef(1);
  if (previous.current !== text) {
    direction.current = text.localeCompare(previous.current, undefined, { numeric: true }) >= 0 ? 1 : -1;
    previous.current = text;
  }
  return (
    <span className={`rd${className ? ` ${className}` : ''}`} aria-label={text} {...rest}>
      {[...text].map((char, index) => (/\d/.test(char) ? <RollingChar key={index} char={char} direction={direction.current} /> : <span key={index} className="rd-sep" aria-hidden="true">{char}</span>))}
    </span>
  );
}
