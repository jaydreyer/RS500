# GitHub Feature Workflow

This is the default path for starting a new RS500 feature in a new Codex session. The goal is to keep work easy to review, easy to abandon, and easy to merge.

## The Simple Rule

```text
One feature = one branch = one Codex session/worktree when possible.
```

A branch is the Git timeline for the feature. A worktree is the local folder/session where that branch is checked out. A pull request is the review and merge package.

## Start A New Feature

Start from an updated `main`:

```bash
git switch main
git pull --ff-only origin main
```

Create a focused branch:

```bash
git switch -c codex/short-feature-name
```

Good branch names:

```text
codex/album-art-cache
codex/group-draw-history
codex/feed-image-upload
codex/improve-week-draw-ui
```

## What To Ask Codex At Session Start

Paste this when you want hand-holding:

```text
I want to start a new feature. Please check git status, make sure we are on a clean branch/worktree, help me choose a codex/<feature-name> branch, and keep me on the branch -> commit -> push -> draft PR workflow.
```

If the feature is fuzzy, use:

```text
I have a rough feature idea. Before coding, help me clarify the scope, then set up the right branch/worktree and keep the PR small.
```

## During The Work

Keep the branch focused. If a new unrelated idea appears, write it down or start a separate branch later.

Before editing, Codex should inspect the relevant files and explain the intended change. Before committing, Codex should show or summarize the diff so you know what is going into GitHub.

Use explicit staging for feature files:

```bash
git add path/to/file-a path/to/file-b
```

Avoid broad staging in a mixed worktree:

```bash
git add -A
```

## Verification

Run checks that match the risk of the change:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For frontend changes, also run the app locally and do a quick browser smoke check when possible.

## Commit And Push

Commit with a short message:

```bash
git commit -m "Add album art caching"
```

Push the branch:

```bash
git push -u origin codex/short-feature-name
```

## Pull Requests

Open a draft PR when the branch has a coherent checkpoint but may still need polish, CI, or review.

Mark the PR ready when:

- The scope is complete.
- The relevant checks pass.
- The diff only contains the intended feature.
- You would be comfortable merging it.

Default PR shape:

```text
main
  <- draft PR from codex/short-feature-name
  <- review / CI / fixes
  <- ready for review
  <- squash merge
```

## If Something Feels Off

Ask Codex:

```text
Pause and orient me. What branch are we on, what changed, what is staged, and what is the safest next step?
```

That question is the emergency brake. Use it any time the Git state feels mysterious.
