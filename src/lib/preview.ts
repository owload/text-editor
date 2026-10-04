import { NotUtf8Error, decodeText } from './text';
import { browserCanvas, type CanvasFactory } from './canvas';

/**
 * The preview of a text file for the file grid (owload-docs/decisions/0020): a white square page with the
 * first lines of the text, starting in its top-left corner. Reads the file and changes nothing.
 */

export interface PreviewLayout {
  width: number;
  height: number;
  padding: number;
  fontSize: number;
  lineHeight: number;
  lines: string[];
}

const MAX_SIDE = 4096;
const ELLIPSIS = '…';
/** Monospace glyphs are about this wide relative to the font size. */
const CHAR_WIDTH = 0.6;
/** Only this many lines of the text are looked at; a page never shows more at the smallest font. */
const MAX_LOOKED_AT = 200;

const clean = (raw: string) => raw.replaceAll('\r', '').replaceAll('\t', '  ');

interface Metrics {
  fontSize: number;
  lineHeight: number;
  maxChars: number;
  maxLines: number;
}

function metrics(side: number, padding: number, fontSize: number): Metrics {
  const lineHeight = Math.round(fontSize * 1.35);
  return {
    fontSize,
    lineHeight,
    maxChars: Math.floor((side - 2 * padding) / (fontSize * CHAR_WIDTH)),
    maxLines: Math.floor((side - 2 * padding) / lineHeight),
  };
}

/**
 * Positions the first lines of `text` on a square page whose side is `size`. The file grid shows the
 * picture filling a square tile, anchored at its top-left corner, so the page is square and the text starts
 * in that corner. The font is as large as lets the whole text fit (about 24 px on a 360 px page for a few
 * words, down to about 9 px for a long file), so a short text is readable and not a speck on an empty page.
 */
export function layoutTextPreview(text: string, size: number): PreviewLayout | null {
  const side = Math.max(32, Math.min(Math.round(size), MAX_SIDE));
  const padding = Math.round(side / 28);
  const largest = Math.max(6, Math.round(side / 15));
  const smallest = Math.max(6, Math.round(side / 40));

  const all = text.split('\n', MAX_LOOKED_AT + 1).map(clean);
  while (all.length > 0 && all[all.length - 1].trim() === '') all.pop();
  if (all.length === 0) return null;
  const longest = all.reduce((n, line) => Math.max(n, line.length), 0);

  let m = metrics(side, padding, smallest);
  if (m.maxChars < 1 || m.maxLines < 1) return null;
  for (let font = largest; font >= smallest; font--) {
    const candidate = metrics(side, padding, font);
    if (candidate.maxChars >= longest && candidate.maxLines >= all.length) {
      m = candidate;
      break;
    }
  }

  const lines = all.slice(0, m.maxLines).map((line) =>
    line.length > m.maxChars ? line.slice(0, m.maxChars - 1) + ELLIPSIS : line,
  );
  return { width: side, height: side, padding, fontSize: m.fontSize, lineHeight: m.lineHeight, lines };
}

/** The PNG of the first lines of a .txt file, at most `size` pixels high; null if there is nothing to show. */
export async function renderTextPreview(
  data: Uint8Array,
  size: number,
  makeCanvas: CanvasFactory = browserCanvas,
): Promise<Uint8Array | null> {
  let text: string;
  try {
    text = decodeText(data).text;
  } catch (e) {
    if (e instanceof NotUtf8Error) return null;
    throw e;
  }
  const layout = layoutTextPreview(text, size);
  if (!layout) return null;
  const canvas = makeCanvas(layout.width, layout.height);
  if (!canvas) return null;

  const { context } = canvas;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, layout.width, layout.height);
  context.fillStyle = '#1f2328';
  context.font = `${layout.fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  context.textBaseline = 'top';
  layout.lines.forEach((line, i) => context.fillText(line, layout.padding, layout.padding + i * layout.lineHeight));
  return canvas.toPng();
}
