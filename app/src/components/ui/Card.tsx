import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glow" | "pulse";
}

export function Card({
  className,
  variant = "default",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-charcoal border border-ash/60 rounded-xl p-4 transition-all duration-300",
        variant === "default" && "glow-card",
        variant === "glow" && "glow-border rounded-xl",
        variant === "pulse" && "glow-card shimmer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-xs font-medium text-stone uppercase tracking-wider", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
