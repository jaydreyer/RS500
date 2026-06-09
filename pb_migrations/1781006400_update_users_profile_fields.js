migrate((app) => {
  const collection = app.findCollectionByNameOrId("users")

  collection.listRule = '@request.auth.id != ""'
  collection.viewRule = '@request.auth.id != ""'

  collection.fields.addMarshaledJSON(JSON.stringify([
    {
      type: "text",
      name: "display_name",
      max: 80,
      presentable: true,
    },
    {
      type: "file",
      name: "avatar",
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ],
      thumbs: ["96x96", "256x256"],
    },
  ]))

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("users")

  collection.fields.removeByName("display_name")
  collection.fields.removeByName("avatar")
  collection.listRule = null
  collection.viewRule = null

  app.save(collection)
})
