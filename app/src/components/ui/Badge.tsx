import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "gold" | "buy" | "sell" | "success" | "error" | "warning";
}

const variantStyles: Record<string, string> = {
  default: "bg-ash text-stone",
  gold: "bg-torch-gold/10 text-torch-gold",
  buy: "bg-torch-gold/10 text-torch-gold",
  sell: "bg-prometheus-red/10 text-prometheus-red",
  success: "bg-torch-gold/10 text-torch-gold",
  error: "bg-prometheus-red/10 text-prometheus-red",
  warning: "bg-ember/10 text-ember",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
