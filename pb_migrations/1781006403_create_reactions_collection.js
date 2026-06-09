migrate((app) => {
  const listens = app.findCollectionByNameOrId("listens")
  const users = app.findCollectionByNameOrId("users")
  const listensId = listens.id || listens.Id
  const usersId = users.id || users.Id

  const collection = new Collection({
    type: "base",
    name: "reactions",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    fields: [
      {
        type: "relation",
        name: "listen",
        required: true,
        maxSelect: 1,
        collectionId: listensId,
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
        max: 24,
      },
      {
        type: "text",
        name: "comment",
        max: 180,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_reactions_listen_user ON reactions (listen, user)",
      "CREATE INDEX idx_reactions_listen ON reactions (listen)",
    ],
  })

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("reactions")

  app.delete(collection)
})
