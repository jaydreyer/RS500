migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "albums",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        type: "number",
        name: "rank",
        required: true,
        min: 1,
        max: 500,
        presentable: true,
      },
      {
        type: "text",
        name: "title",
        required: true,
        max: 300,
        presentable: true,
      },
      {
        type: "text",
        name: "artist",
        required: true,
        max: 300,
        presentable: true,
      },
      {
        type: "number",
        name: "year",
        required: true,
        min: 1800,
        max: 2100,
      },
      {
        type: "url",
        name: "cover_url",
        required: true,
      },
      {
        type: "url",
        name: "spotify_url",
      },
      {
        type: "url",
        name: "apple_music_url",
      },
      {
        type: "json",
        name: "external_ids",
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_albums_rank ON albums (rank)",
      "CREATE INDEX idx_albums_artist_title ON albums (artist, title)",
    ],
  })

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("albums")

  app.delete(collection)
})
