'use client';
import { useLayoutEffect, useRef } from 'react';
export function AnimatedText({ children }) {
  const box = useRef(null), label = useRef(null), previous = useRef(null);
  useLayoutEffect(() => {
    const outer = box.current, current = label.current;
    const text = current.textContent, old = previous.current;
    outer.style.width = current.getBoundingClientRect().width + 'px';
    previous.current = text;
    if (old === null || old === text || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ghost = document.createElement('span');
    ghost.className = 'animated-text-old'; ghost.textContent = old;
    ghost.setAttribute('aria-hidden', 'true'); outer.appendChild(ghost);
    const exit = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
    const enter = current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 80, fill: 'backwards' });
    exit.onfinish = () => ghost.remove();
    return () => { exit.cancel(); enter.cancel(); ghost.remove(); };
  }, [children]);
  return <span ref={box} className="animated-text"><span ref={label} className="animated-text-current">{children}</span></span>;
}
