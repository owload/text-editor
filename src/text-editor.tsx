import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { EditorProps } from '@owload/editor-sdk';
import { NotUtf8Error, decodeText, encodeText, type DecodedText } from './lib/text';
import './text-editor.css';

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

/** A plain-text editor that follows the Owload editor contract (owload-docs/decisions/0019). */
export function TextEditor({ data, fileName, readOnly, onSave, onDirtyChange, onError, className, ref }: EditorProps) {
  // The file is read once, on mount; the buffer is not kept.
  const [loaded] = useState<{ doc: DecodedText } | { error: Error }>(() => {
    try {
      return { doc: decodeText(data) };
    } catch (e) {
      return { error: toError(e) };
    }
  });
  const doc = 'doc' in loaded ? loaded.doc : null;

  const [text, setText] = useState(doc?.text ?? '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirtyState] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const textRef = useRef(doc?.text ?? '');
  const savedRef = useRef(doc?.text ?? '');
  const dirtyRef = useRef(false);
  const mountedRef = useRef(true);
  const savingRef = useRef(false);
  const callbacks = useRef({ onSave, onDirtyChange, onError });
  callbacks.current = { onSave, onDirtyChange, onError };

  const setDirty = (value: boolean) => {
    if (!mountedRef.current || dirtyRef.current === value) return;
    dirtyRef.current = value;
    setDirtyState(value);
    callbacks.current.onDirtyChange?.(value);
  };

  useEffect(() => {
    mountedRef.current = true;
    if ('error' in loaded) callbacks.current.onError?.(loaded.error);
    return () => { mountedRef.current = false; };
  }, [loaded]);

  const save = async () => {
    if (!doc || readOnly || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    const snapshot = textRef.current;
    try {
      await callbacks.current.onSave(encodeText(snapshot, doc));
      savedRef.current = snapshot;
      setDirty(textRef.current !== savedRef.current);
    } catch (e) {
      const error = toError(e);
      if (mountedRef.current) setSaveError(error.message);
      callbacks.current.onError?.(error);
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  useImperativeHandle(ref, () => ({ save: () => saveRef.current(), isDirty: () => dirtyRef.current }), []);

  const root = `te${className ? ` ${className}` : ''}`;

  if (!doc) {
    return (
      <div className={root}>
        <p role="alert" className="te-state te-error">{(loaded as { error: Error }).error instanceof NotUtf8Error
          ? (loaded as { error: Error }).error.message
          : 'The file could not be opened.'}</p>
      </div>
    );
  }

  return (
    <div className={root}>
      <div className="te-bar">
        <span className="te-name" title={fileName}>{fileName}</span>
        {dirty && <span className="te-dirty">● Unsaved changes</span>}
        {!readOnly && (
          <button className="te-save" onClick={() => void saveRef.current()} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      {saveError && <p role="alert" className="te-error te-banner">{saveError}</p>}
      <textarea
        className="te-area"
        value={text}
        readOnly={readOnly}
        spellCheck={false}
        autoFocus
        aria-label={fileName}
        onChange={(e) => {
          if (readOnly) return;
          const value = e.target.value;
          textRef.current = value;
          setText(value);
          setDirty(value !== savedRef.current);
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            void saveRef.current();
          }
        }}
      />
    </div>
  );
}
