migrate((app) => {
  const collection = app.findCollectionByNameOrId("albums")
  const title = collection.fields.getByName("title")

  title.max = 600

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("albums")
  const title = collection.fields.getByName("title")

  title.max = 300

  app.save(collection)
})
