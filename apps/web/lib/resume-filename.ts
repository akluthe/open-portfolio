import type { ResumeDocument } from '@/lib/shared-types';

/**
 * Reduce arbitrary text to an ASCII, filesystem- and header-safe token: fold
 * accents to ASCII, replace any run of non-alphanumerics with a single dash,
 * trim dashes, and cap length so filenames stay reasonable.
 */
function sanitizeSegment(value: string, maxLength = 60): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics left by NFKD
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** A `YYYY-MM-DD` date if the value looks like an ISO date, else null. */
function isoDate(value: string | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

/**
 * Build a descriptive, collision-resistant download filename for an exported
 * resume, e.g. `Andrew-Kluthe_Senior-Engineering-Manager_2026-05-30.pdf`.
 *
 * Composed of the candidate name, the (possibly tailored) title, and a date —
 * the document's `lastUpdated` when present, otherwise `fallbackDate` (callers
 * pass today's date). Falls back to the slug when name/title are unavailable.
 * The result is ASCII-only so it is safe in a `Content-Disposition` header
 * without RFC 5987 encoding.
 */
export function buildResumeFilename(
  resume: ResumeDocument,
  ext: string,
  opts: { slug: string; fallbackDate: string }
): string {
  const name = sanitizeSegment(resume.basics?.name ?? '');
  const title = sanitizeSegment(resume.basics?.title ?? '');
  const date = isoDate(resume.lastUpdated) ?? opts.fallbackDate;

  const parts = [name, title, date].filter(Boolean);
  const base = parts.length > 0 ? parts.join('_') : sanitizeSegment(opts.slug) || 'resume';
  return `${base}.${ext}`;
}
