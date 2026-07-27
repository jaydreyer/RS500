migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  if (users.fields.getByName("deactivated_at") === null) {
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

  if (users.fields.getByName("deactivated_at") !== null) {
    users.fields.removeByName("deactivated_at")
    app.save(users)
  }
})
