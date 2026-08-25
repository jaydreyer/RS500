migrate((app) => {
  const collection = app.findCollectionByNameOrId("feed_posts")
  const body = collection.fields.getByName("body")

  body.max = 2000

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("feed_posts")
  const body = collection.fields.getByName("body")

  body.max = 560

  app.save(collection)
})
