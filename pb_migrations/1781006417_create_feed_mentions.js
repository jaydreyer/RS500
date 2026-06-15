migrate((app) => {
  try {
    app.findCollectionByNameOrId("feed_mentions")
    return
  } catch {
    // Create the collection when it does not exist yet.
  }

  const users = app.findCollectionByNameOrId("users")
  const posts = app.findCollectionByNameOrId("feed_posts")
  const replies = app.findCollectionByNameOrId("feed_replies")
  const usersId = users.id || users.Id
  const postsId = posts.id || posts.Id
  const repliesId = replies.id || replies.Id

  const collection = new Collection({
    type: "base",
    name: "feed_mentions",
    listRule: '@request.auth.id != "" && (user = @request.auth.id || actor = @request.auth.id)',
    viewRule: '@request.auth.id != "" && (user = @request.auth.id || actor = @request.auth.id)',
    createRule: '@request.auth.id != "" && actor = @request.auth.id && user != @request.auth.id',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: null,
    fields: [
      {
        type: "relation",
        name: "post",
        required: true,
        maxSelect: 1,
        collectionId: postsId,
        cascadeDelete: true,
      },
      {
        type: "relation",
        name: "reply",
        maxSelect: 1,
        collectionId: repliesId,
        cascadeDelete: true,
      },
      {
        type: "relation",
        name: "actor",
        required: true,
        maxSelect: 1,
        collectionId: usersId,
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
        type: "date",
        name: "read_at",
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
      "CREATE INDEX idx_feed_mentions_user_created ON feed_mentions (user, created)",
      "CREATE INDEX idx_feed_mentions_user_read_at ON feed_mentions (user, read_at)",
      "CREATE INDEX idx_feed_mentions_post ON feed_mentions (post)",
      "CREATE INDEX idx_feed_mentions_reply ON feed_mentions (reply)",
    ],
  })

  app.save(collection)
}, (app) => {
  let collection

  try {
    collection = app.findCollectionByNameOrId("feed_mentions")
  } catch {
    return
  }

  app.delete(collection)
})
