import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { ResumeDocument } from '@/lib/shared-types';

/**
 * Supported layout styles. The matching `<style>.typ` files live in
 * `templates/` and are dispatched by `templates/resume.typ` via `sys.inputs`.
 */
export const TYPST_STYLES = ['classic', 'twocol', 'sidebar'] as const;
export type TypstStyle = (typeof TYPST_STYLES)[number];
export const DEFAULT_TYPST_STYLE: TypstStyle = 'classic';

export function isTypstStyle(value: unknown): value is TypstStyle {
  return typeof value === 'string' && (TYPST_STYLES as readonly string[]).includes(value);
}

/**
 * Coerce an arbitrary `?style=` query value to a valid style, falling back to
 * the default for anything unknown/absent.
 */
export function normalizeTypstStyle(value: string | null | undefined): TypstStyle {
  return isTypstStyle(value) ? value : DEFAULT_TYPST_STYLE;
}

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

// The `.typ` files that make up the design package, addSource'd into the WASM
// compiler's virtual filesystem under `/<name>.typ`. `resume.typ` is the entry.
export const TYPST_TEMPLATE_FILES = [
  'theme.typ',
  'classic.typ',
  'twocol.typ',
  'sidebar.typ',
  'data.typ',
  'resume.typ'
] as const;

let cachedTemplates: Record<string, string> | null = null;

/**
 * Load (and cache) the design package `.typ` sources from `templates/`, keyed
 * by their virtual-filesystem path (e.g. `/theme.typ`).
 */
export async function loadTypstTemplates(): Promise<Record<string, string>> {
  if (cachedTemplates) {
    return cachedTemplates;
  }

  const entries = await Promise.all(
    TYPST_TEMPLATE_FILES.map(async (file) => {
      const contents = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf8');
      return [`/${file}`, contents] as const;
    })
  );

  cachedTemplates = Object.fromEntries(entries);
  return cachedTemplates;
}

// ---------------------------------------------------------------------------
// Data generation: ResumeDocument -> plain JSON object consumed by data.typ.
// The shape mirrors what the `.typ` renderers read. Empty arrays/objects are
// always emitted so the Typst code can call `.len()` / `.at(...)` safely.
// ---------------------------------------------------------------------------

type TypstSubRole = {
  role: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
};

type TypstExperience = {
  company: string;
  role: string;
  location?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
  roles?: TypstSubRole[];
};

type TypstResumeData = {
  basics: { name: string; title: string; summary?: string };
  contact: { location?: string; email?: string; phone?: string; website?: string };
  skills: Array<{ name: string; keywords: string[] }>;
  experience: TypstExperience[];
  projects: Array<{ name: string; description?: string; url?: string; highlights: string[] }>;
  education: Array<{ school: string; degree?: string; field?: string; period?: string; highlights: string[] }>;
};

function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * Convert a resolved `ResumeDocument` into the plain JSON object that the Typst
 * design package consumes. This replaces the old markup-flattening approach —
 * the data passes straight through, so there is no Typst escaping to do.
 */
export function buildResumeData(resume: ResumeDocument): TypstResumeData {
  const basics = omitUndefined({
    name: resume.basics.name,
    title: resume.basics.title,
    summary: resume.basics.summary ?? resume.summary
  }) as TypstResumeData['basics'];

  const contact = omitUndefined({
    location: resume.contact?.location,
    email: resume.contact?.email,
    phone: resume.contact?.phone,
    website: resume.contact?.website
  }) as TypstResumeData['contact'];

  const experience: TypstExperience[] = resume.experience.map((entry) => {
    const base = omitUndefined({
      company: entry.company,
      role: entry.role,
      location: entry.location,
      period: entry.period,
      startDate: entry.startDate,
      endDate: entry.endDate,
      highlights: entry.highlights ?? []
    }) as TypstExperience;

    if (entry.roles && entry.roles.length > 0) {
      base.roles = entry.roles.map(
        (subRole) =>
          omitUndefined({
            role: subRole.role,
            period: subRole.period,
            startDate: subRole.startDate,
            endDate: subRole.endDate,
            highlights: subRole.highlights ?? []
          }) as TypstSubRole
      );
    }

    return base;
  });

  const projects = resume.projects.map(
    (project) =>
      omitUndefined({
        name: project.name,
        description: project.description,
        url: project.url,
        highlights: project.highlights ?? []
      }) as TypstResumeData['projects'][number]
  );

  const education = resume.education.map(
    (edu) =>
      omitUndefined({
        school: edu.school,
        degree: edu.degree,
        field: edu.field,
        period: edu.period,
        highlights: edu.highlights ?? []
      }) as TypstResumeData['education'][number]
  );

  return { basics, contact, skills: resume.skills, experience, projects, education };
}

/**
 * Serialize the resolved resume to the JSON string that `data.typ` reads via
 * `json("resume.json")`.
 */
export function buildResumeDataJson(resume: ResumeDocument): string {
  return JSON.stringify(buildResumeData(resume));
}
