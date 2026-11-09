/* Iconos SVG inline (estilo línea, 24x24). Añade nuevos al objeto PATHS. */
const PATHS = {
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />,
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  repeat: (<><path d="M17 2.5l3 3-3 3" /><path d="M4 11.5v-1a5 5 0 015-5h11" /><path d="M7 21.5l-3-3 3-3" /><path d="M20 12.5v1a5 5 0 01-5 5H4" /></>),
  inbox: (<><path d="M3.5 13h5l1.5 2.5h4L15.5 13h5" /><path d="M6 5h12l2.5 8v5.5a1 1 0 01-1 1h-15a1 1 0 01-1-1V13L6 5z" /></>),
  puzzle: <path d="M10 3.5a2 2 0 014 0V6h4v4h-1.5a2 2 0 000 4H18v4.5h-4.5V17a2 2 0 00-4 0v1.5H5V14h1.5a2 2 0 000-4H5V6h5V3.5z" />,
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14a6.5 6.5 0 013.5 6" /></>),
  eyeOff: (<><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0112 5c5 0 9 4.5 9.5 7-.2 1-1 2.5-2.4 3.9M6.6 6.6C4.4 8 2.8 10.4 2.5 12c.5 2.5 4.5 7 9.5 7 1.7 0 3.2-.5 4.5-1.2" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></>),
  zap: <path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12l1-8z" />,
  trendingUp: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  timer: (<><circle cx="12" cy="13.5" r="7.5" /><path d="M12 10v3.5l2 2M9.5 2.5h5" /></>),
  link: (<><path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1" /></>),
  target: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>),
  shield: (<><path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>),
  magnet: (<><path d="M5 3.5h4v8a3 3 0 006 0v-8h4v8a7 7 0 01-14 0v-8z" /><path d="M5 8h4M15 8h4" /></>),
  message: <path d="M20.5 11.5a8.5 8.5 0 01-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1120.5 11.5z" />,
  calendar: (<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 2.5v4M16 2.5v4" /></>),
  sparkles: (<><path d="M11 3l1.8 4.7L17.5 9.5l-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8L11 3z" /><path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" /></>),
  headset: (<><path d="M4 14v-2a8 8 0 0116 0v2" /><rect x="3" y="13.5" width="4" height="6" rx="1.5" /><rect x="17" y="13.5" width="4" height="6" rx="1.5" /><path d="M19 19.5a3 3 0 01-3 2h-3" /></>),
  fileText: (<><path d="M14 2.5H6.5a1 1 0 00-1 1v17a1 1 0 001 1h11a1 1 0 001-1V7L14 2.5z" /><path d="M14 2.5V7h4.5M9 12.5h6M9 16.5h6" /></>),
  refresh: (<><path d="M20 4.5v5h-5" /><path d="M4 19.5v-5h5" /><path d="M5.5 9a7 7 0 0112.3-2L20 9.5M18.5 15a7 7 0 01-12.3 2L4 14.5" /></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5L12 13l8.5-6.5" /></>),
  database: (<><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13" /><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" /></>),
  bot: (<><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 13.5v1M15 13.5v1" /><circle cx="12" cy="3.5" r="1" /></>),
};

export default function Icon({ name, size = 20, strokeWidth = 1.8, className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
