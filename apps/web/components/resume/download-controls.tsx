'use client';

import { useState } from 'react';

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
      <label className="resume-style">
        <span className="resume-style-label">Layout</span>
        <select
          className="resume-style-select"
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
      <a className="resume-action" href={`${basePath}/pdf${query}`} download>
        Download PDF
      </a>
      <a className="resume-action" href={`${basePath}/typst${query}`} download>
        Download Typst
      </a>
    </>
  );
}
