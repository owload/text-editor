import { describe, expect, it } from 'vitest';
import type { CanvasFactory, DrawContext } from './canvas';
import { layoutTextPreview, renderTextPreview } from './preview';

const enc = (s: string) => new TextEncoder().encode(s);

function fakeCanvas() {
  const calls: string[] = [];
  const context: DrawContext = {
    fillStyle: '',
    font: '',
    textBaseline: '',
    fillRect: (x, y, w, h) => calls.push(`rect ${x},${y},${w},${h} ${context.fillStyle}`),
    fillText: (t, x, y) => calls.push(`text ${x},${y} ${t}`),
  };
  const sizes: [number, number][] = [];
  const factory: CanvasFactory = (w, h) => {
    sizes.push([w, h]);
    return { context, toPng: async () => new Uint8Array([137, 80, 78, 71]) };
  };
  return { calls, sizes, factory, context };
}

describe('layoutTextPreview', () => {
  it('makes a portrait page whose height is the requested size', () => {
    const layout = layoutTextPreview('hello', 360)!;
    expect(layout.height).toBe(360);
    expect(layout.width).toBe(270);
    expect(layout.lines).toEqual(['hello']);
  });

  it('keeps the first lines only, as many as fit', () => {
    const text = Array.from({ length: 500 }, (_, i) => `line ${i}`).join('\n');
    const layout = layoutTextPreview(text, 360)!;
    expect(layout.lines.length).toBeGreaterThan(20); // a small font: a page shows about 30 lines
    expect(layout.lines.length).toBeLessThan(40);
    expect(layout.lines[0]).toBe('line 0');
    const used = layout.padding * 2 + layout.lines.length * layout.lineHeight;
    expect(used).toBeLessThanOrEqual(layout.height);
  });

  it('cuts long lines with an ellipsis so they stay on the page', () => {
    const layout = layoutTextPreview('x'.repeat(500), 360)!;
    expect(layout.lines[0].endsWith('…')).toBe(true);
    const maxChars = Math.floor((layout.width - 2 * layout.padding) / (layout.fontSize * 0.6));
    expect(layout.lines[0].length).toBe(maxChars);
  });

  it('treats CRLF and tabs as a person would', () => {
    expect(layoutTextPreview('a\r\n\tb', 360)!.lines).toEqual(['a', '  b']);
  });

  it('drops blank lines at the end, and has nothing to show for a blank text', () => {
    expect(layoutTextPreview('a\n\n\n', 360)!.lines).toEqual(['a']);
    expect(layoutTextPreview('', 360)).toBeNull();
    expect(layoutTextPreview('  \n \n', 360)).toBeNull();
  });

  it('uses a small font, about 9 px on a 360 px thumbnail, like the spreadsheet preview', () => {
    expect(layoutTextPreview('a', 360)!.fontSize).toBe(9);
    expect(layoutTextPreview('a', 128)!.fontSize).toBe(6); // never below 6 px
  });

  it('works at a small size and refuses an absurd one gracefully', () => {
    expect(layoutTextPreview('hi', 64)!.height).toBe(64);
    expect(layoutTextPreview('hi', 1e9)!.height).toBeLessThanOrEqual(4096);
  });
});

describe('renderTextPreview', () => {
  it('draws a white page and the lines, and returns the canvas PNG', async () => {
    const c = fakeCanvas();
    const png = await renderTextPreview(enc('first\nsecond'), 360, c.factory);
    expect([...png!]).toEqual([137, 80, 78, 71]);
    expect(c.sizes).toEqual([[270, 360]]);
    expect(c.calls[0]).toBe('rect 0,0,270,360 #ffffff');
    expect(c.calls.filter((x) => x.startsWith('text')).map((x) => x.split(' ').slice(1).join(' '))).toEqual([
      expect.stringContaining('first'),
      expect.stringContaining('second'),
    ]);
    expect(c.context.textBaseline).toBe('top');
    expect(c.context.font).toMatch(/monospace$/);
  });

  it('has no preview for an empty file, a blank one, or bytes that are not UTF-8', async () => {
    const c = fakeCanvas();
    expect(await renderTextPreview(new Uint8Array(), 360, c.factory)).toBeNull();
    expect(await renderTextPreview(enc('   \n'), 360, c.factory)).toBeNull();
    expect(await renderTextPreview(new Uint8Array([0x68, 0xff, 0xfe]), 360, c.factory)).toBeNull();
    expect(c.sizes).toEqual([]);
  });

  it('has no preview where there is no canvas', async () => {
    expect(await renderTextPreview(enc('hello'), 360, () => null)).toBeNull();
    // The default factory: happy-dom has no OffscreenCanvas.
    expect(await renderTextPreview(enc('hello'), 360)).toBeNull();
  });

  it('does not change the bytes it was given', async () => {
    const data = enc('keep me');
    const copy = new Uint8Array(data);
    await renderTextPreview(data, 360, fakeCanvas().factory);
    expect([...data]).toEqual([...copy]);
  });
});
