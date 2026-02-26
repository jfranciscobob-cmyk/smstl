import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  subtitle?: string;
}

const variantStyles = {
  default: "border-border",
  success: "border-status-present/30",
  warning: "border-status-vacation/30",
  danger: "border-status-absent/30",
  info: "border-info/30",
};

const iconBg = {
  default: "bg-muted text-foreground",
  success: "bg-status-present/10 text-status-present",
  warning: "bg-status-vacation/10 text-status-vacation",
  danger: "bg-status-absent/10 text-status-absent",
  info: "bg-info/10 text-info",
};

export function StatCard({ title, value, icon, variant = "default", subtitle }: StatCardProps) {
  return (
    <div className={cn("glass-card stat-glow rounded-lg p-5 animate-fade-in", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground animate-count-up">
            {value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("rounded-lg p-2.5", iconBg[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
