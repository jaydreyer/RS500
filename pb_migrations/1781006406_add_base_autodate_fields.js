migrate((app) => {
  for (const name of ["albums", "listens", "reactions"]) {
    const collection = app.findCollectionByNameOrId(name)

    if (!hasField(collection, "created")) {
      collection.fields.addMarshaledJSON(JSON.stringify({
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      }))
    }

    if (!hasField(collection, "updated")) {
      collection.fields.addMarshaledJSON(JSON.stringify({
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      }))
    }

    app.save(collection)
  }
}, (app) => {
  for (const name of ["albums", "listens", "reactions"]) {
    const collection = app.findCollectionByNameOrId(name)

    collection.fields.removeByName("created")
    collection.fields.removeByName("updated")

    app.save(collection)
  }
})

function hasField(collection, fieldName) {
  try {
    collection.fields.getByName(fieldName)
    return true
  } catch {
    return false
  }
}
