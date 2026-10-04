import type { EditorExtension } from '@owload/editor-sdk';

/**
 * The descriptor the host loads eagerly (owload-docs/decisions/0019). It is a plain object and only
 * the type comes from the SDK, so this package has no runtime dependency; the host validates it.
 * The editor itself is a separate chunk, loaded when a .txt file is opened.
 */
export const extension = {
  apiVersion: 1,
  id: 'text',
  label: 'Text file',
  fileExtensions: ['txt'],
  createNew: { label: 'text file', defaultExtension: 'txt' },
  // A textarea holds the whole text in the page; beyond this size it becomes unusable.
  maxFileBytes: 10 * 1024 * 1024,
  load: () => import('./text-editor').then((m) => ({ default: m.TextEditor })),
} satisfies EditorExtension;
