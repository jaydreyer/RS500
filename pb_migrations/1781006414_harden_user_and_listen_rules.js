migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const listens = app.findCollectionByNameOrId("listens")

  if (!hasField(users, "deactivated_at")) {
    users.fields.addMarshaledJSON(JSON.stringify([{
      type: "date",
      name: "deactivated_at",
    }]))
    app.save(users)
  }

  const savedUsers = app.findCollectionByNameOrId("users")
  savedUsers.deleteRule = null
  app.save(savedUsers)

  listens.createRule = null
  listens.updateRule = null

  app.db().newQuery("DROP INDEX IF EXISTS idx_listens_one_active_fresh_per_user").execute()
  listens.indexes = listens.indexes.filter((index) => !index.includes("idx_listens_one_active_fresh_per_user"))
  listens.indexes = [
    ...listens.indexes,
    "CREATE UNIQUE INDEX idx_listens_one_active_fresh_per_user ON listens (user) WHERE kind = 'fresh' AND status = 'listening'",
  ]

  app.save(listens)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  const listens = app.findCollectionByNameOrId("listens")

  users.deleteRule = "id = @request.auth.id"
  if (hasField(users, "deactivated_at")) {
    users.fields.removeByName("deactivated_at")
  }
  app.save(users)

  app.db().newQuery("DROP INDEX IF EXISTS idx_listens_one_active_fresh_per_user").execute()
  listens.indexes = listens.indexes.filter((index) => !index.includes("idx_listens_one_active_fresh_per_user"))
  listens.createRule = '@request.auth.id != "" && user = @request.auth.id'
  listens.updateRule = "user = @request.auth.id"
  app.save(listens)
})

function hasField(collection, fieldName) {
  try {
    collection.fields.getByName(fieldName)
    return true
  } catch {
    return false
  }
}
