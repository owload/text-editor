# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

`@owload/text-editor` — the plain-text (`.txt`) editor of Owload, an **extension** that follows the contract of
`@owload/editor-sdk` (`owload-docs/decisions/0019-editor-extensions.md`). The host (`owload-front`) is separate;
never edit it from here. See `README.md`.

## Rules

- **Do not commit or push unless the owner explicitly asks** (each time; a past instruction does not carry over).
  Leave the work uncommitted and report.
- **English only** in code, comments, UI strings, docs and commit messages.
- Commit identity is `Owload <info@owload.com>` only — no `Co-Authored-By` or generated-by lines; pass it per
  commit: `git -c user.name=Owload -c user.email=info@owload.com commit ...`.
- **Before every push check the diff:** no sensitive data (secrets, tokens, keys, `.env` values, real hostnames or
  IPs, personal data, machine paths), and security does not get worse. The editor sees the plaintext of the user's
  files.
- **Security comes first:** no runtime dependencies (`@owload/editor-sdk` is a dev dependency and is used for types
  only in `src/`); no network access, no storage, no logging of content; nothing leaves the editor except through
  `onSave`; the contract's rules are checked by the SDK's conformance suite in `test/conformance.test.tsx` and must
  keep passing.
- The editor never shows its own close or "discard changes?" dialog; the host owns closing.
- Keep it self-contained: no imports from the host app, no global CSS; every class is prefixed `te-` and every
  selector is scoped under `.te`.

## Commands

```bash
npm test | npm run lint | npm run typecheck | npm run build
```

Use Node >= 20 (`.nvmrc` = 22). The default `node` on this machine may be older; `/opt/homebrew/bin/node` is newer.

## Layout

```
src/extension.ts    the descriptor (plain object, type-only import from the SDK); load() is the lazy chunk
src/text-editor.tsx the component; src/text-editor.css its scoped styles
src/lib/text.ts     decodeText / encodeText: UTF-8 only, BOM and CRLF preserved
test/               component tests and the SDK conformance suite
```
