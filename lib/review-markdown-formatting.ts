export type ReviewMarkdownFormat = "*" | "**" | "bullet-list" | "numbered-list";

export type ReviewMarkdownFormattingResult = {
  selectionEnd: number;
  selectionStart: number;
  value: string;
};

export function applyReviewMarkdownFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: ReviewMarkdownFormat,
): ReviewMarkdownFormattingResult {
  if (format === "*" || format === "**") {
    const selected = value.slice(selectionStart, selectionEnd);

    return {
      value: `${value.slice(0, selectionStart)}${format}${selected}${format}${value.slice(selectionEnd)}`,
      selectionStart: selectionStart + format.length,
      selectionEnd: selected
        ? selectionEnd + format.length
        : selectionStart + format.length,
    };
  }

  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineSearchStart =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
      ? selectionEnd - 1
      : selectionEnd;
  const nextLineBreak = value.indexOf("\n", lineSearchStart);
  const blockEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const markerPattern = format === "bullet-list" ? /^[-+*]\s+/ : /^\d+\.\s+/;
  const anyListMarkerPattern = /^(?:[-+*]|\d+\.)\s+/;
  const removeMarkers = lines.some((line) => markerPattern.test(line)) &&
    lines.every((line) => line.length === 0 || markerPattern.test(line));
  const prefixes = lines.map((_, index) =>
    format === "bullet-list" ? "- " : `${index + 1}. `,
  );
  const transformedLines = lines.map((line, index) =>
    removeMarkers
      ? line.replace(markerPattern, "")
      : `${prefixes[index]}${line.replace(anyListMarkerPattern, "")}`,
  );
  const transformedBlock = transformedLines.join("\n");
  const nextValue = `${value.slice(0, blockStart)}${transformedBlock}${value.slice(blockEnd)}`;

  if (selectionStart !== selectionEnd) {
    return {
      value: nextValue,
      selectionStart: blockStart,
      selectionEnd: blockStart + transformedBlock.length,
    };
  }

  const caretOffset = selectionStart - blockStart;
  const lineIndex = block.slice(0, caretOffset).split("\n").length - 1;
  const currentLineStart = lines.slice(0, lineIndex).reduce(
    (offset, line) => offset + line.length + 1,
    0,
  );
  const offsetInLine = caretOffset - currentLineStart;
  const markerLength = removeMarkers
    ? lines[lineIndex].match(markerPattern)?.[0].length ?? 0
    : prefixes[lineIndex].length;
  const transformedLineStart = transformedLines.slice(0, lineIndex).reduce(
    (offset, line) => offset + line.length + 1,
    0,
  );
  const nextOffsetInLine = removeMarkers
    ? Math.max(0, offsetInLine - markerLength)
    : offsetInLine + markerLength;
  const nextCaret = blockStart + transformedLineStart + nextOffsetInLine;

  return {
    value: nextValue,
    selectionStart: nextCaret,
    selectionEnd: nextCaret,
  };
}
