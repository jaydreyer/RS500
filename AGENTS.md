<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a
library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones
like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This
includes API syntax, configuration, version migration, library-specific
debugging, setup instructions, and CLI tool usage. Use even when you think you
know the answer -- your training data may not reflect recent changes. Prefer
this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business
logic, code review, or general programming concepts.

## Context7 Steps

1. Always start with `resolve-library-id` using the library name and the user's
   question, unless the user provides an exact library ID in `/org/project`
   format.
2. Pick the best match by exact name match, description relevance, code snippet
   count, source reputation, and benchmark score. Use version-specific IDs when
   the user mentions a version.
3. Call `query-docs` with the selected library ID and the user's full question.
4. Answer using the fetched docs.
<!-- context7 -->

## Local PR Review

When the user says the work is ready for PR review, asks for localhost review,
or asks for screenshots of authenticated app changes, use the local review stack
instead of any production-like backend.

Run:

```bash
npm run review:local
```

This command must be preferred over `npm run dev` for PR screenshot/review work.
It forces a localhost PocketBase backend, uses `./tmp/pb_review_data`, seeds
local sample data, enables the localhost-only dev login route, and runs
`npm run review:check`.

Do not point PR review at `ai-lab`, production, staging, or any non-local
PocketBase URL. The review scripts intentionally refuse non-local app/backend
URLs. If the local review stack is already running, verify it with:

```bash
npm run review:check
```

Use this local dev login for authenticated browser screenshots:

```text
http://localhost:3000/api/dev/login?user=maya
```

The seeded sample password is `spin500-dev`; the primary sample account is
`maya.dev@example.com`.
