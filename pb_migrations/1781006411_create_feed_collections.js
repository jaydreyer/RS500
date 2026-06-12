migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const albums = app.findCollectionByNameOrId("albums")
  const usersId = users.id || users.Id
  const albumsId = albums.id || albums.Id

  const posts = new Collection({
    type: "base",
    name: "feed_posts",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
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
        type: "relation",
        name: "album",
        maxSelect: 1,
        collectionId: albumsId,
        cascadeDelete: false,
      },
      {
        type: "text",
        name: "body",
        max: 560,
      },
      {
        type: "file",
        name: "image",
        maxSelect: 1,
        maxSize: 8388608,
        mimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ],
        thumbs: ["640x0", "960x0"],
      },
    ],
    indexes: [],
  })

  app.save(posts)

  const savedPosts = app.findCollectionByNameOrId("feed_posts")
  const postsId = savedPosts.id || savedPosts.Id

  const replies = new Collection({
    type: "base",
    name: "feed_replies",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
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
        name: "user",
        required: true,
        maxSelect: 1,
        collectionId: usersId,
        cascadeDelete: true,
      },
      {
        type: "text",
        name: "body",
        required: true,
        max: 280,
      },
    ],
    indexes: [],
  })

  app.save(replies)

  const reactions = new Collection({
    type: "base",
    name: "feed_reactions",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
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
        name: "user",
        required: true,
        maxSelect: 1,
        collectionId: usersId,
        cascadeDelete: true,
      },
      {
        type: "text",
        name: "emoji",
        required: true,
        max: 24,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_feed_reactions_post_user_emoji ON feed_reactions (post, user, emoji)",
      "CREATE INDEX idx_feed_reactions_post ON feed_reactions (post)",
    ],
  })

  app.save(reactions)

  addBaseFields(app, "feed_posts", [
    "CREATE INDEX idx_feed_posts_created ON feed_posts (created)",
    "CREATE INDEX idx_feed_posts_album_created ON feed_posts (album, created)",
    "CREATE INDEX idx_feed_posts_user_created ON feed_posts (user, created)",
  ])
  addBaseFields(app, "feed_replies", [
    "CREATE INDEX idx_feed_replies_post_created ON feed_replies (post, created)",
    "CREATE INDEX idx_feed_replies_user_created ON feed_replies (user, created)",
  ])
  addBaseFields(app, "feed_reactions", [
    "CREATE UNIQUE INDEX idx_feed_reactions_post_user_emoji ON feed_reactions (post, user, emoji)",
    "CREATE INDEX idx_feed_reactions_post ON feed_reactions (post)",
  ])
}, (app) => {
  app.delete(app.findCollectionByNameOrId("feed_reactions"))
  app.delete(app.findCollectionByNameOrId("feed_replies"))
  app.delete(app.findCollectionByNameOrId("feed_posts"))
})

function addBaseFields(app, name, indexes) {
  const collection = app.findCollectionByNameOrId(name)

  collection.fields.addMarshaledJSON(JSON.stringify([
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
  ]))
  collection.indexes = indexes

  app.save(collection)
}
