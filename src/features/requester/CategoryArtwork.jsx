import { EASE_IN_OUT, EASE_OUT, prefersReducedMotion } from '@/lib/motion';

/** Existing category illustrations with the parts that move isolated in SVG groups. */
const ARTWORK = {
  '/icons/domains/1.svg': {
    viewBox: '0 0 42 42',
    art: (
      <g fill="none">
        <path d="M10.5 6.12496L6.67142 18.3749H35.3287L31.5 6.12496L30.3011 6.02506C24.1111 5.50923 17.8888 5.50923 11.6989 6.02506L10.5 6.12496Z" fill="#D33D3D" fillOpacity="0.22" />
        <path d="M6.67142 18.3749C5.84104 18.3749 5.12976 18.9581 4.97579 19.7742C4.75395 20.95 4.46427 22.5985 4.375 23.625C4.19072 25.7441 4.67332 29.0847 4.99301 30.9659C5.13257 31.7872 5.84442 32.3749 6.67755 32.3749L28 32.3747L35.3225 32.3749C36.1557 32.3749 36.8674 31.7872 37.0071 30.9659C37.3266 29.0847 37.8093 25.7441 37.625 23.625C37.5357 22.5985 37.2461 20.95 37.0242 19.7742C36.8702 18.9581 36.159 18.3749 35.3287 18.3749H6.67142Z" fill="#D33D3D" />
        <path d="M8.75 32.375V36.75H14V32.375M28 32.3747L6.67754 32.3749M28 32.3747L35.3225 32.3749M28 32.3747V34.5624V36.75H33.25V32.375M35 16.625H38.5M7 16.625H3.5M31.5 25.375H31.4825M10.5 25.375H10.4825M22.75 25.375H19.25M6.67142 18.3749L10.5 6.12496L11.6989 6.02506C17.8888 5.50923 24.1111 5.50923 30.3011 6.02506L31.5 6.12496L35.3287 18.3749M6.67142 18.3749C5.84104 18.3749 5.12976 18.9581 4.97579 19.7742C4.75395 20.95 4.46427 22.5985 4.375 23.625C4.19072 25.7441 4.67332 29.0847 4.99301 30.9659C5.13257 31.7872 5.84442 32.3749 6.67754 32.3749M6.67142 18.3749H35.3287M35.3287 18.3749C36.159 18.3749 36.8702 18.9581 37.0242 19.7742C37.2461 20.95 37.5357 22.5985 37.625 23.625C37.8093 25.7441 37.3266 29.0847 37.0071 30.9659C36.8674 31.7872 36.1557 32.3749 35.3225 32.3749M6.67754 32.3749H35.3225" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path className="category-art-light" d="M10.5 25.4h.8m19.4 0h.8" stroke="#FFDF75" strokeWidth="3.3" strokeLinecap="round" />
      </g>
    ),
  },
  '/icons/domains/2.svg': {
    viewBox: '0 0 48 48',
    art: (
      <g stroke="#272C35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M17 35 V17 L30 8 L44 17 V35" fill="#E1EAF2" />
        <path d="M16 17 L30 7 L45 17" stroke="#48657B" strokeWidth="2.7" />
        <path d="M23 35 V19 H38 V35" fill="#B0C4D5" />
        <path d="M5 38 H44" stroke="#A3B1BE" />
        <g data-scene-part="car">
          <path d="M6 29 L10 22 H22 L27 29 Q30 30 30 33 V35 H4 V32 Q4 30 6 29Z" fill="#D96D5D" />
          <path d="M10 28 L13 24 H21 L24 28Z" fill="#D9F1F7" strokeWidth="1.3" />
          <path d="M7 32 H9 M25 32 H27" stroke="#FFE8B4" />
          <circle cx="9" cy="35" r="2.8" fill="#33404C" />
          <circle cx="25" cy="35" r="2.8" fill="#33404C" />
        </g>
        <g data-scene-part="service-check" className="category-art-scene-effect">
          <circle cx="39" cy="13" r="7" fill="#2D8462" stroke="#215D49" />
          <path d="m36 13 2 2 4-4" stroke="#fff" strokeWidth="1.9" />
        </g>
      </g>
    ),
  },
  '/icons/domains/5.svg': {
    viewBox: '0 0 37 31',
    art: (
      <g fill="none">
        <g stroke="#26232B" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="m11 21 6-6 18 7c-6 2-12 0-18-3l-5 5" fill="#A9ACB0" />
          <circle cx="6" cy="24" r="5" fill="#fff" />
          <g className="category-art-part category-art-pivot" style={{ transformOrigin: "17px 15px", "--art-preview": "rotate(-12deg)", "--art-full": "rotate(46deg)" }}>
            <path d="m11 9 6 6L35 7c-6-2-12 0-18 5l-5-5" fill="#D9D9D9" />
            <circle cx="6" cy="6" r="5" fill="#fff" />
          </g>
          <circle cx="17" cy="15" r="1" fill="#26232B" />
        </g>
      </g>
    ),
  },
  '/icons/domains/8.svg': {
    viewBox: '0 0 42 42',
    art: (
      <g fill="none">
        <path d="M33.25 31.5H36.75C37.2141 31.5 37.6592 31.3156 37.9874 30.9874C38.3156 30.6593 38.5 30.2141 38.5 29.75V23.3625C38.4993 22.9654 38.3635 22.5803 38.115 22.2705L32.025 14.658C31.8613 14.453 31.6537 14.2875 31.4174 14.1736C31.1811 14.0597 30.9223 14.0004 30.66 14H24.5V30.9874L33.25 31.5Z" fill="#D9D9D9" fillOpacity="0.62" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24.5 31.5V10.5C24.5 9.57174 24.1313 8.6815 23.4749 8.02513C22.8185 7.36875 21.9283 7 21 7H7C6.07174 7 5.1815 7.36875 4.52513 8.02513C3.86875 8.6815 3.5 9.57174 3.5 10.5V29.75C3.5 30.2141 3.68437 30.6593 4.01256 30.9874C4.34075 31.3156 4.78587 31.5 5.25 31.5H8.75" fill="#F0B398" />
        <path d="M24.5 31.5V10.5C24.5 9.57174 24.1313 8.6815 23.4749 8.02513C22.8185 7.36875 21.9283 7 21 7H7C6.07174 7 5.1815 7.36875 4.52513 8.02513C3.86875 8.6815 3.5 9.57174 3.5 10.5V29.75C3.5 30.2141 3.68437 30.6592 4.01256 30.9874C4.34075 31.3156 4.78587 31.5 5.25 31.5H8.75" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26.25 31.5H15.75" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M29.75 35C31.683 35 33.25 33.433 33.25 31.5C33.25 29.567 31.683 28 29.75 28C27.817 28 26.25 29.567 26.25 31.5C26.25 33.433 27.817 35 29.75 35Z" fill="#7E7E7E" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.25 35C14.183 35 15.75 33.433 15.75 31.5C15.75 29.567 14.183 28 12.25 28C10.317 28 8.75 29.567 8.75 31.5C8.75 33.433 10.317 35 12.25 35Z" fill="#7E7E7E" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <g className="category-art-part category-art-pivot" style={{ transformOrigin: "12.25px 31.5px", "--art-preview": "rotate(16deg)", "--art-full": "rotate(360deg)" }}>
          <path d="M12.25 29 V34" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
        </g>
        <g className="category-art-part category-art-pivot" style={{ transformOrigin: "29.75px 31.5px", "--art-preview": "rotate(16deg)", "--art-full": "rotate(360deg)" }}>
          <path d="M29.75 29 V34" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
    ),
  },
  '/icons/domains/10.svg': {
    viewBox: '0 0 48 48',
    art: (
      <g stroke="#30251E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 31 L35 28 L42 31 V35 Q42 37 39 38 L15 42 Q11 43 8 40 L6 37 Z" fill="#D49552" />
        <path d="M6 31 L33 25 Q36 25 42 31 L15 37 Z" fill="#FFE0A5" />
        <path d="M6 30 L34 24 L42 29 L18 35 L15 37 L12 35 Q8 36 6 32 Z" fill="#F3BD54" />
        <path d="M6 28 C9 25 12 29 15 26 S21 26 25 24 S31 25 34 22 L42 27 Q40 31 35 30 Q33 32 29 32 Q26 34 21 33 Q17 36 13 34 Q9 35 6 31 Z" fill="#83B860" />
        <g className="category-art-ingredient" data-entry="translate(18px, -13px) rotate(-22deg)" data-hold="">
          <ellipse cx="25" cy="29" rx="9" ry="4" transform="rotate(-12 25 29)" fill="#DA4D42" />
          <ellipse cx="25" cy="28.5" rx="7" ry="2.5" transform="rotate(-12 25 28.5)" fill="#F57C67" stroke="none" />
          <path d="M21 29 L23 28 M26 28 L28 27 M27 30 L29 29" stroke="#FFE0AB" strokeWidth="1.1" />
        </g>
        <g className="category-art-food-top" data-open="translate(-2px, -11px) rotate(-12deg)">
          <path d="M6 28 L32 16 L42 26 V29 Q42 31 39 32 L16 36 Q12 37 9 34 L6 31 Z" fill="#D79B57" />
          <path d="M6 28 L31 16 Q33 15 36 17 L41 24 Q44 27 40 28 L16 33 Q12 34 9 32 Z" fill="#F8DDA5" />
          <path d="M12 29 L31 20 M16 30 L35 22" stroke="#C4864E" strokeWidth="1.15" />
        </g>
      </g>
    ),
  },
  '/icons/domains/11.svg': {
    viewBox: '0 0 48 48',
    art: (
      <g stroke="#262832" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 29 H7 Q4 29 4 26 Q4 24 7 24 H11 M37 29 H41 Q44 29 44 26 Q44 24 41 24 H37" fill="#92A0B1" />
        <ellipse cx="24" cy="23" rx="14" ry="4.5" fill="#434D61" />
        <g className="category-art-ingredient" data-entry="translate(4px, -20px) rotate(23deg)" data-delay="185">
          <path d="M20 25 C16 21 13 21 14 17 Q15 14 18 17 Q22 13 24 17 Q25 20 23 22 L21 24 L22 27 Z" fill="#76AD67" />
        </g>
        <g className="category-art-ingredient" data-entry="translate(10px, -21px) rotate(-36deg)" data-delay="240">
          <path d="M25 26 L27 19 Q30 17 33 20 Q33 22 25 26 Z" fill="#EE9D53" />
          <path d="M30 19 Q29 16 31 15 M31 20 Q34 17 35 18" stroke="#659855" strokeWidth="1.5" />
        </g>
        <g className="category-art-ingredient" data-entry="translate(13px, -17px) rotate(34deg)" data-delay="295">
          <path d="M26 23 Q27 19 31 19 Q35 19 35 23 Q34 27 31 27 Q27 27 26 23 Z" fill="#E96C5C" />
          <path d="M30 20 L31 18 L33 20" stroke="#639254" strokeWidth="1.4" />
        </g>
        <path d="M10 23 Q24 29 38 23 L36 35 Q35 40 29 40 H19 Q13 40 12 35 Z" fill="#A9B7C8" />
        <path d="M16 28 L17 34 Q18 37 21 37" fill="none" stroke="#E3EDF4" strokeWidth="2" />
        <g className="category-art-food-top" data-open="translate(-7px, -10px) rotate(-27deg)">
          <path d="M20 16 V14 Q20 12 22 12 H26 Q28 12 28 14 V16" fill="#6B7689" />
          <path d="M9 22 Q10 16 24 16 Q38 16 39 22 Q38 25 24 25 Q10 25 9 22 Z" fill="#CDDAE5" />
          <path d="M10 22 Q24 25 38 22" fill="none" />
        </g>
      </g>
    ),
  },
  '/icons/domains/13.svg': {
    viewBox: '0 0 48 48',
    art: (
      <g stroke="#28343A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <g data-scene-part="wall">
          <rect x="35" y="9" width="11" height="31" rx="2" fill="#DCAD91" />
          <path d="M35 17 H46 M35 25 H46 M35 33 H46 M41 9 V17 M40 25 V33" stroke="#A7745B" strokeWidth="1.25" />
          <circle cx="36.5" cy="22" r="1.65" fill="#523D32" stroke="none" data-scene-part="drill-hole" className="category-art-scene-effect" />
        </g>
        <g data-scene-part="drill">
          <path d="M9 26 H17 L15 37 H8Z" fill="#A9DCE1" />
          <path d="M7 37 H17 Q19 37 19 39 V41 H6 V39 Q6 37 7 37Z" fill="#427F89" />
          <rect x="3.5" y="16" width="19" height="11" rx="3" fill="#73BCC6" />
          <path d="M7 19 H14 M17 24 H18" stroke="#D7F4F4" />
          <path d="M23 18 H26 Q28 18 28 20 V24 Q28 26 26 26 H23Z" fill="#5B7980" />
          <path d="M28 22 H31" stroke="#535C69" strokeWidth="2.1" />
        </g>
        <g data-scene-part="drill-dust" className="category-art-scene-effect" fill="#B77956" stroke="none">
          <circle cx="30" cy="17" r="1.4" />
          <circle cx="29" cy="25" r="1.25" />
          <circle cx="33" cy="29" r="1.1" />
        </g>
      </g>
    ),
  },
  '/icons/requester/clearance-grant.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <rect x="3.5" y="7" width="25" height="18" rx="2" fill="#F5DE9A" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <g className="category-art-part" style={{ "--art-preview": "translateY(-1px)", "--art-full": "translateY(-3px)" }}>
          <circle cx="11" cy="14" r="2.6" fill="#E9A23B" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.8 21 C7.5 18.5 9 17.6 11 17.6 C13 17.6 14.5 18.5 15.2 21 Z" fill="#E9A23B" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M18.5 13 H25 M18.5 16.5 H25 M18.5 20 H22.5" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  '/icons/requester/removable-media.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <rect x="10" y="10" width="12" height="19" rx="2.5" fill="#5B6FC9" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <g className="category-art-part" style={{ "--art-preview": "translateY(-1px)", "--art-full": "translateY(-3px)" }}>
          <rect x="12" y="3" width="8" height="7" fill="#C9CDD8" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14.5 5.5 V7 M17.5 5.5 V7" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="13.5" y="17" width="5" height="5" rx="1" fill="#C7D0F5" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  '/icons/requester/security-incident.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <path d="M16 4 L29 27 H3 Z" fill="#E8826A" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <g className="category-art-part" style={{ "--art-preview": "scale(1.12)", "--art-full": "scale(1.32)" }}>
          <path d="M16 12 V19" stroke="#26232B" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="16" cy="23" r="1.3" fill="#26232B" />
        </g>
      </g>
    ),
  },
  '/icons/requester/folder-permission.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <path d="M3.5 9 a2 2 0 0 1 2 -2 H12 L14.5 9.5 H26.5 a2 2 0 0 1 2 2 V24 a2 2 0 0 1 -2 2 H5.5 a2 2 0 0 1 -2 -2 Z" fill="#F2C46D" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <g className="category-art-part" style={{ "--art-preview": "translateX(1px) scale(1.08)", "--art-full": "translateX(3px) scale(1.22)" }}>
          <circle cx="22" cy="20" r="4.2" fill="#FFFFFF" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="22" cy="20" r="1.5" fill="#26232B" />
        </g>
      </g>
    ),
  },
  '/icons/requester/manta-permission.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <rect x="3.5" y="5.5" width="25" height="21" rx="2" fill="#DCE4F7" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 10.5 H28.5" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <g className="category-art-part" style={{ "--art-preview": "translateY(-1px)", "--art-full": "translateY(-2px) scale(1.08)" }}>
          <rect x="7" y="14" width="8" height="8" rx="1" fill="#6C86C9" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.5 15 H25 M18.5 18 H25 M18.5 21 H22.5" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <circle cx="6.5" cy="8" r=".6" fill="#26232B" />
        <circle cx="9" cy="8" r=".6" fill="#26232B" />
      </g>
    ),
  },
  '/icons/requester/network-folder.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <path d="M3.5 7 a2 2 0 0 1 2 -2 H12 L14.5 7.5 H26.5 a2 2 0 0 1 2 2 V19 a2 2 0 0 1 -2 2 H5.5 a2 2 0 0 1 -2 -2 Z" fill="#8CC79A" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <g className="category-art-part" style={{ "--art-preview": "translateY(1px)", "--art-full": "translateY(3px)" }}>
          <path d="M16 21 V25 M8 27.5 H24" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="27.5" r="2" fill="#FFFFFF" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    ),
  },
};

export function CategoryArtwork({ src, size, fallback }) {
  const artwork = ARTWORK[src];
  if (!artwork) return fallback;
  return <svg className="category-artwork" viewBox={artwork.viewBox} width={size} height={size} aria-hidden="true">{artwork.art}</svg>;
}

/** Play the illustration at the point of selection without holding up the category filter. */
export function playCategoryArtwork(button) {
  const artwork = button.querySelector('.category-artwork, .ti');
  if (!artwork) return;

  for (const part of artwork.querySelectorAll('.category-art-part, .category-art-light, .category-art-food-top, .category-art-ingredient, [data-scene-part]')) {
    for (const animation of part.getAnimations()) {
      if (animation.id === 'category-selection') animation.cancel();
    }
  }

  const reduced = prefersReducedMotion();
  const animate = (element, frames, options) => {
    const animation = element.animate(frames, options);
    animation.id = 'category-selection';
  };

  for (const part of artwork.querySelectorAll('.category-art-light')) {
    animate(part, [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 580, easing: EASE_OUT });
  }

  if (reduced) return;
  const part = (name) => artwork.querySelector(`[data-scene-part="${name}"]`);
  const car = part('car');
  if (car) {
    animate(car, [
      { transform: 'none', easing: EASE_IN_OUT },
      { transform: 'translateX(13px)', offset: 0.48 },
      { transform: 'translateX(13px)', offset: 0.83, easing: EASE_OUT },
      { transform: 'none' },
    ], { duration: 800 });
    animate(part('service-check'), [
      { opacity: 0, transform: 'scale(.7)', easing: EASE_OUT },
      { opacity: 1, transform: 'scale(1)', offset: 0.33 },
      { opacity: 1, transform: 'scale(1)', offset: 0.8 },
      { opacity: 0, transform: 'scale(1)' },
    ], { duration: 350, delay: 385 });
    return;
  }

  const wall = part('wall');
  if (wall) {
    animate(wall, [
      { transform: 'none', easing: EASE_IN_OUT },
      { transform: 'translateX(-4.5px)', offset: 0.31 },
      { transform: 'translateX(-4.5px)', offset: 0.68, easing: EASE_OUT },
      { transform: 'none' },
    ], { duration: 760 });
    animate(part('drill'), [
      { transform: 'none' },
      { transform: 'translateX(1px)', offset: 0.29 },
      { transform: 'translateX(-1px)', offset: 0.36 },
      { transform: 'translateX(1px)', offset: 0.43 },
      { transform: 'translateX(-1px)', offset: 0.5 },
      { transform: 'translateX(1px)', offset: 0.57 },
      { transform: 'none', offset: 0.68 },
      { transform: 'none' },
    ], { duration: 760 });
    animate(part('drill-hole'), [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.86 }, { opacity: 0 }], { duration: 500, delay: 260 });
    animate(part('drill-dust'), [
      { opacity: 0, transform: 'none' },
      { opacity: 1, transform: 'translate(-2px, 0)', offset: 0.2 },
      { opacity: 0, transform: 'translate(-7px, 5px)' },
    ], { duration: 285, delay: 250, easing: EASE_OUT });
    return;
  }

  const foodTop = artwork.querySelector('.category-art-food-top');
  if (foodTop) {
    const open = foodTop.dataset.open;
    animate(foodTop, [
      { transform: 'none', easing: EASE_OUT },
      { transform: open, offset: 0.24 },
      { transform: open, offset: 0.74, easing: EASE_IN_OUT },
      { transform: 'none' },
    ], { duration: 740 });
    for (const ingredient of artwork.querySelectorAll('.category-art-ingredient')) {
      const delay = Number(ingredient.dataset.delay ?? 210);
      const hold = ingredient.hasAttribute('data-hold');
      animate(ingredient, [
        { opacity: 0, transform: ingredient.dataset.entry },
        { opacity: 1, offset: 0.18 },
        { opacity: 1, transform: 'none', offset: hold ? 0.4 : 0.82 },
        { opacity: 1, transform: 'none', offset: 0.94 },
        { opacity: 0, transform: hold ? 'none' : 'translateY(2px)' },
      ], { duration: hold ? 530 : 245, delay, easing: EASE_IN_OUT });
    }
    return;
  }
  for (const part of artwork.querySelectorAll('.category-art-part')) {
    const style = getComputedStyle(part);
    const preview = style.getPropertyValue('--art-preview').trim();
    const full = style.getPropertyValue('--art-full').trim();
    animate(part, [
      { transform: 'none', easing: EASE_OUT },
      { transform: preview, offset: 0.2, easing: EASE_IN_OUT },
      { transform: full, offset: 0.55, easing: EASE_OUT },
      { transform: full, offset: 0.72, easing: EASE_OUT },
      { transform: 'none' },
    ], { duration: 580 });
  }

  if (artwork.classList.contains('ti')) {
    for (const animation of artwork.getAnimations()) {
      if (animation.id === 'category-selection') animation.cancel();
    }
    animate(artwork, [{ transform: 'none' }, { transform: 'translateY(-4px) scale(1.25)', offset: 0.45 }, { transform: 'none' }], {
      duration: 500, easing: EASE_OUT,
    });
  }
}
