migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const albums = app.findCollectionByNameOrId("albums")
  const usersId = users.id || users.Id
  const albumsId = albums.id || albums.Id

  const collection = new Collection({
    type: "base",
    name: "listens",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
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
        type: "relation",
        name: "album",
        required: true,
        maxSelect: 1,
        collectionId: albumsId,
        cascadeDelete: false,
      },
      {
        type: "select",
        name: "kind",
        required: true,
        maxSelect: 1,
        values: ["fresh", "skip"],
      },
      {
        type: "select",
        name: "status",
        required: true,
        maxSelect: 1,
        values: ["listening", "rated"],
      },
      {
        type: "number",
        name: "rating",
        min: 1,
        max: 10,
      },
      {
        type: "text",
        name: "take",
        max: 180,
      },
      {
        type: "text",
        name: "week",
        required: true,
        max: 8,
      },
      {
        type: "date",
        name: "rated_at",
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_listens_user_album ON listens (user, album)",
      "CREATE INDEX idx_listens_week ON listens (week)",
      "CREATE INDEX idx_listens_user_status_kind ON listens (user, status, kind)",
      "CREATE INDEX idx_listens_album ON listens (album)",
    ],
  })

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("listens")

  app.delete(collection)
})
