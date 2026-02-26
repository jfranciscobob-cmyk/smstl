import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  subtitle?: string;
  trend?: string;
}

const variantConfig = {
  default: {
    border: "border-border",
    iconBg: "bg-muted",
    iconColor: "text-foreground",
    valueBg: "",
  },
  success: {
    border: "border-success/20",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    valueBg: "text-success",
  },
  warning: {
    border: "border-warning/20",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    valueBg: "text-warning",
  },
  danger: {
    border: "border-destructive/20",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    valueBg: "text-destructive",
  },
  info: {
    border: "border-info/20",
    iconBg: "bg-info/10",
    iconColor: "text-info",
    valueBg: "text-info",
  },
};

export function StatCard({ title, value, icon, variant = "default", subtitle, trend }: StatCardProps) {
  const config = variantConfig[variant];
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md",
      config.border
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", config.iconBg, config.iconColor)}>
          {icon}
        </div>
      </div>
      <p className={cn("text-3xl font-extrabold tracking-tight font-mono", config.valueBg || "text-foreground")}>
        {value.toLocaleString("pt-BR")}
      </p>
      {subtitle && (
        <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
      {trend && (
        <p className="mt-1 text-xs font-medium text-success">{trend}</p>
      )}
    </div>
  );
}