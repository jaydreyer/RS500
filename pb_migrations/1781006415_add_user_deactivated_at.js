migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  if (!hasField(users, "deactivated_at")) {
    users.fields.addMarshaledJSON(JSON.stringify([
      {
        type: "date",
        name: "deactivated_at",
      },
    ]))
    app.save(users)
  }
}, (app) => {
  const users = app.findCollectionByNameOrId("users")

  if (hasField(users, "deactivated_at")) {
    users.fields.removeByName("deactivated_at")
    app.save(users)
  }
})

function hasField(collection, fieldName) {
  try {
    collection.fields.getByName(fieldName)
    return true
  } catch {
    return false
  }
}
