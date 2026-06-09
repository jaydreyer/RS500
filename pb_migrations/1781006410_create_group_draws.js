migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const albums = app.findCollectionByNameOrId("albums")
  const listens = app.findCollectionByNameOrId("listens")
  const usersId = users.id || users.Id
  const albumsId = albums.id || albums.Id

  let groups = findOptionalCollection(app, "groups")

  if (!groups) {
    groups = new Collection({
      type: "base",
      name: "groups",
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: "text",
          name: "name",
          required: true,
          max: 120,
          presentable: true,
        },
        {
          type: "text",
          name: "slug",
          required: true,
          max: 80,
        },
        {
          type: "bool",
          name: "active",
        },
        {
          type: "autodate",
          name: "created",
          onCreate: true,
          onUpdate: false,
        },
        {
          type: "autodate",
          name: "updated",
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_groups_slug ON groups (slug)",
        "CREATE INDEX idx_groups_active ON groups (active)",
      ],
    })

    app.save(groups)
  }

  const savedGroups = app.findCollectionByNameOrId("groups")
  const groupsId = savedGroups.id || savedGroups.Id

  let groupMembers = findOptionalCollection(app, "group_members")

  if (!groupMembers) {
    groupMembers = new Collection({
      type: "base",
      name: "group_members",
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: "relation",
          name: "group",
          required: true,
          maxSelect: 1,
          collectionId: groupsId,
          cascadeDelete: true,
        },
        {
          type: "relation",
          name: "user",
          required: true,
          maxSelect: 1,
          collectionId: usersId,
          cascadeDelete: true,
        },
        {
          type: "bool",
          name: "active",
        },
        {
          type: "select",
          name: "role",
          maxSelect: 1,
          values: ["member", "manager"],
        },
        {
          type: "autodate",
          name: "created",
          onCreate: true,
          onUpdate: false,
        },
        {
          type: "autodate",
          name: "updated",
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_group_members_group_user ON group_members (`group`, user)",
        "CREATE INDEX idx_group_members_user ON group_members (user)",
        "CREATE INDEX idx_group_members_group ON group_members (`group`)",
      ],
    })

    app.save(groupMembers)
  }

  let groupDraws = findOptionalCollection(app, "group_draws")

  if (!groupDraws) {
    groupDraws = new Collection({
      type: "base",
      name: "group_draws",
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: "relation",
          name: "group",
          required: true,
          maxSelect: 1,
          collectionId: groupsId,
          cascadeDelete: true,
        },
        {
          type: "relation",
          name: "album",
          required: true,
          maxSelect: 1,
          collectionId: albumsId,
          cascadeDelete: false,
        },
        {
          type: "text",
          name: "week",
          required: true,
          max: 8,
        },
        {
          type: "relation",
          name: "created_by",
          required: true,
          maxSelect: 1,
          collectionId: usersId,
          cascadeDelete: false,
        },
        {
          type: "autodate",
          name: "created",
          onCreate: true,
          onUpdate: false,
        },
        {
          type: "autodate",
          name: "updated",
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_group_draws_group_week ON group_draws (`group`, week)",
        "CREATE INDEX idx_group_draws_week ON group_draws (week)",
        "CREATE INDEX idx_group_draws_album ON group_draws (album)",
      ],
    })

    app.save(groupDraws)
  }

  const savedGroupDraws = app.findCollectionByNameOrId("group_draws")
  const groupDrawsId = savedGroupDraws.id || savedGroupDraws.Id

  if (!hasField(listens, "group_draw")) {
    listens.fields.addMarshaledJSON(JSON.stringify({
      type: "relation",
      name: "group_draw",
      maxSelect: 1,
      collectionId: groupDrawsId,
      cascadeDelete: false,
    }))
  }

  if (!listens.indexes.some((index) => index.includes("idx_listens_group_draw"))) {
    listens.indexes = [
      ...listens.indexes,
      "CREATE INDEX idx_listens_group_draw ON listens (group_draw)",
    ]
  }

  app.save(listens)
}, (app) => {
  const listens = app.findCollectionByNameOrId("listens")
  if (hasField(listens, "group_draw")) {
    listens.fields.removeByName("group_draw")
  }
  listens.indexes = listens.indexes.filter((index) => !index.includes("idx_listens_group_draw"))
  app.save(listens)

  for (const name of ["group_draws", "group_members", "groups"]) {
    const collection = findOptionalCollection(app, name)
    if (collection) {
      app.delete(collection)
    }
  }
})

function findOptionalCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function hasField(collection, fieldName) {
  try {
    collection.fields.getByName(fieldName)
    return true
  } catch {
    return false
  }
}
