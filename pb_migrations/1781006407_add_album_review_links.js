migrate((app) => {
  const collection = app.findCollectionByNameOrId("albums")

  collection.fields.add({
    type: "json",
    name: "review_links",
  })

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("albums")

  collection.fields.removeByName("review_links")

  app.save(collection)
})
