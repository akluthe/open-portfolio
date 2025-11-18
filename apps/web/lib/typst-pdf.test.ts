import { describe, expect, it } from 'vitest';
import { sampleResume } from './__fixtures__/sample-resume';
import { buildTypstSource } from './resume-typst';
import { renderTypstPdf } from './typst-pdf';

describe('renderTypstPdf', () => {
  it('compiles typst markup into a pdf buffer', async () => {
    const typst = await buildTypstSource(sampleResume);
    const pdfBytes = await renderTypstPdf(typst);

    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
  }, 30000);
});
