import assert from "node:assert/strict"
import test from "node:test"

import { getFeedUnreadCount, markFeedRead } from "../lib/feed-read.ts"

test("marking feed read clears unread mentions when read marker already exists", async () => {
  const pb = createFakePocketBase({
    feedRead: { id: "read-1", user: "jay", last_read_at: "2026-06-15T10:00:00.000Z" },
    mentions: [
      { id: "mention-1", post: "post-1", user: "jay", read_at: "" },
      { id: "mention-2", post: "post-2", user: "jay", read_at: "2026-06-15T11:00:00.000Z" },
    ],
    posts: [],
  })
  const readAt = "2026-06-16T12:00:00.000Z"

  await markFeedRead(pb, "jay", readAt)

  assert.deepEqual(pb.calls.feedReadUpdates, [
    {
      id: "read-1",
      payload: { last_read_at: readAt },
      options: { requestKey: null },
    },
  ])
  assert.deepEqual(pb.calls.mentionUpdates, [
    {
      id: "mention-1",
      payload: { read_at: readAt },
      options: { requestKey: null },
    },
  ])
})

test("unread count does not double count mentioned posts", async () => {
  const pb = createFakePocketBase({
    feedRead: { id: "read-1", user: "jay", last_read_at: "2026-06-15T10:00:00.000Z" },
    mentions: [{ id: "mention-1", post: "post-1", user: "jay", read_at: "" }],
    posts: [
      { id: "post-1", user: "mavis", created: "2026-06-16T10:00:00.000Z" },
      { id: "post-2", user: "mavis", created: "2026-06-16T11:00:00.000Z" },
    ],
  })

  assert.equal(await getFeedUnreadCount(pb, "jay"), 2)
})

function createFakePocketBase({ feedRead, mentions, posts }) {
  const calls = {
    feedReadCreates: [],
    feedReadUpdates: [],
    mentionUpdates: [],
  }

  return {
    calls,
    filter(expression, params) {
      return { expression, params }
    },
    collection(name) {
      if (name === "feed_reads") {
        return {
          async getFirstListItem() {
            if (!feedRead) {
              throw new Error("missing feed read")
            }

            return feedRead
          },
          async getList() {
            return { items: feedRead ? [feedRead] : [] }
          },
          async create(payload, options) {
            calls.feedReadCreates.push({ payload, options })
            return { id: "read-created", ...payload }
          },
          async update(id, payload, options) {
            calls.feedReadUpdates.push({ id, payload, options })
            return { id, ...payload }
          },
        }
      }

      if (name === "feed_mentions") {
        return {
          async getFullList() {
            return mentions
          },
          async update(id, payload, options) {
            calls.mentionUpdates.push({ id, payload, options })
            return { id, ...payload }
          },
        }
      }

      if (name === "feed_posts") {
        return {
          async getFullList() {
            return posts
          },
        }
      }

      throw new Error(`Unexpected collection ${name}`)
    },
  }
}
