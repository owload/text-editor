import { describe, expect, it } from 'vitest';
import { NotUtf8Error, decodeText, encodeText } from './text';

const bytes = (...n: number[]) => new Uint8Array(n);
const enc = (s: string) => new TextEncoder().encode(s);

describe('decodeText', () => {
  it('treats nothing as an empty document', () => {
    expect(decodeText(null)).toEqual({ text: '', bom: false, crlf: false });
    expect(decodeText(new Uint8Array())).toEqual({ text: '', bom: false, crlf: false });
  });

  it('reads UTF-8, including multi-byte characters', () => {
    expect(decodeText(enc('héllo ✓ 日本')).text).toBe('héllo ✓ 日本');
  });

  it('refuses bytes that are not UTF-8 instead of replacing them', () => {
    expect(() => decodeText(bytes(0x68, 0xff, 0xfe, 0x69))).toThrow(NotUtf8Error);
  });

  it('remembers and strips a byte order mark', () => {
    const d = decodeText(bytes(0xef, 0xbb, 0xbf, 0x68, 0x69));
    expect(d).toEqual({ text: 'hi', bom: true, crlf: false });
  });

  it('remembers CRLF when every line break is CRLF', () => {
    expect(decodeText(enc('a\r\nb\r\n'))).toEqual({ text: 'a\nb\n', bom: false, crlf: true });
  });

  it('does not call a file CRLF when the endings are mixed or LF', () => {
    expect(decodeText(enc('a\nb\n')).crlf).toBe(false);
    expect(decodeText(enc('a\r\nb\nc')).crlf).toBe(false);
    expect(decodeText(enc('a\r\nb\nc')).text).toBe('a\r\nb\nc');
  });
});

describe('encodeText', () => {
  it('writes back exactly what decodeText read, byte for byte', () => {
    for (const original of [
      enc('plain\ntext\n'),
      enc('windows\r\nfile\r\n'),
      bytes(0xef, 0xbb, 0xbf, ...enc('with bom\r\n')),
      enc('héllo ✓'),
      new Uint8Array(),
    ]) {
      const d = decodeText(original);
      expect([...encodeText(d.text, d)]).toEqual([...original]);
    }
  });

  it('applies the remembered format to edited text', () => {
    expect([...encodeText('a\nb', { bom: false, crlf: true })]).toEqual([...enc('a\r\nb')]);
    expect([...encodeText('x', { bom: true, crlf: false })]).toEqual([0xef, 0xbb, 0xbf, 0x78]);
  });
});
