'use client';

import { useEffect, useRef } from 'react';
import { EASE_IN_OUT, EASE_OUT, prefersReducedMotion } from '@/lib/motion';

/** Existing category illustrations with the parts that move isolated in SVG groups. */
const ARTWORK = {
  '/icons/domains/1.svg': {
    viewBox: '0 0 42 42',
    art: (
      <g fill="none">
        <g data-scene-part="shared-car" style={{ transformBox: 'view-box', transformOrigin: '21px 37px' }}>
          <path d="M10.5 6.12 L6.67 18.37 H35.33 L31.5 6.12 L30.3 6.03 C24.11 5.51 17.89 5.51 11.7 6.03Z" fill="#D33D3D" fillOpacity="0.22" />
          <path d="M6.67 18.37 C5.84 18.37 5.13 18.96 4.98 19.77 C4.75 20.95 4.46 22.6 4.38 23.63 C4.19 25.74 4.67 29.08 4.99 30.97 C5.13 31.79 5.84 32.37 6.68 32.37 H35.32 C36.16 32.37 36.87 31.79 37.01 30.97 C37.33 29.08 37.81 25.74 37.63 23.63 C37.54 22.6 37.25 20.95 37.02 19.77 C36.87 18.96 36.16 18.37 35.33 18.37Z" fill="#D33D3D" />
          <path d="M8.75 32.37 V36.75 H14 V32.37 M28 32.37 V36.75 H33.25 V32.37 M35 16.63 H38.5 M7 16.63 H3.5 M22.75 25.37 H19.25 M6.67 18.37 L10.5 6.12 L11.7 6.03 C17.89 5.51 24.11 5.51 30.3 6.03 L31.5 6.12 L35.33 18.37 M6.67 18.37 H35.33" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10.6" cy="25.4" r="1.6" fill="#FFF3D1" stroke="black" strokeWidth="1" />
          <circle cx="31.4" cy="25.4" r="1.6" fill="#FFF3D1" stroke="black" strokeWidth="1" />
          <g data-scene-part="lights" className="category-art-scene-effect">
            <circle cx="10.6" cy="25.4" r="3" fill="#FFDF75" />
            <circle cx="31.4" cy="25.4" r="3" fill="#FFDF75" />
            <path d="M7 25.4 H3 M35 25.4 H39" stroke="#FFDF75" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        </g>
        <g data-scene-part="fob" className="category-art-scene-effect">
          <rect x="33" y="-3" width="6" height="9" rx="2" fill="#3E5C8A" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="36" cy="0.5" r="1" fill="#9ED3F0" />
        </g>
        <g data-scene-part="waves" className="category-art-scene-effect" stroke="#3E5C8A" strokeWidth="1.3" strokeLinecap="round">
          <path d="M30 1 a5 5 0 0 0 0 5" />
          <path d="M27.5 -1 a8 8 0 0 0 0 9" />
        </g>
      </g>
    ),
  },
  '/icons/domains/2.svg': {
    viewBox: '0 0 48 48',
    art: (
      <g fill="none">
        <path d="M4 20 L24 7 L44 20 V42 H4Z" fill="#E1EAF2" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.5 20.5 L24 6 L45.5 20.5" stroke="#48657B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="11" y="23" width="26" height="19" fill="#4A5563" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        {/* a D-Max style pickup: bed at the back, cab, hood; it parks wholly inside the door frame */}
        <g data-scene-part="pickup" style={{ transformBox: 'view-box', transformOrigin: '0 0' }}>
          <g transform="translate(12.2 24.6)">
            <path d="M1 8 H10.5 V5 Q10.5 4 11.5 4 H16.5 L19.5 8.3 H22 Q23.5 8.6 23.5 10.4 V13.6 H1 Z" fill="#8E9AA6" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.3 5.5 H16 L18 8.2 H12.3 Z" fill="#D9F1F7" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
            <path d="M1 8 H10.5 M21.6 10.4 H23" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1" />
            <circle cx="5.5" cy="14" r="2.4" fill="#33404C" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18.8" cy="14" r="2.4" fill="#33404C" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
        <g data-scene-part="garage-door" style={{ transformBox: 'view-box', transformOrigin: '24px 23px' }}>
          <rect x="11" y="23" width="26" height="19" fill="#B0C4D5" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 27.8 H37 M11 32.5 H37 M11 37.2 H37" stroke="#7F98AD" strokeWidth="1.2" />
        </g>
        <path d="M2 42 H46" stroke="#26232B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
      <g fill="none" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <g data-scene-part="speed" className="category-art-scene-effect" stroke="#9AA3AE" strokeWidth="1.6">
          <path d="M0 14 H2.5 M-1 19.5 H2 M0 25 H2.5" />
        </g>
        <g data-scene-part="truck">
          <path d="M33.25 31.5H36.75C37.7 31.5 38.5 30.7 38.5 29.75V23.36C38.5 22.97 38.36 22.58 38.12 22.27L32.03 14.66C31.69 14.24 31.19 14 30.66 14H24.5V31.5Z" fill="#E4E7EB" />
          <path d="M27 16.5 H30.2 L34.5 22 H27 Z" fill="#BFE3F2" strokeWidth="1" />
          <g data-scene-part="cargo">
            <path d="M24.5 31.5V10.5C24.5 8.57 22.93 7 21 7H7C5.07 7 3.5 8.57 3.5 10.5V29.75C3.5 30.72 4.28 31.5 5.25 31.5H8.75" fill="#F0B398" />
            <path d="M10 13 H18 M10 17.5 H15" stroke="#C9785B" strokeWidth="1.6" />
          </g>
          <path d="M26.25 31.5H15.75" />
          <circle cx="29.75" cy="31.5" r="3.5" fill="#7E7E7E" />
          <circle cx="12.25" cy="31.5" r="3.5" fill="#7E7E7E" />
          <g data-scene-part="wheel" style={{ transformOrigin: '12.25px 31.5px', transformBox: 'view-box' }}><path d="M12.25 29 V34" stroke="#fff" /></g>
          <g data-scene-part="wheel" style={{ transformOrigin: '29.75px 31.5px', transformBox: 'view-box' }}><path d="M29.75 29 V34" stroke="#fff" /></g>
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
      <g fill="none" transform="rotate(-45 16 16)">
        <rect x="3.5" y="12.5" width="6.5" height="7" rx="0.8" fill="#C9CDD8" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.8 15 H7.2 M5.8 17 H7.2" stroke="#26232B" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="9.5" y="10.5" width="17" height="11" rx="2.6" fill="#5B6FC9" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 13.5 V18.5" stroke="#8FA0E6" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="22.5" cy="16" r="1.3" fill="#C7D0F5" />
        <circle className="category-art-light" cx="22.5" cy="16" r="1.4" fill="#7CF29A" />
        <g data-scene-part="usb-cap" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <rect x="2" y="10.5" width="11" height="11" rx="2.4" fill="#3F52A8" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 13.5 V18.5" stroke="#8FA0E6" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </g>
    ),
  },
  '/icons/requester/security-incident.svg': {
    viewBox: '0 0 32 32',
    art: (
      // an eye (monitoring) that turns like a coin into a flashing alarm light
      <g fill="none">
        <g data-scene-part="incident-coin" style={{ transformBox: 'view-box', transformOrigin: '16px 16px' }}>
          <g data-scene-part="incident-eye">
            <path d="M2.5 16 C6.5 9 11 6.5 16 6.5 C21 6.5 25.5 9 29.5 16 C25.5 23 21 25.5 16 25.5 C11 25.5 6.5 23 2.5 16 Z" fill="#DCE4F7" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <g data-scene-part="incident-pupil">
              <circle cx="16" cy="16" r="5" fill="#3E5C8A" stroke="#26232B" strokeWidth="1.6" />
              <circle cx="17.5" cy="14.5" r="1.4" fill="#FFFFFF" />
            </g>
          </g>
          <g data-scene-part="incident-alarm" className="category-art-scene-effect">
            <path d="M9 22 V15 a7 7 0 0 1 14 0 V22 Z" fill="#E8826A" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="6" y="22" width="20" height="5" rx="1.5" fill="#9AA3AE" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.5 15.5 a3.5 3.5 0 0 1 3.5 -3.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
            <g data-scene-part="incident-rays" className="category-art-scene-effect" stroke="#F2A53A" strokeWidth="1.8" strokeLinecap="round">
              <path d="M16 2.5 V5 M5 7 L7 9 M27 7 L25 9 M2.5 16 H5 M29.5 16 H27" />
            </g>
          </g>
        </g>
      </g>
    ),
  },
  '/icons/requester/folder-permission.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <path d="M3.5 9 a2 2 0 0 1 2 -2 H12 L14.5 9.5 H26.5 a2 2 0 0 1 2 2 V24 a2 2 0 0 1 -2 2 H5.5 a2 2 0 0 1 -2 -2 Z" fill="#E0A94A" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 13 H28.5 V24 a2 2 0 0 1 -2 2 H5.5 a2 2 0 0 1 -2 -2 Z" fill="#F2C46D" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle data-scene-part="folder-glow" className="category-art-scene-effect" cx="16" cy="19" r="9" fill="#7CF29A" />
        <g data-scene-part="folder-shackle" style={{ transformBox: 'view-box', transformOrigin: '23.5px 17px' }}>
          <path d="M17.5 17 V14.5 a3 3 0 0 1 6 0 V17" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="15.5" y="17" width="10" height="7.5" rx="1.4" fill="#5B6FC9" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20.5" cy="20.7" r="1.1" fill="#FFFFFF" />
      </g>
    ),
  },
  '/icons/requester/manta-permission.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <rect x="3.5" y="5.5" width="25" height="21" rx="2" fill="#DCE4F7" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 10.5 H28.5" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6.5" cy="8" r=".6" fill="#26232B" />
        <circle cx="9" cy="8" r=".6" fill="#26232B" />
        <path d="M7 14.5 H15" stroke="#6C86C9" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="18.5" y="12.8" width="7" height="3.4" rx="1.7" fill="#C9CDD8" stroke="#26232B" strokeWidth="1.1" />
        <rect data-scene-part="switch-on-0" className="category-art-scene-effect" x="18.5" y="12.8" width="7" height="3.4" rx="1.7" fill="#2FA85A" stroke="#26232B" strokeWidth="1.1" />
        <circle data-scene-part="switch-knob-0" cx="20.2" cy="14.5" r="1.3" fill="#FFFFFF" stroke="#26232B" strokeWidth="0.9" />
        <path d="M7 18.5 H15" stroke="#6C86C9" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="18.5" y="16.8" width="7" height="3.4" rx="1.7" fill="#C9CDD8" stroke="#26232B" strokeWidth="1.1" />
        <rect data-scene-part="switch-on-1" className="category-art-scene-effect" x="18.5" y="16.8" width="7" height="3.4" rx="1.7" fill="#2FA85A" stroke="#26232B" strokeWidth="1.1" />
        <circle data-scene-part="switch-knob-1" cx="20.2" cy="18.5" r="1.3" fill="#FFFFFF" stroke="#26232B" strokeWidth="0.9" />
        <path d="M7 22.5 H15" stroke="#6C86C9" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="18.5" y="20.8" width="7" height="3.4" rx="1.7" fill="#C9CDD8" stroke="#26232B" strokeWidth="1.1" />
        <rect data-scene-part="switch-on-2" className="category-art-scene-effect" x="18.5" y="20.8" width="7" height="3.4" rx="1.7" fill="#2FA85A" stroke="#26232B" strokeWidth="1.1" />
        <circle data-scene-part="switch-knob-2" cx="20.2" cy="22.5" r="1.3" fill="#FFFFFF" stroke="#26232B" strokeWidth="0.9" />
      </g>
    ),
  },
  '/icons/requester/network-folder.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <path d="M3.5 6 a2 2 0 0 1 2 -2 H11 L13 6 H22.5 a2 2 0 0 1 2 2 V15 a2 2 0 0 1 -2 2 H5.5 a2 2 0 0 1 -2 -2 Z" fill="#8CC79A" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 17 V22 M5 22 H27 M5 22 V25 M27 22 V25 M14 22 V25" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect data-scene-part="net-node-0" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} x="2.5" y="25" width="5" height="4" rx="1" fill="#FFFFFF" stroke="#26232B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <rect data-scene-part="net-node-1" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} x="11.5" y="25" width="5" height="4" rx="1" fill="#FFFFFF" stroke="#26232B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <rect data-scene-part="net-node-2" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} x="24.5" y="25" width="5" height="4" rx="1" fill="#FFFFFF" stroke="#26232B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <circle data-scene-part="net-packet-0" data-dx="-9" className="category-art-scene-effect" cx="14" cy="17" r="1.4" fill="#2C6FD3" />
        <circle data-scene-part="net-packet-1" data-dx="0" className="category-art-scene-effect" cx="14" cy="17" r="1.4" fill="#2C6FD3" />
        <circle data-scene-part="net-packet-2" data-dx="13" className="category-art-scene-effect" cx="14" cy="17" r="1.4" fill="#2C6FD3" />
      </g>
    ),
  },
  '/icons/requester/infosec.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <path d="M16 3 L26 7 V15 C26 21.5 21.6 26.5 16 29 C10.4 26.5 6 21.5 6 15 V7 Z" fill="#8FB3E8" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path className="category-art-light" d="M16 5.5 L23.6 8.6 V15 C23.6 20 20.4 24 16 26.3" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
        <g data-scene-part="lock-shackle" className="category-art-part" style={{ "--art-preview": "translateY(-1px)", "--art-full": "translateY(-2.5px)" }}>
          <path d="M13.5 15 V13 a2.5 2.5 0 0 1 5 0 V15"stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="12" y="15" width="8" height="7" rx="1.2" fill="#F2C14E" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 18 V19.5" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  '/icons/requester/it.svg': {
    viewBox: '0 0 32 32',
    art: (
      <g fill="none">
        <rect x="3.5" y="5" width="25" height="17" rx="2" fill="#3E5C8A" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="6" y="7.5" width="20" height="12" rx="1" fill="#9ED3F0" />
        <path data-scene-part="chart" d="M7.5 16.5 L11.5 12.5 L14.5 15 L18.5 10.5 L24 15" pathLength="100" stroke="#3E5C8A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle data-scene-part="chart-dot" className="category-art-scene-effect" cx="24" cy="15" r="1.6" fill="#2FA85A" stroke="#FFFFFF" strokeWidth="0.8" />
        <path d="M12 27 H20 M16 22 V27" stroke="#26232B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
};

/** Whether an image path has an animated version here. */
export const hasCategoryArtwork = (src) => Boolean(ARTWORK[src]);

/** The control a picture sits in; hovering it (a real pointer) plays the picture's sequence. */
const HOST = 'a[href], button, .ticket, .dgroup, .dtile, [role="button"], [role="option"]';

/**
 * The animated version of a category / type illustration (by its image path), else `fallback`. Hovering the button,
 * link or row it sits in plays its short sequence once.
 */
/**
 * `playOn`: "hover" plays the sequence when a mouse enters its control; "click" gives only a small taste of it on hover
 * and plays it in full when the control is pressed; "state" shows its control's open state instead (aria-expanded).
 */
export function CategoryArtwork({ src, size, fallback = null, className = '', playOn = 'hover' }) {
  const ref = useRef(null);
  const artwork = ARTWORK[src];

  useEffect(() => {
    const svg = ref.current;
    const host = svg?.closest(HOST);
    if (!host || playOn === 'state') return undefined;
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    // the security incident in a pressable category: a glance around on hover; the selected category's eye becomes the alarm
    if (playOn === 'click' && svg.querySelector('[data-scene-part="incident-coin"]')) {
      const pressed = () => host.getAttribute('aria-pressed') === 'true';
      setIncidentAlarm(svg, pressed(), false);
      const watch = new MutationObserver(() => {
        // picked: the eye stops looking around as it turns into the alarm
        if (pressed()) stopIncidentGlance(svg, false);
        setIncidentAlarm(svg, pressed(), true);
      });
      watch.observe(host, { attributes: true, attributeFilter: ['aria-pressed'] });
      // the eye looks around only while the mouse is on the icon itself (its frame); leaving brings the pupil back
      const icon = svg.closest('.ic') ?? svg;
      const onEnter = (event) => {
        if (event.pointerType === 'mouse' && !pressed()) startIncidentGlance(svg);
      };
      const onLeave = () => stopIncidentGlance(svg);
      if (mouse) {
        icon.addEventListener('pointerenter', onEnter);
        icon.addEventListener('pointerleave', onLeave);
      }
      return () => {
        watch.disconnect();
        icon.removeEventListener('pointerenter', onEnter);
        icon.removeEventListener('pointerleave', onLeave);
        stopIncidentGlance(svg, false);
      };
    }
    const onEnter = (event) => {
      if (event.pointerType !== 'mouse') return;
      if (playOn === 'click') previewArtwork(svg);
      else playArtwork(svg);
    };
    const onClick = () => playArtwork(svg);
    if (mouse) host.addEventListener('pointerenter', onEnter);
    if (playOn === 'click') host.addEventListener('click', onClick);
    return () => {
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('click', onClick);
    };
  }, [artwork, playOn]);

  if (!artwork) return fallback;
  return (
    <svg ref={ref} className={`category-artwork${playOn === 'state' ? ' art-state' : playOn === 'click' ? ' art-click' : ''} ${className}`.trim()} viewBox={artwork.viewBox} width={size} height={size} aria-hidden="true">
      {artwork.art}
    </svg>
  );
}

/** Where the pupil can look (px from the middle): sideways further than up / down, so it stays inside the eye. */
const GLANCES = [[4, 0], [-4, 0], [0, -2.5], [0, 2.5], [3, -2], [-3, -2], [3, 2], [-3, 2]];
/** A glance: the move to a spot and the pause there (ms). */
const GLANCE_MOVE_MS = 420;
const GLANCE_HOLD_MS = 320;

/** The pupil's glancing per picture, while the mouse is on it: the glance playing and the spot it looked at last. */
const glancing = new WeakMap();

/** Where the pupil is drawn right now (mid-move too), as a transform string. */
const pupilNow = (pupil) => getComputedStyle(pupil).transform;

/** The security incident's eye starts looking around: one random spot after another (never the same twice), until it stops. */
function startIncidentGlance(svg) {
  if (prefersReducedMotion()) return;
  const pupil = svg.querySelector('[data-scene-part="incident-pupil"]');
  if (!pupil || glancing.has(svg)) return;
  const state = { animation: null, last: null };
  glancing.set(svg, state);
  const next = () => {
    if (glancing.get(svg) !== state) return;
    let spot;
    do spot = GLANCES[Math.floor(Math.random() * GLANCES.length)];
    while (spot === state.last);
    state.last = spot;
    const to = `translate(${spot[0]}px, ${spot[1]}px)`;
    const total = GLANCE_MOVE_MS + GLANCE_HOLD_MS;
    // from wherever it is to the spot, then it rests there a moment (the glance before it is read, then let go)
    const from = pupilNow(pupil);
    state.animation?.cancel();
    state.animation = pupil.animate(
      [{ transform: from, easing: EASE_IN_OUT }, { transform: to, offset: GLANCE_MOVE_MS / total }, { transform: to }],
      { duration: total, fill: 'forwards' },
    );
    state.animation.onfinish = next;
  };
  next();
}

/** The eye stops looking around: the pupil glides back to the middle from where it is (`animated` false: at once). */
function stopIncidentGlance(svg, animated = true) {
  const state = glancing.get(svg);
  if (!state) return;
  glancing.delete(svg);
  const pupil = svg.querySelector('[data-scene-part="incident-pupil"]');
  if (!pupil) return;
  const from = pupilNow(pupil);
  state.animation?.cancel();
  if (!animated) return;
  pupil.animate([{ transform: from }, { transform: 'none' }], { duration: GLANCE_MOVE_MS, easing: EASE_IN_OUT });
}

/**
 * Shows the security incident as the alarm (`alarm` true) or the eye, and keeps it: turned like a coin when `animated`
 * (the eye squeezes to its edge, the other face opens out; the alarm flashes once as it arrives), at once otherwise.
 */
function setIncidentAlarm(svg, alarm, animated) {
  const part = (name) => svg.querySelector(`[data-scene-part="${name}"]`);
  const coin = part('incident-coin');
  const eye = part('incident-eye');
  const light = part('incident-alarm');
  if (!coin || !eye || !light) return;
  for (const animation of coin.getAnimations()) animation.cancel();
  const show = () => {
    eye.style.opacity = alarm ? '0' : '1';
    light.style.opacity = alarm ? '1' : '0';
  };
  if (!animated || prefersReducedMotion()) {
    show();
    return;
  }
  const close = coin.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 170, easing: 'ease-in' });
  close.onfinish = () => {
    show();
    coin.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 220, easing: 'ease-out' });
    const rays = part('incident-rays');
    if (alarm && rays) rays.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0, offset: 0.6 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 700, delay: 120 });
  };
}

/** Play the illustration at the point of selection without holding up the category filter. */
export function playCategoryArtwork(button) {
  const artwork = button.querySelector('.category-artwork, .ti');
  if (artwork) playArtwork(artwork);
}

/**
 * A small taste of the sequence (hover, when the full one waits for a click): the parts that have a preview pose
 * (--art-preview) lean into it and back; a scene without one gives its main part a tiny lift.
 */
function previewArtwork(artwork) {
  // the disk-on-key's cap follows hover / selection in CSS (components.css, .art-click)
  if (prefersReducedMotion() || artwork.querySelector('[data-scene-part="usb-cap"]')) return;
  const lean = (element, to) => {
    for (const animation of element.getAnimations()) if (animation.id === 'category-preview') animation.cancel();
    const animation = element.animate([{ transform: 'none' }, { transform: to, offset: 0.45 }, { transform: 'none' }], { duration: 440, easing: EASE_IN_OUT });
    animation.id = 'category-preview';
  };
  const posed = [...artwork.querySelectorAll('.category-art-part')]
    .map((part) => [part, getComputedStyle(part).getPropertyValue('--art-preview').trim()])
    .filter(([, pose]) => pose && pose !== 'none');
  if (posed.length) {
    for (const [part, pose] of posed) lean(part, pose);
    return;
  }
  // the security incident: the eye starts to turn, as if about to become the alarm, and turns back
  const coin = artwork.querySelector('[data-scene-part="incident-coin"]');
  if (coin) {
    lean(coin, 'scaleX(.55)');
    return;
  }
  // the garage: its door lifts a little (the pickup behind it stays hidden)
  const door = artwork.querySelector('[data-scene-part="garage-door"]');
  if (door) {
    lean(door, 'scaleY(.82)');
    return;
  }
  const main = artwork.querySelector('.category-art-food-top, [data-scene-part]:not(.category-art-scene-effect)');
  lean(main ?? artwork, 'translateY(-1.5px)');
}

/** Play one illustration's sequence (an inline .category-artwork or .ti svg). */
function playArtwork(artwork) {

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
  // the USB cap follows hover / selection in CSS (components.css), not a one-shot sequence
  if (part('usb-cap')) return;

  const coin = part('incident-coin');
  if (coin) {
    // the eye turns like a coin into the alarm light, which flashes; then it turns back
    const TURN = 1500;
    animate(coin, [
      { transform: 'scaleX(1)', easing: 'ease-in' },
      { transform: 'scaleX(0)', offset: 0.18, easing: 'ease-out' },
      { transform: 'scaleX(1)', offset: 0.36 },
      { transform: 'scaleX(1)', offset: 0.72, easing: 'ease-in' },
      { transform: 'scaleX(0)', offset: 0.86, easing: 'ease-out' },
      { transform: 'scaleX(1)' },
    ], { duration: TURN });
    const swap = (from, to) => [{ opacity: from }, { opacity: from, offset: 0.179 }, { opacity: to, offset: 0.18 }, { opacity: to, offset: 0.859 }, { opacity: from, offset: 0.86 }, { opacity: from }];
    animate(part('incident-eye'), swap(1, 0), { duration: TURN });
    animate(part('incident-alarm'), swap(0, 1), { duration: TURN });
    animate(part('incident-rays'), [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0, offset: 0.5 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 700, delay: 470 });
    return;
  }

  const shackle = part('folder-shackle');
  if (shackle) {
    animate(shackle, [
      { transform: 'none' },
      { transform: 'translateY(-2.5px)', offset: 0.25, easing: 'cubic-bezier(.34, 1.56, .64, 1)' },
      { transform: 'translateY(-2.5px) rotate(40deg)', offset: 0.45 },
      { transform: 'translateY(-2.5px) rotate(40deg)', offset: 0.78 },
      { transform: 'none' },
    ], { duration: 1100, easing: EASE_IN_OUT });
    const glow = part('folder-glow');
    glow.style.transformBox = 'fill-box';
    glow.style.transformOrigin = 'center';
    animate(glow, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 0.6, offset: 0.4 }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 600, delay: 450, easing: EASE_OUT });
    return;
  }

  if (part('switch-knob-0')) {
    // the permission switches turn on one after another
    for (const i of [0, 1, 2]) {
      const timing = { duration: 1300 - i * 180, delay: i * 180 };
      animate(part(`switch-knob-${i}`), [
        { transform: 'none' },
        { transform: 'translateX(3.6px)', offset: 0.2, easing: 'cubic-bezier(.34, 1.56, .64, 1)' },
        { transform: 'translateX(3.6px)', offset: 0.82 },
        { transform: 'none' },
      ], { ...timing, easing: EASE_IN_OUT });
      animate(part(`switch-on-${i}`), [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.82 }, { opacity: 0 }], timing);
    }
    return;
  }

  if (part('net-packet-0')) {
    // data runs down the cable from the folder to each station, which lights up
    for (const i of [0, 1, 2]) {
      const packet = part(`net-packet-${i}`);
      const dx = Number(packet.dataset.dx);
      animate(packet, [
        { opacity: 1, transform: 'none' },
        { transform: 'translate(0, 5px)', offset: 0.4 },
        { transform: `translate(${dx}px, 5px)`, offset: 0.8 },
        { opacity: 1, transform: `translate(${dx}px, 8px)`, offset: 0.95 },
        { opacity: 0, transform: `translate(${dx}px, 8px)` },
      ], { duration: 750, delay: i * 120, easing: 'linear' });
      animate(part(`net-node-${i}`), [
        { fill: '#FFFFFF', transform: 'none' },
        { fill: '#7CF29A', transform: 'scale(1.2)', offset: 0.3 },
        { fill: '#7CF29A', transform: 'none', offset: 0.7 },
        { fill: '#FFFFFF' },
      ], { duration: 600, delay: 720 + i * 120 });
    }
    return;
  }

  const sharedCar = part('shared-car');
  if (sharedCar) {
    animate(sharedCar, [
      { transform: 'none' },
      { transform: 'translateY(1.5px) scaleY(.94)', offset: 0.18 },
      { transform: 'translateY(-2px)', offset: 0.4 },
      { transform: 'none', offset: 0.6 },
      { transform: 'none' },
    ], { duration: 900, easing: EASE_IN_OUT });
    animate(part('fob'), [
      { opacity: 0, transform: 'scale(.4) rotate(-20deg)' },
      { opacity: 1, transform: 'scale(1.1)', offset: 0.25 },
      { opacity: 1, transform: 'none', offset: 0.8 },
      { opacity: 0, transform: 'none' },
    ], { duration: 1000, easing: EASE_OUT });
    for (const delay of [150, 600]) {
      animate(part('waves'), [{ opacity: 0, transform: 'none' }, { opacity: 1, offset: 0.3 }, { opacity: 0, transform: 'translateX(-3px)' }], { duration: 450, delay });
    }
    animate(part('lights'), [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0, offset: 0.5 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 700, delay: 250 });
    return;
  }

  const pickup = part('pickup');
  if (pickup) {
    // the door rolls up, the pickup drives in from the right, the door comes down behind it (it rests hidden inside)
    animate(part('garage-door'), [
      { transform: 'none', easing: EASE_IN_OUT },
      { transform: 'scaleY(.06)', offset: 0.25 },
      { transform: 'scaleY(.06)', offset: 0.62, easing: EASE_IN_OUT },
      { transform: 'none', offset: 0.85 },
      { transform: 'none' },
    ], { duration: 1500 });
    animate(pickup, [
      { opacity: 0, transform: 'translateX(26px)' },
      { opacity: 1, transform: 'translateX(26px)', offset: 0.2 },
      { transform: 'translateX(26px)', offset: 0.28, easing: EASE_IN_OUT },
      { opacity: 1, transform: 'none', offset: 0.58 },
      { opacity: 1, transform: 'none' },
    ], { duration: 1500 });
    return;
  }

  const chart = part('chart');
  if (chart) {
    animate(chart, [{ strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDasharray: 100, strokeDashoffset: 0 }], { duration: 520, easing: EASE_IN_OUT });
    animate(part('chart-dot'), [
      { opacity: 0, transform: 'scale(.4)' },
      { opacity: 1, transform: 'scale(1.25)', offset: 0.4 },
      { opacity: 1, transform: 'scale(1)', offset: 0.8 },
      { opacity: 0, transform: 'scale(1)' },
    ], { duration: 520, delay: 440, easing: EASE_OUT });
    return;
  }

  const truck = part('truck');
  if (truck) {
    animate(truck, [
      { transform: 'none', easing: EASE_IN_OUT },
      { transform: 'translateX(3px)', offset: 0.45 },
      { transform: 'translateX(3px)', offset: 0.7, easing: EASE_IN_OUT },
      { transform: 'none' },
    ], { duration: 780 });
    animate(part('cargo'), [
      { transform: 'none' },
      { transform: 'translateY(-1px)', offset: 0.2 },
      { transform: 'none', offset: 0.36 },
      { transform: 'translateY(-0.5px)', offset: 0.5 },
      { transform: 'none' },
    ], { duration: 780, easing: EASE_IN_OUT });
    for (const wheel of artwork.querySelectorAll('[data-scene-part="wheel"]')) {
      animate(wheel, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 600, easing: EASE_IN_OUT });
    }
    animate(part('speed'), [
      { opacity: 0, transform: 'none' },
      { opacity: 1, transform: 'translateX(-1px)', offset: 0.3 },
      { opacity: 0, transform: 'translateX(-3px)' },
    ], { duration: 420, delay: 80, easing: EASE_OUT });
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
