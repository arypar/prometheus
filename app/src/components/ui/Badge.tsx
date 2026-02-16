import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "gold" | "buy" | "sell" | "success" | "error" | "warning";
}

const variantStyles: Record<string, string> = {
  default: "bg-ash text-stone",
  gold: "bg-torch-gold/10 text-torch-gold border border-torch-gold/20",
  buy: "bg-torch-gold/10 text-torch-gold border border-torch-gold/20 shadow-[0_0_8px_rgba(246,198,91,0.15)]",
  sell: "bg-prometheus-red/10 text-prometheus-red border border-prometheus-red/20",
  success: "bg-torch-gold/10 text-torch-gold border border-torch-gold/20",
  error: "bg-prometheus-red/10 text-prometheus-red border border-prometheus-red/20",
  warning: "bg-ember/10 text-ember border border-ember/20",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {(variant === "buy") && (
        <span className="w-1 h-1 rounded-full bg-torch-gold heartbeat" />
      )}
      {children}
    </span>
  );
}
