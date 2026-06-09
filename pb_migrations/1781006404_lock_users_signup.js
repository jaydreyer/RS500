migrate((app) => {
  const collection = app.findCollectionByNameOrId("users")

  collection.createRule = null

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("users")

  collection.createRule = ""

  app.save(collection)
})
