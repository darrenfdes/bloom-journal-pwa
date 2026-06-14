# Bloom Journal — Cursor Skills

> **Development halted (June 2026).** Do not invoke these skills unless the user explicitly requests mobile work. For web garden/flower work, use `packages/core` and `apps/web` instead.

Project-specific skills for agents working in this repo. Cursor discovers skills in `.cursor/skills/<skill-name>/SKILL.md`.

| Skill | Use when |
|-------|----------|
| [bloom-journal-dev](bloom-journal-dev/SKILL.md) | Expo setup, navigation, SQLite, theme, general app changes |
| [flowers-and-garden](flowers-and-garden/SKILL.md) | Flower SVGs, garden layout, ambient background, animations |

Invoke explicitly: `@bloom-journal-dev` or `@flowers-and-garden` in chat.

To add a skill: create a folder with `SKILL.md` (YAML frontmatter + markdown). Follow [Cursor skill authoring](https://cursor.com/docs/context/skills).
