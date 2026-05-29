import { describe, expect, it } from 'vitest';
import { sampleResume } from './__fixtures__/sample-resume';
import { nestedResume } from './__fixtures__/nested-resume';
import {
  buildResumeData,
  buildResumeDataJson,
  normalizeTypstStyle,
  TYPST_STYLES
} from './resume-typst';

describe('buildResumeData', () => {
  it('passes the resume through as a JSON-shaped object', () => {
    const data = buildResumeData(sampleResume);

    expect(data.basics.name).toBe('Jane Example');
    expect(data.basics.summary).toBe('Builder of resilient platforms.');
    expect(data.contact.email).toBe('jane@example.com');
    expect(data.experience[0].company).toBe('Acme Corp');
    expect(data.skills[0].keywords).toContain('TypeScript');
    // Always-present arrays so the Typst code can call `.len()` safely.
    expect(Array.isArray(data.projects)).toBe(true);
    expect(Array.isArray(data.education)).toBe(true);
  });

  it('includes nested sub-roles for multi-role entries', () => {
    const data = buildResumeData(nestedResume);
    const ab = data.experience.find((e) => e.company === 'Anheuser-Busch InBev');

    expect(ab).toBeDefined();
    expect(ab?.roles).toBeDefined();
    expect(ab?.roles?.length).toBe(4);
    expect(ab?.roles?.[0].role).toBe('Zone Integrations Lead, SAP Aurora Program');
    expect(ab?.roles?.[0].highlights.length).toBeGreaterThan(0);
    // Sub-role dates flow through (period or start/end).
    expect(ab?.roles?.[1].startDate).toBe('2022');
    expect(ab?.roles?.[1].endDate).toBe('2026');

    // A flat entry alongside the nested one keeps no `roles` key.
    const flat = data.experience.find((e) => e.company === 'Acme Corp');
    expect(flat?.roles).toBeUndefined();
  });

  it('serializes to valid JSON', () => {
    const json = buildResumeDataJson(nestedResume);
    const parsed = JSON.parse(json);
    expect(parsed.experience[0].roles).toHaveLength(4);
  });
});

describe('normalizeTypstStyle', () => {
  it('accepts the three known styles', () => {
    for (const style of TYPST_STYLES) {
      expect(normalizeTypstStyle(style)).toBe(style);
    }
  });

  it('falls back to classic for unknown or missing values', () => {
    expect(normalizeTypstStyle('nope')).toBe('classic');
    expect(normalizeTypstStyle(null)).toBe('classic');
    expect(normalizeTypstStyle(undefined)).toBe('classic');
  });
});
