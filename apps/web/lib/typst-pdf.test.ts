import { describe, expect, it } from 'vitest';
import { sampleResume } from './__fixtures__/sample-resume';
import { nestedResume } from './__fixtures__/nested-resume';
import { TYPST_STYLES } from './resume-typst';
import { buildTypstSource, getLoadedFontFiles, renderTypstPdf } from './typst-pdf';

describe('renderTypstPdf', () => {
  for (const style of TYPST_STYLES) {
    it(`compiles the ${style} layout for a flat resume into a PDF`, async () => {
      const pdfBytes = await renderTypstPdf(sampleResume, style);
      expect(pdfBytes.byteLength).toBeGreaterThan(1000);
    }, 30000);

    it(`compiles the ${style} layout for a resume with nested sub-roles`, async () => {
      const pdfBytes = await renderTypstPdf(nestedResume, style);
      expect(pdfBytes.byteLength).toBeGreaterThan(1000);
    }, 30000);
  }

  it('defaults to the classic layout for an unknown style', async () => {
    const pdfBytes = await renderTypstPdf(sampleResume, 'does-not-exist');
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it('loads the bundled brand fonts', async () => {
    // Trigger compiler init (fonts load lazily on first compile).
    await renderTypstPdf(sampleResume, 'classic');
    expect(getLoadedFontFiles()).toEqual(
      expect.arrayContaining(['Inter.ttf', 'InterTight.ttf', 'JetBrainsMono.ttf'])
    );
  }, 30000);
});

describe('buildTypstSource', () => {
  it('embeds the chosen style and the resume JSON for inspection', async () => {
    const source = await buildTypstSource(nestedResume, 'sidebar');
    expect(source).toContain('// style = sidebar');
    expect(source).toContain('Anheuser-Busch InBev');
    expect(source).toContain('layouts.at(style)');
  });
});
