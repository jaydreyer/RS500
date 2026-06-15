migrate((app) => {
  const collection = app.findCollectionByNameOrId("albums")

  collection.fields.addMarshaledJSON(JSON.stringify([{
    type: "json",
    name: "review_links",
  }]))

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("albums")

  collection.fields.removeByName("review_links")

  app.save(collection)
})
