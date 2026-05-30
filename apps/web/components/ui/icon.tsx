import type { CSSProperties, ReactNode } from 'react';

/**
 * Minimal stroke icon set (Lucide-ish, 1.6px) for the Letterpress UI.
 * Usage: <Icon name="download" size={16} />
 */
const ICON_PATHS: Record<string, ReactNode> = {
  download: (
    <>
      <path d="M12 3v12M7 11l5 5 5-5" />
      <path d="M4 19h16" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3z" />
      <path d="M14 6l3 3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  check: <path d="M5 12l4 4L19 7" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  chevronr: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 18l-6-6 6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </>
  ),
  restore: (
    <>
      <path d="M3 8a9 9 0 1 1-1.5 5" />
      <path d="M3 3v5h5" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V4h12" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h12l3 3v13H5z" />
      <path d="M8 4v5h7V4" />
      <path d="M8 14h8v6H8z" />
    </>
  ),
  arrowr: <path d="M5 12h14M13 6l6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  )
};

export type IconName = keyof typeof ICON_PATHS;

type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
};

export default function Icon({ name, size = 17, stroke = 1.6, className = '', style }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: '0 0 auto', ...style }}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
