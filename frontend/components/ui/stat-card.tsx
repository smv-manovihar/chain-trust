import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  tendency?: string;
  color?: "blue" | "primary" | "green" | "destructive" | "purple" | "amber";
  className?: string;
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/5",
    text: "text-blue-600",
    border: "border-blue-500/10",
    icon: "text-blue-500"
  },
  primary: {
    bg: "bg-primary/5",
    text: "text-primary",
    border: "border-primary/10",
    icon: "text-primary"
  },
  green: {
    bg: "bg-green-500/5",
    text: "text-green-600",
    border: "border-green-500/10",
    icon: "text-green-500"
  },
  destructive: {
    bg: "bg-destructive/5",
    text: "text-destructive",
    border: "border-destructive/10",
    icon: "text-destructive"
  },
  purple: {
    bg: "bg-purple-500/5",
    text: "text-purple-600",
    border: "border-purple-500/10",
    icon: "text-purple-500"
  },
  amber: {
    bg: "bg-amber-500/5",
    text: "text-amber-600",
    border: "border-amber-500/10",
    icon: "text-amber-500"
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  tendency,
  color = "primary",
  className,
}: StatCardProps) {
  const theme = colorMap[color];

  return (
    <Card 
      className={cn(
        "p-6 rounded-[2.5rem] border-none relative overflow-hidden group shadow-sm", 
        theme.bg, 
        className
      )}
    >
      <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform", theme.icon)}>
        <Icon className="h-16 w-16" />
      </div>
      <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70", theme.text)}>
        {title}
      </p>
      <h3 className="text-4xl font-black tracking-tighter text-foreground tabular-nums">
        {value}
      </h3>
      {(description || tendency) && (
        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {tendency && <span className={cn("mr-1", theme.text)}>{tendency}</span>}
          {description}
        </div>
      )}
    </Card>
  );
}
