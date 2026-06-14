# Mobile development paused

**Status:** Paused since June 2026. Active target: `apps/web` (+ shared logic in `packages/core`).

Agents: do not read, search, list, or explore `apps/mobile/` unless the user explicitly requests mobile work. Do not invoke skills under `apps/mobile/.cursor/skills/`.

---

## Unpause checklist

When resuming mobile development, revert or update **every file below**. Search the repo for `Mobile development paused`, `Development halted`, `MOBILE PAUSED`, and `development paused` to catch anything missed.

### Index / access

| File | Action |
|------|--------|
| [`.cursorignore`](../.cursorignore) | Delete the file, or remove the `apps/mobile/` entry |
| This file (`docs/mobile-development-paused.md`) | Delete, or rewrite as “mobile development resumed” with resume date |

### Agent & Claude entrypoints

| File | Action |
|------|--------|
| [`AGENTS.md`](../AGENTS.md) | Remove the mobile-pause blockquote at the top |
| [`CLAUDE.md`](../CLAUDE.md) | Remove mobile-pause section; keep `@AGENTS.md` |
| [`.cursor/rules/agents-behavior.mdc`](../.cursor/rules/agents-behavior.mdc) | Remove mobile-pause blockquote |
| [`apps/web/AGENTS.md`](../apps/web/AGENTS.md) | Remove mobile-pause / scope blockquote |
| [`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) | Remove mobile-pause section; keep `@AGENTS.md` |
| [`apps/mobile/AGENTS.md`](../apps/mobile/AGENTS.md) | Remove “Mobile development halted” heading and both pause blockquotes |
| [`apps/mobile/CLAUDE.md`](../apps/mobile/CLAUDE.md) | Remove mobile-pause section; keep `@AGENTS.md` |

### Cursor rules

| File | Action |
|------|--------|
| [`.cursor/rules/web-nextjs.mdc`](../.cursor/rules/web-nextjs.mdc) | Remove mobile-pause blockquote |
| [`.cursor/rules/mobile-expo.mdc`](../.cursor/rules/mobile-expo.mdc) | Remove “Mobile development halted” heading and pause blockquotes; keep Expo guidance |

### Mobile skills

| File | Action |
|------|--------|
| [`apps/mobile/.cursor/skills/README.md`](../apps/mobile/.cursor/skills/README.md) | Remove halt blockquote |
| [`apps/mobile/.cursor/skills/bloom-journal-dev/SKILL.md`](../apps/mobile/.cursor/skills/bloom-journal-dev/SKILL.md) | Remove halt blockquote; restore YAML `description` (remove `MOBILE PAUSED —`) |
| [`apps/mobile/.cursor/skills/flowers-and-garden/SKILL.md`](../apps/mobile/.cursor/skills/flowers-and-garden/SKILL.md) | Remove halt blockquote; restore YAML `description` (remove `MOBILE PAUSED —`) |

### READMEs

| File | Action |
|------|--------|
| [`README.md`](../README.md) | Remove top banner; restore Mobile table row (drop *(paused)*); restore “### Mobile (Expo)” heading; restore `mobile/` workspace comment; restore roadmap line |
| [`apps/web/README.md`](../apps/web/README.md) | Remove active-target / pause blockquote |
| [`apps/mobile/README.md`](../apps/mobile/README.md) | Remove halt blockquote |

### Specs & docs

| File | Action |
|------|--------|
| [`docs/product-spec.md`](product-spec.md) | Remove top banner; restore Mobile platform row; remove web/mobile table footnote; restore mobile routes section title; restore platform-parity bullet |
| [`docs/garden-ui-redesign-prd.md`](garden-ui-redesign-prd.md) | Remove top banner; restore mobile parity decision (“can port `atmosphere.ts` later”) |
| [`docs/flower-decision-spec.md`](flower-decision-spec.md) | Remove top banner |
| [`apps/web/docs/sync.md`](../apps/web/docs/sync.md) | Remove top banner |
| [`apps/web/reference/bloom-meadow-spec.md`](../apps/web/reference/bloom-meadow-spec.md) | Remove top banner |
| [`packages/assets/README.md`](../packages/assets/README.md) | Remove top banner |

### Other cursor skills

| File | Action |
|------|--------|
| [`.cursor/skills/ui-design-brain/SKILL.md`](../.cursor/skills/ui-design-brain/SKILL.md) | Remove mobile-pause blockquote |

### Verify after unpause

```bash
rg -i "mobile development paused|development halted|MOBILE PAUSED|Stay out of \`apps/mobile" .
```

Should return no matches (except possibly git history or this doc if archived).
