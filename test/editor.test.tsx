import { act, createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import type { EditorHandle } from '@owload/editor-sdk';
import { validateExtension } from '@owload/editor-sdk';
import { TextEditor } from '../src';
import { extension } from '../src/extension';

(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

async function render(data: Uint8Array | null, props: { readOnly?: boolean } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = createRef<EditorHandle>();
  const onSave = vi.fn();
  const onError = vi.fn();
  const onClose = vi.fn();
  await act(async () => {
    root.render(createElement(TextEditor, { data, fileName: 'a.txt', onSave, onError, onClose, ref, ...props }));
  });
  const area = container.querySelector('textarea');
  const type = async (value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, value);
      area!.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  return { container, ref, onSave, onError, onClose, area, type, unmount: () => act(async () => root.unmount()) };
}

describe('the descriptor', () => {
  it('offers a preview that is lazy and gives nothing where there is no canvas', async () => {
    expect(extension.preview).toBeTypeOf('function');
    expect(await extension.preview(new TextEncoder().encode('hello'), { size: 360 })).toBeNull();
  });

  it('is valid and offers "New text file"', () => {
    expect(validateExtension(extension)).toEqual([]);
    expect(extension.createNew.label).toBe('text file');
    expect(extension.fileExtensions).toEqual(['txt']);
  });
});

describe('TextEditor', () => {
  it('saves a CRLF file with its CRLF and a BOM file with its BOM', async () => {
    const original = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('one\r\ntwo\r\n')]);
    const t = await render(original);
    expect(t.area!.value).toBe('one\ntwo\n');
    await t.type('one\ntwo\nthree');
    await act(async () => { await t.ref.current!.save(); });
    const saved = t.onSave.mock.calls[0][0] as Uint8Array;
    expect([...saved]).toEqual([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('one\r\ntwo\r\nthree')]);
    await t.unmount();
  });

  it('shows an error instead of an editor for a file that is not UTF-8, and does not offer to save it', async () => {
    const t = await render(new Uint8Array([0x68, 0xff, 0xfe]));
    expect(t.area).toBeNull();
    expect(t.container.querySelector('[role=alert]')!.textContent).toMatch(/not valid UTF-8/);
    expect(t.onError).toHaveBeenCalledTimes(1);
    expect(t.ref.current!.isDirty()).toBe(false);
    await act(async () => { await t.ref.current!.save(); });
    expect(t.onSave).not.toHaveBeenCalled();
    await t.unmount();
  });

  it('read-only: no Save button, typing is refused, save() does nothing', async () => {
    const t = await render(new TextEncoder().encode('fixed'), { readOnly: true });
    expect(t.area!.readOnly).toBe(true);
    expect(t.container.querySelector('.te-save')).toBeNull();
    await act(async () => { await t.ref.current!.save(); });
    expect(t.onSave).not.toHaveBeenCalled();
    await t.unmount();
  });

  it('shows the unsaved-changes indicator and enables Save only when dirty', async () => {
    const t = await render(new TextEncoder().encode('x'));
    const save = t.container.querySelector<HTMLButtonElement>('.te-save')!;
    expect(save.disabled).toBe(true);
    expect(t.container.querySelector('.te-dirty')).toBeNull();
    await t.type('xy');
    expect(save.disabled).toBe(false);
    expect(t.container.querySelector('.te-dirty')).not.toBeNull();
    await t.unmount();
  });

  it('shows a failed save, keeps the text, and stays dirty', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const ref = createRef<EditorHandle>();
    const onError = vi.fn();
    await act(async () => {
      root.render(createElement(TextEditor, { data: null, fileName: 'a.txt', ref, onError, onClose: () => undefined, onSave: async () => { throw new Error('upload failed'); } }));
    });
    const area = container.querySelector('textarea')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, 'draft');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { await ref.current!.save(); });
    expect(container.querySelector('[role=alert]')!.textContent).toBe('upload failed');
    expect(area.value).toBe('draft');
    expect(ref.current!.isDirty()).toBe(true);
    expect(onError).toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it('has a close button in its bar that only calls onClose, also when the file cannot be opened', async () => {
    const t = await render(new TextEncoder().encode('x'));
    t.container.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    expect(t.onClose).toHaveBeenCalledTimes(1);
    expect(t.onSave).not.toHaveBeenCalled();
    await t.unmount();

    const broken = await render(new Uint8Array([0x68, 0xff, 0xfe]));
    expect(broken.container.querySelector('button[aria-label="Close"]')).not.toBeNull();
    await broken.unmount();
  });
});
