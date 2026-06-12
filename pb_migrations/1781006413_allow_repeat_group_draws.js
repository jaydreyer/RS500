migrate((app) => {
  const collection = app.findCollectionByNameOrId("group_draws")

  app.db().newQuery("DROP INDEX IF EXISTS idx_group_draws_group_week").execute()
  collection.indexes = collection.indexes.filter((index) => !index.includes("idx_group_draws_group_week"))
  collection.indexes = [
    ...collection.indexes,
    "CREATE INDEX idx_group_draws_group_week ON group_draws (`group`, week)",
  ]

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("group_draws")

  app.db().newQuery("DROP INDEX IF EXISTS idx_group_draws_group_week").execute()
  collection.indexes = collection.indexes.filter((index) => !index.includes("idx_group_draws_group_week"))
  collection.indexes = [
    ...collection.indexes,
    "CREATE UNIQUE INDEX idx_group_draws_group_week ON group_draws (`group`, week)",
  ]

  app.save(collection)
})
