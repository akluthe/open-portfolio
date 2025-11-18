import { createTypstCompiler, loadFonts, type TypstCompiler } from '@myriaddreamin/typst.ts';
import { CompileFormatEnum } from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';

const MAIN_FILE_PATH = '/resume.typ';
let compilerPromise: Promise<TypstCompiler> | null = null;
let compileQueue: Promise<unknown> = Promise.resolve();

async function getCompiler(): Promise<TypstCompiler> {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      const compiler = createTypstCompiler();
      await compiler.init({
        beforeBuild: [
          loadFonts([], {
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

export async function renderTypstPdf(source: string): Promise<Uint8Array> {
  return runSequential(async () => {
    const compiler = await getCompiler();
    await compiler.reset();
    compiler.addSource(MAIN_FILE_PATH, source);

    const compileOptions = {
      mainFilePath: MAIN_FILE_PATH,
      format: CompileFormatEnum.pdf,
      diagnostics: 'unix'
    } as Parameters<TypstCompiler['compile']>[0];

    const { result, diagnostics } = await compiler.compile(compileOptions);

    if (!result) {
      throw new Error(`Typst PDF compilation failed.\n${formatDiagnostics(diagnostics as string[] | undefined)}`);
    }

    return new Uint8Array(result);
  });
}
