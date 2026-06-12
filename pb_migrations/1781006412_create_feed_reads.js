migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const usersId = users.id || users.Id

  const collection = new Collection({
    type: "base",
    name: "feed_reads",
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
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
        type: "date",
        name: "last_read_at",
        required: true,
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
      "CREATE UNIQUE INDEX idx_feed_reads_user ON feed_reads (user)",
      "CREATE INDEX idx_feed_reads_last_read_at ON feed_reads (last_read_at)",
    ],
  })

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("feed_reads")

  app.delete(collection)
})
