migrate((app) => {
  const listens = app.findCollectionByNameOrId("listens")
  const users = app.findCollectionByNameOrId("users")
  const listensId = listens.id || listens.Id
  const usersId = users.id || users.Id

  const collection = new Collection({
    type: "base",
    name: "review_replies",
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
        name: "body",
        required: true,
        max: 280,
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
      "CREATE INDEX idx_review_replies_listen_created ON review_replies (listen, created)",
      "CREATE INDEX idx_review_replies_user_created ON review_replies (user, created)",
    ],
  })

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("review_replies")

  app.delete(collection)
})
