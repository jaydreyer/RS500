import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
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

export const REVIEW_MARKDOWN_PLUGINS = [remarkReviewStrikethrough];
