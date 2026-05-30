'use client';

import { useState } from 'react';
import Icon from '@/components/ui/icon';

/**
 * Layout styles offered for PDF/Typst export. Kept in sync with `TYPST_STYLES`
 * in `lib/resume-typst.ts` — duplicated here (rather than imported) because
 * that module pulls in `node:fs`/`node:path` and must not enter the client
 * bundle.
 */
const STYLE_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'twocol', label: 'Two-column' },
  { value: 'sidebar', label: 'Sidebar' }
] as const;

type DownloadControlsProps = {
  /** API base for this resume, e.g. `/api/resumes/main` or `/api/profiles/databank`. */
  basePath: string;
};

/**
 * Style picker + download links for the public resume pages. Choosing a layout
 * updates the `?style=` on both the PDF and Typst download links so the user
 * gets the selected layout without editing the URL by hand.
 */
export default function DownloadControls({ basePath }: DownloadControlsProps) {
  const [style, setStyle] = useState<(typeof STYLE_OPTIONS)[number]['value']>('classic');
  const query = `?style=${style}`;

  return (
    <>
      <label className="r-style">
        <span className="r-style-label">Style</span>
        <select
          className="select"
          value={style}
          onChange={(event) => setStyle(event.target.value as typeof style)}
          aria-label="Resume layout style"
        >
          {STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="spacer" />
      <a className="btn btn-ghost btn-sm" href={`${basePath}/typst${query}`} download>
        <Icon name="download" size={15} /> Typst
      </a>
      <a className="btn btn-acc btn-sm" href={`${basePath}/pdf${query}`} download>
        <Icon name="download" size={15} /> Download PDF
      </a>
    </>
  );
}
