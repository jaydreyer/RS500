migrate((app) => {
  const posts = app.findCollectionByNameOrId("feed_posts")

  posts.fields.addMarshaledJSON(JSON.stringify([
    {
      type: "bool",
      name: "image_is_album_cover",
    },
    {
      type: "text",
      name: "album_cover_image",
      max: 255,
    },
  ]))

  app.save(posts)
}, (app) => {
  const posts = app.findCollectionByNameOrId("feed_posts")

  posts.fields.removeByName("image_is_album_cover")
  posts.fields.removeByName("album_cover_image")
  app.save(posts)
})
