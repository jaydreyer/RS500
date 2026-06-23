migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  if (!hasField(users, "google_sub")) {
    users.fields.addMarshaledJSON(JSON.stringify([
      {
        type: "text",
        name: "google_sub",
        max: 128,
        hidden: true,
      },
    ]))
  }

  users.indexes = users.indexes.filter((index) => !index.includes("idx_users_google_sub"))
  users.indexes = [
    ...users.indexes,
    "CREATE UNIQUE INDEX idx_users_google_sub ON users (google_sub) WHERE google_sub != ''",
  ]

  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")

  users.indexes = users.indexes.filter((index) => !index.includes("idx_users_google_sub"))
  if (hasField(users, "google_sub")) {
    users.fields.removeByName("google_sub")
  }

  app.save(users)
})

function hasField(collection, name) {
  return collection.fields.getByName(name) !== null
}
