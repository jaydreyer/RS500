import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";

import {
  REVIEW_ALLOWED_ELEMENTS,
  REVIEW_MARKDOWN_PLUGINS,
} from "../lib/review-markdown.ts";

function renderReviewMarkdown(markdown) {
  return renderToStaticMarkup(
    Markdown({
      allowedElements: REVIEW_ALLOWED_ELEMENTS,
      children: markdown,
      remarkPlugins: REVIEW_MARKDOWN_PLUGINS,
      skipHtml: true,
      unwrapDisallowed: true,
    }),
  );
}

test("renders the supported review Markdown subset", () => {
  const html = renderReviewMarkdown(`# Thriller notes

[Read more](https://example.com/review)

> An all-killer record.

~~Not a weak track~~

Inline: \`Billie Jean\`

\`\`\`
Beat it
\`\`\``);

  assert.match(html, /<h1>Thriller notes<\/h1>/);
  assert.match(html, /<a href="https:\/\/example\.com\/review">Read more<\/a>/);
  assert.match(html, /<blockquote>\n?<p>An all-killer record\.<\/p>\n?<\/blockquote>/);
  assert.match(html, /<del>Not a weak track<\/del>/);
  assert.match(html, /<code>Billie Jean<\/code>/);
  assert.match(html, /<pre><code>Beat it\n<\/code><\/pre>/);
});

test("preserves the original review Markdown subset", () => {
  const html = renderReviewMarkdown(`**A classic.**\n\n*Every hook lands.*\n\nA plain ~8/10~ score and https://example.com stay as written.\n\n- Billie Jean\n- Beat It\n\n1. Thriller\n2. Human Nature`);

  assert.match(html, /<p><strong>A classic\.<\/strong><\/p>/);
  assert.match(html, /<p><em>Every hook lands\.<\/em><\/p>/);
  assert.match(html, /A plain ~8\/10~ score and https:\/\/example\.com stay as written\./);
  assert.doesNotMatch(html, /<del>8\/10<\/del>|<a href="https:\/\/example\.com">/);
  assert.match(html, /<ul>\n?<li>Billie Jean<\/li>\n?<li>Beat It<\/li>\n?<\/ul>/);
  assert.match(html, /<ol>\n?<li>Thriller<\/li>\n?<li>Human Nature<\/li>\n?<\/ol>/);
});

test("renders Markdown tables while preserving their alignment and inline formatting", () => {
  const html = renderReviewMarkdown(`| Rank | Artist | Album | Sales |
| :--- | :----: | ----: | ---: |
| 1 | Michael Jackson | *Thriller* | **70M** |`);

  assert.match(html, /<table>/);
  assert.match(html, /<thead>\n?<tr>\n?<th style="text-align:left">Rank<\/th>\n?<th style="text-align:center">Artist<\/th>\n?<th style="text-align:right">Album<\/th>\n?<th style="text-align:right">Sales<\/th>/);
  assert.match(html, /<tbody>\n?<tr>\n?<td style="text-align:left">1<\/td>\n?<td style="text-align:center">Michael Jackson<\/td>\n?<td style="text-align:right"><em>Thriller<\/em><\/td>\n?<td style="text-align:right"><strong>70M<\/strong><\/td>/);
});

test("keeps raw HTML and unsupported visual elements out of reviews", () => {
  const html = renderReviewMarkdown(
    '<script>alert("nope")</script>\n\n![album art](https://example.com/cover.png)',
  );

  assert.doesNotMatch(html, /<script|<img/i);
});
