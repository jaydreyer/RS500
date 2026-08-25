import Markdown from "react-markdown";

import {
  REVIEW_ALLOWED_ELEMENTS,
  REVIEW_MARKDOWN_PLUGINS,
} from "@/lib/review-markdown";

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
        remarkPlugins={REVIEW_MARKDOWN_PLUGINS}
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
          del({ children }) {
            return <del className="line-through">{children}</del>;
          },
          h1({ children }) {
            return <h1 className="mt-5 text-3xl first:mt-0">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="mt-5 text-2xl first:mt-0">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="mt-4 text-xl first:mt-0">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="mt-4 text-lg first:mt-0">{children}</h4>;
          },
          h5({ children }) {
            return <h5 className="mt-4 text-base first:mt-0">{children}</h5>;
          },
          h6({ children }) {
            return <h6 className="mt-4 text-sm first:mt-0">{children}</h6>;
          },
          a({ children, href }) {
            return (
              <a
                className="font-semibold text-[var(--accent)] underline decoration-1 underline-offset-2 hover:text-[var(--ink)]"
                href={href}
                rel="noreferrer"
                target="_blank"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="mt-3 border-l-2 border-[var(--accent)] pl-4 text-[var(--ink-soft)]">
                {children}
              </blockquote>
            );
          },
          pre({ children }) {
            return (
              <pre className="mt-3 overflow-x-auto rounded-md bg-[var(--paper-3)] p-3 text-sm leading-6">
                {children}
              </pre>
            );
          },
          code({ children }) {
            return (
              <code className="rounded bg-[var(--paper-3)] px-1 py-0.5 font-mono text-[0.9em]">
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-left text-sm leading-6">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="border-b-2 border-[var(--line)]">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-[var(--line)]">{children}</tbody>;
          },
          th({ children, ...props }) {
            return (
              <th className="px-3 py-2 font-extrabold text-[var(--ink)]" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="px-3 py-2 align-top" {...props}>
                {children}
              </td>
            );
          },
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
