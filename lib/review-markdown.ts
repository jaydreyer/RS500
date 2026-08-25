import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTable } from "micromark-extension-gfm-table";
import type { Processor } from "unified";

export const REVIEW_ALLOWED_ELEMENTS = [
  "p",
  "strong",
  "em",
  "del",
  "br",
  "ol",
  "ul",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "blockquote",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
] as const;

type ReviewMarkdownData = {
  fromMarkdownExtensions?: unknown[];
  micromarkExtensions?: unknown[];
};

function remarkReviewStrikethrough(this: Processor) {
  const data = this.data() as ReviewMarkdownData;
  const micromarkExtensions = data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(gfmStrikethrough({ singleTilde: false }));
  fromMarkdownExtensions.push(gfmStrikethroughFromMarkdown());
}

function remarkReviewTable(this: Processor) {
  const data = this.data() as ReviewMarkdownData;
  const micromarkExtensions = data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(gfmTable());
  fromMarkdownExtensions.push(gfmTableFromMarkdown());
}

export const REVIEW_MARKDOWN_PLUGINS = [remarkReviewStrikethrough, remarkReviewTable];
