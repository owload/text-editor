import { NotUtf8Error, decodeText } from './text';
import { browserCanvas, type CanvasFactory } from './canvas';

/**
 * The preview of a text file for the file grid (owload-docs/decisions/0020): a white page with the
 * first lines of the text. Reads the file and changes nothing.
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

/** Positions the first lines of `text` on a portrait page whose height is `size`. */
export function layoutTextPreview(text: string, size: number): PreviewLayout | null {
  const height = Math.max(32, Math.min(Math.round(size), MAX_SIDE));
  const width = Math.round(height * 0.75);
  const padding = Math.round(height / 24);
  const fontSize = Math.max(6, Math.round(height / 26));
  const lineHeight = Math.round(fontSize * 1.35);
  const maxChars = Math.floor((width - 2 * padding) / (fontSize * CHAR_WIDTH));
  const maxLines = Math.floor((height - 2 * padding) / lineHeight);
  if (maxChars < 1 || maxLines < 1) return null;

  // Only as much of the text as can be shown is looked at.
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replaceAll('\r', '').replaceAll('\t', '  ');
    lines.push(line.length > maxChars ? line.slice(0, maxChars - 1) + ELLIPSIS : line);
    if (lines.length === maxLines) break;
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.every((l) => l.trim() === '')) return null;
  return { width, height, padding, fontSize, lineHeight, lines };
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
