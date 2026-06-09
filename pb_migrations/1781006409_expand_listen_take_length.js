migrate((app) => {
  const collection = app.findCollectionByNameOrId("listens")
  const take = collection.fields.getByName("take")

  take.max = 2000

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("listens")
  const take = collection.fields.getByName("take")

  take.max = 180

  app.save(collection)
})
