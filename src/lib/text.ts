/**
 * Turning the bytes of a .txt file into the text the editor shows, and back, without damaging it:
 * - the file must be valid UTF-8, otherwise saving would replace bytes with U+FFFD;
 * - a UTF-8 byte order mark is remembered and written back;
 * - CRLF line endings are remembered and written back (a textarea works with LF only).
 */

export class NotUtf8Error extends Error {
  constructor() {
    super('This file is not valid UTF-8 text, so it cannot be edited here without damaging it.');
    this.name = 'NotUtf8Error';
  }
}

export interface DecodedText {
  text: string;
  bom: boolean;
  crlf: boolean;
}

const BOM = [0xef, 0xbb, 0xbf];

export function decodeText(data: Uint8Array | null | undefined): DecodedText {
  if (!data || data.byteLength === 0) return { text: '', bom: false, crlf: false };
  const bom = data.length >= 3 && BOM.every((b, i) => data[i] === b);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bom ? data.subarray(3) : data);
  } catch {
    throw new NotUtf8Error();
  }
  // CRLF only if every line break is CRLF; a file with mixed endings is normalized to LF.
  const crlf = text.includes('\r\n') && !/(^|[^\r])\n/.test(text);
  if (crlf) text = text.replaceAll('\r\n', '\n');
  return { text, bom, crlf };
}

export function encodeText(text: string, format: { bom: boolean; crlf: boolean }): Uint8Array {
  const body = new TextEncoder().encode(format.crlf ? text.replaceAll('\n', '\r\n') : text);
  if (!format.bom) return body;
  const out = new Uint8Array(body.length + 3);
  out.set(BOM, 0);
  out.set(body, 3);
  return out;
}
