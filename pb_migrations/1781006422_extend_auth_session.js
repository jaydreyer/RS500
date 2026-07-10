migrate((app) => {
  const collection = app.findCollectionByNameOrId("users")

  collection.authToken.duration = 60 * 60 * 24 * 30

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("users")

  collection.authToken.duration = 60 * 60 * 24 * 5

  app.save(collection)
})
