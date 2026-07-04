import Markdown from "react-markdown";

const REVIEW_ALLOWED_ELEMENTS = ["p", "strong", "em", "br", "ol", "ul", "li"] as const;

export function ReviewMarkdown({
  children,
  className,
  quoted = false,
}: {
  children: string;
  className?: string;
  quoted?: boolean;
}) {
  return (
    <div className={className}>
      <Markdown
        allowedElements={[...REVIEW_ALLOWED_ELEMENTS]}
        skipHtml
        unwrapDisallowed
        components={{
          p({ children }) {
            return (
              <p className="whitespace-pre-wrap [&:not(:first-child)]:mt-3">
                {quoted && <span aria-hidden="true">&quot;</span>}
                {children}
                {quoted && <span aria-hidden="true">&quot;</span>}
              </p>
            );
          },
          ol({ children }) {
            return (
              <ol className="mt-2 list-decimal space-y-1 pl-6 marker:text-[var(--accent)]">
                {children}
              </ol>
            );
          },
          ul({ children }) {
            return (
              <ul className="mt-2 list-disc space-y-1 pl-6 marker:text-[var(--accent)]">
                {children}
              </ul>
            );
          },
          li({ children }) {
            return <li className="pl-1">{children}</li>;
          },
          strong({ children }) {
            return <strong className="font-extrabold text-[var(--ink)]">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
