/** Stroke-only 24x24 icons. Decorative: always `aria-hidden`. */
const PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z',
  list: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  sync: 'M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  alert: 'M12 3l10 18H2zM12 10v4M12 17h.01',
  check: 'M5 12l5 5 9-10',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  car: 'M4 16h16M6 16l1.6-5.2A2 2 0 0 1 9.5 9.5h5a2 2 0 0 1 1.9 1.3L18 16M7 16v2.5M17 16v2.5M9 13h6',
  cup: 'M5 8h12v5a6 6 0 0 1-12 0zM17 9h2a2 2 0 0 1 0 4h-2M8 3v2M11 3v2M14 3v2',
  shirt: 'M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8z',
  scissors: 'M6 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 8l12 10M8 16L20 6',
  truck: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  hammer: 'M14 5l5 5M12 7l5-4 4 4-4 5M13 9l-9 9 2 2 9-9',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  x: 'M6 6l12 12M18 6L6 18',
  clip: 'M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7L10 17.4a1.7 1.7 0 0 1-2.4-2.4L15.5 7',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0-.01',
  building: 'M4 21V5l8-2v18M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  down: 'M6 9l6 6 6-6',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  up: 'M6 15l6-6 6 6',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  logout: 'M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9',
};



export function Icon({ name, className = '' }) {
  const path = (PATHS)[name] ?? PATHS.layers;
  return (
    <svg className={`ico ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
}
