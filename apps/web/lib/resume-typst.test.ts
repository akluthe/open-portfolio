import { describe, expect, it } from 'vitest';
import { sampleResume } from './__fixtures__/sample-resume';
import { buildTypstSource } from './resume-typst';

describe('buildTypstSource', () => {
  it('renders a typst document with the expected sections', async () => {
    const typst = await buildTypstSource(sampleResume);

    expect(typst).toContain('= Jane Example');
    expect(typst).toContain('== SUMMARY');
    expect(typst).toContain('== EXPERIENCE');
    expect(typst).toContain('Resume Platform');
    expect(typst).not.toContain('{{CONTENT}}');
  });
});
