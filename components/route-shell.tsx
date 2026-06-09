import { Eyebrow } from "@/components/primitives";
import { cn } from "@/lib/utils";

export function RouteShell({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full", className)}>
      <div className="mb-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 text-5xl md:text-6xl">{title}</h1>
      </div>
      {children}
    </section>
  );
}
