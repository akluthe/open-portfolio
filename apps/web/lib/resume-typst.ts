import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { ResumeDocument } from '@resume-platform/shared-types';

const TEMPLATE_PLACEHOLDER = '{{CONTENT}}';
const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'resume.typ');
let cachedTemplate: string | null = null;

async function loadTemplate(): Promise<string> {
  if (cachedTemplate) {
    return cachedTemplate;
  }

  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');

  if (!template.includes(TEMPLATE_PLACEHOLDER)) {
    throw new Error(`Typst template missing placeholder ${TEMPLATE_PLACEHOLDER}`);
  }

  cachedTemplate = template;
  return cachedTemplate;
}

function escapeTypst(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/@/g, '\\@')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>');
}

function formatContact(resume: ResumeDocument): string | null {
  const parts = [
    resume.contact?.location,
    resume.contact?.email,
    resume.contact?.phone,
    resume.contact?.website
  ].filter(Boolean);

  return parts.length > 0 ? parts.map((part) => escapeTypst(part as string)).join(' · ') : null;
}

function heading(level: number, value: string): string {
  return `${'='.repeat(level)} ${escapeTypst(value)}\n`;
}

function renderParagraph(value: string): string {
  return `${escapeTypst(value)}\n`;
}

function renderList(items: string[]): string {
  return items.map((item) => `- ${escapeTypst(item)}`).join('\n');
}

function renderExperience(resume: ResumeDocument): string | null {
  if (resume.experience.length === 0) {
    return null;
  }

  const entries = resume.experience.map((entry) => {
    const metaParts: string[] = [];

    if (entry.company) {
      metaParts.push(entry.company);
    }

    if (entry.location) {
      metaParts.push(entry.location);
    }

    if (entry.period) {
      metaParts.push(entry.period);
    } else if (entry.startDate || entry.endDate) {
      const start = entry.startDate ?? 'Present';
      const end = entry.endDate ? ` - ${entry.endDate}` : '';
      metaParts.push(`${start}${end}`);
    }

    const metaLine = metaParts.length > 0 ? `${metaParts.join(' · ')}` : null;
    const bodyParts: string[] = [];

    bodyParts.push(`=== ${escapeTypst(entry.role)}\n`);

    if (metaLine) {
      bodyParts.push(`${escapeTypst(metaLine)}\n`);
    }

    if (entry.highlights.length > 0) {
      bodyParts.push(`${renderList(entry.highlights)}\n`);
    }

    return bodyParts.join('\n');
  });

  return [heading(2, 'EXPERIENCE'), entries.join('\n')].join('\n');
}

function renderSkills(resume: ResumeDocument): string | null {
  if (resume.skills.length === 0) {
    return null;
  }

  const lines = resume.skills.map((skill) => {
    const keywords = skill.keywords.length > 0 ? `: ${skill.keywords.join(', ')}` : '';
    return `- *${escapeTypst(skill.name)}*${escapeTypst(keywords)}`;
  });

  return [heading(2, 'SKILLS'), lines.join('\n')].join('\n');
}

function renderProjects(resume: ResumeDocument): string | null {
  if (resume.projects.length === 0) {
    return null;
  }

  const entries = resume.projects.map((project) => {
    const parts = [`=== ${escapeTypst(project.name)}\n`];

    if (project.description) {
      parts.push(`${renderParagraph(project.description)}\n`);
    }

    if (project.highlights.length > 0) {
      parts.push(`${renderList(project.highlights)}\n`);
    }

    return parts.join('\n');
  });

  return [heading(2, 'PROJECTS'), entries.join('\n')].join('\n');
}

function renderEducation(resume: ResumeDocument): string | null {
  if (resume.education.length === 0) {
    return null;
  }

  const entries = resume.education.map((edu) => {
    const metaParts: string[] = [];

    if (edu.degree) {
      metaParts.push(edu.degree);
    }

    if (edu.field) {
      metaParts.push(edu.field);
    }

    if (edu.period) {
      metaParts.push(edu.period);
    }

    const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : null;
    const parts = [`=== ${escapeTypst(edu.school)}\n`];

    if (metaLine) {
      parts.push(`${escapeTypst(metaLine)}\n`);
    }

    if (edu.highlights.length > 0) {
      parts.push(`${renderList(edu.highlights)}\n`);
    }

    return parts.join('\n');
  });

  return [heading(2, 'EDUCATION'), entries.join('\n')].join('\n');
}

export async function buildTypstSource(resume: ResumeDocument): Promise<string> {
  const template = await loadTemplate();
  const sections: Array<string | null> = [];

  const headerLines = [heading(1, resume.basics.name)];

  if (resume.basics.title) {
    headerLines.push(renderParagraph(resume.basics.title));
  }

  const contact = formatContact(resume);
  if (contact) {
    headerLines.push(`${contact}\n`);
  }

  const summary = resume.basics.summary ?? resume.summary;
  if (summary) {
    sections.push([heading(2, 'SUMMARY'), renderParagraph(summary)].join('\n'));
  }

  sections.push(renderExperience(resume));
  sections.push(renderSkills(resume));
  sections.push(renderProjects(resume));
  sections.push(renderEducation(resume));

  const body = [headerLines.join('\n'), ...sections.filter(Boolean)].join('\n\n').trim();
  return template.replace(TEMPLATE_PLACEHOLDER, `${body}\n`);
}
