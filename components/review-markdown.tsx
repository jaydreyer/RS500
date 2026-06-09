import Markdown from "react-markdown";

import { cn } from "@/lib/utils";

const REVIEW_ALLOWED_ELEMENTS = ["p", "strong", "em", "br"] as const;

export function ReviewMarkdown({
  children,
  className,
  quoted = true,
}: {
  children: string;
  className?: string;
  quoted?: boolean;
}) {
  return (
    <Markdown
      allowedElements={[...REVIEW_ALLOWED_ELEMENTS]}
      skipHtml
      unwrapDisallowed
      components={{
        p({ children }) {
          return (
            <p className={cn("whitespace-pre-wrap", className)}>
              {quoted && <span aria-hidden="true">&quot;</span>}
              {children}
              {quoted && <span aria-hidden="true">&quot;</span>}
            </p>
          );
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
  );
}
