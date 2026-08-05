import { FileDown } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReviewCsvExportLink({
  className,
  label = "Export CSV",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      download
      href="/api/reviews/export"
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), className)}
    >
      <FileDown className="size-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}
