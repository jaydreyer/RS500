migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const usersId = users.id || users.Id

  const ideas = new Collection({
    type: "base",
    name: "feedback_ideas",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        type: "text",
        name: "title",
        required: true,
        max: 120,
        presentable: true,
      },
      {
        type: "text",
        name: "summary",
        required: true,
        max: 1200,
      },
      {
        type: "select",
        name: "status",
        required: true,
        maxSelect: 1,
        values: ["under_review", "planned", "in_progress", "shipped", "not_planned"],
      },
      {
        type: "text",
        name: "response",
        max: 2000,
      },
      {
        type: "number",
        name: "support_count",
        min: 0,
        onlyInt: true,
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE INDEX idx_feedback_ideas_status_updated ON feedback_ideas (status, updated)",
      "CREATE INDEX idx_feedback_ideas_support ON feedback_ideas (support_count)",
    ],
  })

  app.save(ideas)

  const ideasId = app.findCollectionByNameOrId("feedback_ideas").id
    || app.findCollectionByNameOrId("feedback_ideas").Id

  const submissions = new Collection({
    type: "base",
    name: "feedback_submissions",
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id && status = "received" && idea = "" && user_unread = false',
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        type: "relation",
        name: "user",
        required: true,
        maxSelect: 1,
        collectionId: usersId,
        cascadeDelete: true,
      },
      {
        type: "select",
        name: "kind",
        required: true,
        maxSelect: 1,
        values: ["idea", "bug", "question", "other"],
      },
      {
        type: "text",
        name: "title",
        required: true,
        max: 120,
        presentable: true,
      },
      {
        type: "text",
        name: "body",
        required: true,
        max: 4000,
      },
      {
        type: "select",
        name: "status",
        required: true,
        maxSelect: 1,
        values: [
          "received",
          "needs_clarification",
          "under_review",
          "deferred",
          "planned",
          "in_progress",
          "shipped",
          "not_planned",
          "resolved",
        ],
      },
      {
        type: "relation",
        name: "idea",
        maxSelect: 1,
        collectionId: ideasId,
        cascadeDelete: false,
      },
      {
        type: "text",
        name: "page_context",
        max: 500,
      },
      {
        type: "file",
        name: "screenshot",
        maxSelect: 1,
        maxSize: 8388608,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        thumbs: ["480x0", "960x0"],
      },
      {
        type: "bool",
        name: "user_unread",
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE INDEX idx_feedback_submissions_user_created ON feedback_submissions (user, created)",
      "CREATE INDEX idx_feedback_submissions_status_updated ON feedback_submissions (status, updated)",
      "CREATE INDEX idx_feedback_submissions_idea ON feedback_submissions (idea)",
      "CREATE INDEX idx_feedback_submissions_user_unread ON feedback_submissions (user, user_unread)",
    ],
  })

  app.save(submissions)

  const submissionsId = app.findCollectionByNameOrId("feedback_submissions").id
    || app.findCollectionByNameOrId("feedback_submissions").Id

  const messages = new Collection({
    type: "base",
    name: "feedback_messages",
    listRule: '@request.auth.id != "" && submission.user = @request.auth.id',
    viewRule: '@request.auth.id != "" && submission.user = @request.auth.id',
    createRule: '@request.auth.id != "" && author = @request.auth.id && submission.user = @request.auth.id && from_admin = false',
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        type: "relation",
        name: "submission",
        required: true,
        maxSelect: 1,
        collectionId: submissionsId,
        cascadeDelete: true,
      },
      {
        type: "relation",
        name: "author",
        required: true,
        maxSelect: 1,
        collectionId: usersId,
        cascadeDelete: false,
      },
      {
        type: "bool",
        name: "from_admin",
      },
      {
        type: "text",
        name: "body",
        required: true,
        max: 2000,
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE INDEX idx_feedback_messages_submission_created ON feedback_messages (submission, created)",
    ],
  })

  app.save(messages)

  const supports = new Collection({
    type: "base",
    name: "feedback_idea_support",
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
    fields: [
      {
        type: "relation",
        name: "idea",
        required: true,
        maxSelect: 1,
        collectionId: ideasId,
        cascadeDelete: true,
      },
      {
        type: "relation",
        name: "user",
        required: true,
        maxSelect: 1,
        collectionId: usersId,
        cascadeDelete: true,
      },
      {
        type: "text",
        name: "reason",
        max: 1000,
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_feedback_support_idea_user ON feedback_idea_support (idea, user)",
      "CREATE INDEX idx_feedback_support_user ON feedback_idea_support (user)",
    ],
  })

  app.save(supports)

  const notes = new Collection({
    type: "base",
    name: "feedback_internal_notes",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        type: "relation",
        name: "submission",
        required: true,
        maxSelect: 1,
        collectionId: submissionsId,
        cascadeDelete: true,
      },
      {
        type: "relation",
        name: "author",
        required: true,
        maxSelect: 1,
        collectionId: usersId,
        cascadeDelete: false,
      },
      {
        type: "text",
        name: "body",
        required: true,
        max: 3000,
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE INDEX idx_feedback_notes_submission_created ON feedback_internal_notes (submission, created)",
    ],
  })

  app.save(notes)

  const workLinks = new Collection({
    type: "base",
    name: "feedback_work_links",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        type: "relation",
        name: "submission",
        maxSelect: 1,
        collectionId: submissionsId,
        cascadeDelete: true,
      },
      {
        type: "relation",
        name: "idea",
        maxSelect: 1,
        collectionId: ideasId,
        cascadeDelete: true,
      },
      {
        type: "select",
        name: "provider",
        required: true,
        maxSelect: 1,
        values: ["github"],
      },
      {
        type: "text",
        name: "repository",
        required: true,
        max: 200,
      },
      {
        type: "number",
        name: "issue_number",
        required: true,
        min: 1,
        onlyInt: true,
      },
      {
        type: "url",
        name: "issue_url",
        required: true,
      },
      {
        type: "text",
        name: "state",
        max: 80,
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_feedback_work_link_issue_target ON feedback_work_links (repository, issue_number, submission, idea)",
      "CREATE INDEX idx_feedback_work_link_submission ON feedback_work_links (submission)",
      "CREATE INDEX idx_feedback_work_link_idea ON feedback_work_links (idea)",
    ],
  })

  app.save(workLinks)
}, (app) => {
  for (const name of [
    "feedback_work_links",
    "feedback_internal_notes",
    "feedback_idea_support",
    "feedback_messages",
    "feedback_submissions",
    "feedback_ideas",
  ]) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    } catch {
      // Allow safe rollback if a partially applied migration omitted a collection.
    }
  }
})
