migrate((app) => {
  const collection = app.findCollectionByNameOrId("listens")
  const rating = collection.fields.getByName("rating")

  rating.min = 0

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("listens")
  const rating = collection.fields.getByName("rating")

  rating.min = 1

  app.save(collection)
})
