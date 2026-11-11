'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { prefersReducedMotion } from '@/lib/motion';

/** How long each look plays before it is remembered and removed (matches the longest animation of each in requester.css). */
const CELEBRATION_MS = { burst: 1700, row: 2600 };

/** Soft confetti colours: greens, mint, a touch of the app's violet and a warm yellow. */
const COLOURS = ['#2FA85A', '#8EE3A8', '#BFE9CF', '#6E5F7D', '#F2C14E', '#5BC488'];

/** 14 pieces fanned out around the checkmark: a fixed spread (no randomness, so it looks the same every time). */
const PIECES = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * 360 + (index % 2 ? 9 : -9);
  const distance = 26 + (index % 3) * 9;
  return {
    x: Math.round(Math.cos((angle * Math.PI) / 180) * distance),
    y: Math.round(Math.sin((angle * Math.PI) / 180) * distance) - 6,
    rotate: (index * 47) % 360,
    colour: COLOURS[index % COLOURS.length],
    round: index % 3 === 0,
    delay: (index % 4) * 30,
  };
});

/** The row's confetti: 18 pieces spread along the whole width, drifting down a little and turning as they fade. */
const ROW_PIECES = Array.from({ length: 18 }, (_, index) => ({
  left: 3 + index * 5.4,
  top: 18 + (index % 3) * 14,
  x: (index % 2 ? 1 : -1) * (4 + (index % 4) * 3),
  y: 14 + (index % 5) * 4,
  rotate: (index * 53) % 360,
  colour: COLOURS[index % COLOURS.length],
  round: index % 3 === 0,
  delay: 120 + (index % 6) * 90,
}));

/**
 * A light, one-time celebration on a request that has just become completed: a green checkmark pops in and a small
 * burst of soft confetti flies out of it, then everything fades. It starts only once it is in view; `onDone` runs when
 * it has played (or at once with reduced motion), so the caller remembers it and never plays it again for that request.
 */
export function Celebration({ onDone, className = '', variant = 'burst' }) {
  // the latest onDone, so a redraw of the list (a new function each time) does not restart the timer
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  // it waits until it is really on screen (a row far down a scrolled list, or under the page fold), then plays once
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || playing) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPlaying(true);
    }, { threshold: 0.9 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [playing]);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(() => done.current(), prefersReducedMotion() ? 0 : CELEBRATION_MS[variant]);
    return () => window.clearTimeout(timer);
  }, [playing, variant]);

  // a whole row: it glows softly in green, and light confetti drifts across it
  if (variant === 'row') {
    return (
      <span ref={ref} className={`rq-celebrate-row${playing ? ' play' : ''}`} aria-hidden="true">
        {ROW_PIECES.map((piece, index) => (
          <i
            key={index}
            className={piece.round ? 'round' : ''}
            style={{ left: `${piece.left}%`, top: `${piece.top}%`, '--x': `${piece.x}px`, '--y': `${piece.y}px`, '--r': `${piece.rotate}deg`, '--c': piece.colour, animationDelay: `${piece.delay}ms` }}
          />
        ))}
      </span>
    );
  }

  return (
    <span ref={ref} className={`rq-celebrate${playing ? ' play' : ''}${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span className="check"><Icon name="check" /></span>
      {PIECES.map((piece, index) => (
        <i
          key={index}
          className={piece.round ? 'round' : ''}
          style={{ '--x': `${piece.x}px`, '--y': `${piece.y}px`, '--r': `${piece.rotate}deg`, '--c': piece.colour, animationDelay: `${piece.delay}ms` }}
        />
      ))}
    </span>
  );
}
