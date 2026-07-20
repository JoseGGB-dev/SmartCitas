import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type BrandProps = {
  compact?: boolean;
  className?: string;
  to?: "/";
};

export function Brand({ compact = false, className, to = "/" }: BrandProps) {
  return (
    <Link
      to={to}
      aria-label="Ir al inicio de EsSalud SmartCitas"
      className={cn(
        "inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-xl text-xl font-black text-primary-foreground shadow-[var(--shadow-card)]"
        style={{ background: "var(--gradient-primary)" }}
      >
        +
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-bold tracking-tight">SmartCitas</span>
          <span className="block text-xs font-medium text-muted-foreground">EsSalud</span>
        </span>
      )}
    </Link>
  );
}
