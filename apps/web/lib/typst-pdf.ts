import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createTypstCompiler, loadFonts, type TypstCompiler } from '@myriaddreamin/typst.ts';
import { CompileFormatEnum } from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';
import type { ResumeDocument } from '@/lib/shared-types';
import {
  DEFAULT_TYPST_STYLE,
  buildResumeDataJson,
  loadTypstTemplates,
  normalizeTypstStyle,
  type TypstStyle
} from '@/lib/resume-typst';

const MAIN_FILE_PATH = '/resume.typ';
const DATA_FILE_PATH = '/resume.json';

// Bundled OFL fonts the design package requests. Missing files degrade
// gracefully to the Typst fallback stack (Helvetica/Arial/DejaVu).
const FONTS_DIR = path.join(process.cwd(), 'fonts');
const FONT_FILES = ['Inter.ttf', 'InterTight.ttf', 'JetBrainsMono.ttf'];

let compilerPromise: Promise<TypstCompiler> | null = null;
let compileQueue: Promise<unknown> = Promise.resolve();
let loadedFontFiles: string[] = [];

async function loadBundledFonts(): Promise<Uint8Array[]> {
  const fonts: Uint8Array[] = [];
  loadedFontFiles = [];

  for (const file of FONT_FILES) {
    try {
      const buf = await fs.readFile(path.join(FONTS_DIR, file));
      fonts.push(new Uint8Array(buf));
      loadedFontFiles.push(file);
    } catch {
      // Font not bundled — fall back to the default stack for this family.
    }
  }

  return fonts;
}

/** Font files that were successfully bundled into the compiler (for diagnostics). */
export function getLoadedFontFiles(): string[] {
  return [...loadedFontFiles];
}

async function getCompiler(): Promise<TypstCompiler> {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      const fonts = await loadBundledFonts();
      const compiler = createTypstCompiler();
      await compiler.init({
        beforeBuild: [
          // Bundled brand fonts plus the default 'text' asset pack for fallbacks.
          loadFonts(fonts, {
            assets: ['text']
          })
        ]
      });
      return compiler;
    })();
  }

  return compilerPromise;
}

function runSequential<T>(task: () => Promise<T>): Promise<T> {
  const run = compileQueue.then(task, task);
  compileQueue = run.catch(() => {});
  return run;
}

function formatDiagnostics(messages?: Array<string | { message?: string }>): string {
  if (!messages || messages.length === 0) {
    return 'No diagnostics available.';
  }

  return messages
    .map((entry) => (typeof entry === 'string' ? entry : entry.message ?? JSON.stringify(entry)))
    .join('\n');
}

/**
 * Compose the composed Typst source for inspection. Returns the entry source
 * (the layout dispatcher) plus the JSON data the layout would read. Used by the
 * `?...typst` routes so the exported source is reviewable.
 */
export async function buildTypstSource(
  resume: ResumeDocument,
  style: TypstStyle = DEFAULT_TYPST_STYLE
): Promise<string> {
  const templates = await loadTypstTemplates();
  const entry = templates[MAIN_FILE_PATH] ?? '';
  const dataJson = buildResumeDataJson(resume);

  return [
    `// style = ${style}`,
    '// resume.json (data passed via the virtual filesystem):',
    ...dataJson.split('\n').map((line) => `// ${line}`),
    '',
    entry
  ].join('\n');
}

/**
 * Render the resolved resume to a PDF using the chosen layout. All design
 * package `.typ` files plus the JSON data are loaded into the WASM compiler's
 * virtual filesystem; the layout is selected through `sys.inputs.style`.
 */
export async function renderTypstPdf(
  resume: ResumeDocument,
  style: string | TypstStyle | null | undefined = DEFAULT_TYPST_STYLE
): Promise<Uint8Array> {
  const resolvedStyle = normalizeTypstStyle(typeof style === 'string' ? style : style ?? undefined);
  const templates = await loadTypstTemplates();
  const dataJson = buildResumeDataJson(resume);

  return runSequential(async () => {
    const compiler = await getCompiler();
    await compiler.reset();
    compiler.resetShadow();

    // Design package sources.
    for (const [filePath, contents] of Object.entries(templates)) {
      compiler.addSource(filePath, contents);
    }

    // Resume data as a binary shadow file so `json("resume.json")` resolves.
    compiler.mapShadow(DATA_FILE_PATH, new TextEncoder().encode(dataJson));

    const compileOptions = {
      mainFilePath: MAIN_FILE_PATH,
      format: CompileFormatEnum.pdf,
      diagnostics: 'unix',
      inputs: { style: resolvedStyle }
    } as Parameters<TypstCompiler['compile']>[0];

    const { result, diagnostics } = await compiler.compile(compileOptions);

    if (!result) {
      throw new Error(
        `Typst PDF compilation failed.\n${formatDiagnostics(diagnostics as string[] | undefined)}`
      );
    }

    return new Uint8Array(result);
  });
}
