migrate((app) => {
  const collection = app.findCollectionByNameOrId("albums")

  collection.fields.addMarshaledJSON(JSON.stringify([
    {
      type: "file",
      name: "cover_image",
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
      ],
      protected: false,
    },
  ]))

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("albums")

  collection.fields.removeByName("cover_image")
  app.save(collection)
})
