# RS500 Codex Session Guide

## Documentation

Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service. Start with `resolve-library-id`, then query the selected docs with the user's full question.

## New Feature Workflow

When the user starts a new feature or fix in a fresh session, help them stay on the GitHub workflow rails:

1. Check the current state with `git status -sb`, `git branch --show-current`, and `git remote -v`.
2. If the worktree is dirty before any new work, explain what changed and ask whether it belongs to the new feature.
3. If on `main` or detached `HEAD`, create a focused branch named `codex/<short-feature-name>`.
4. Treat one feature as one branch and one Codex worktree/session when possible.
5. Stage only files that belong to the feature. Avoid `git add -A` in a mixed worktree.
6. Before committing, run the relevant checks for the changed surface. Prefer `npm run lint`, `npm run typecheck`, tests, and `npm run build` when appropriate.
7. Commit with a concise message, push with upstream tracking, and offer to open a draft PR.

Default branch shape:

```text
main
  -> codex/short-feature-name
       -> focused commits
       -> push
       -> draft PR
       -> review / CI
       -> ready PR
       -> squash merge into main
```

If the user seems unsure, be explicit and reassuring. Name the next Git step, why it matters, and what will happen if they say yes.
