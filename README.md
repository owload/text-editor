# @owload/text-editor

The plain-text (`.txt`) editor of Owload, as an **extension** built on the
[`@owload/editor-sdk`](https://github.com/owload/editor-sdk) contract
([ADR 0019](https://github.com/owload/owload-docs/blob/main/decisions/0019-editor-extensions.md)). It has no runtime
dependency besides React, makes no network requests and stores nothing: the host hands it the file bytes and
receives the edited bytes through `onSave`.

## Install

Depend on a pinned release tag (or an exact commit) straight from GitHub; the `prepare` script builds `dist/`:

```json
"@owload/text-editor": "github:owload/text-editor#v0.1.0"
```

Needs Node 20 or newer and React 19.

## Exports

| Import | What |
| --- | --- |
| `@owload/text-editor/extension` | `extension` — the small descriptor (`id: "text"`, `.txt`, "New text file", 10 MiB limit, `preview`). The editor and the preview code are separate chunks loaded when needed. |
| `@owload/text-editor` | `TextEditor` (the component) and the `decodeText` / `encodeText` helpers. |
| `@owload/text-editor/style.css` | The styles, all scoped to `.te`; a `.dark` ancestor switches the palette. |

The host registers `extension`, imports `style.css` lazily with the editor and renders the component through the
SDK's `EditorProps`; see the SDK's README.

## Behaviour worth knowing

- A file must be **valid UTF-8**. Anything else shows an error instead of an editor, because saving would otherwise
  replace unreadable bytes with U+FFFD and damage the file.
- A UTF-8 **byte order mark** and **CRLF** line endings are remembered and written back exactly; a file with mixed
  line endings is normalized to LF.
- Save (button or Ctrl/Cmd+S) calls `onSave`; the unsaved-changes indicator and the Save button live in the
  editor's own slim bar. The close button in the bar calls `onClose`; asking about unsaved changes, and closing, are the host's job.
- **Preview** (`extension.preview`, [ADR 0020](https://github.com/owload/owload-docs/blob/main/decisions/0020-extension-previews.md)): a PNG of the first lines of the file on a white portrait page, monospace, long lines cut with an ellipsis; `null` for an empty, blank or non-UTF-8 file or where there is no `OffscreenCanvas`.
- `readOnly` shows the text without Save and ignores edits.

## Development

```bash
npm install
npm test           # unit tests, component tests and the SDK's conformance suite
npm run lint
npm run typecheck
npm run build      # dist/
```
