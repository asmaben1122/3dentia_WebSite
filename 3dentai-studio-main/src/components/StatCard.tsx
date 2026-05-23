import { motion } from "framer-motion";
import { Users, Layers, Sparkles, Timer, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const ICONS: Record<string, LucideIcon> = { users: Users, layers: Layers, sparkles: Sparkles, timer: Timer };

interface Props {
  label: string;
  value: string | number;
  delta: string;
  trend: readonly number[] | number[];
  icon: string;
  index?: number;
}

export function StatCard({ label, value, delta, trend, icon, index = 0 }: Props) {
  const Icon = ICONS[icon] ?? Sparkles;
  const positive = !delta.startsWith("-");
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const points = trend
    .map((v, i) => {
      const x = (i / (trend.length - 1)) * 100;
      const y = 30 - ((v - min) / (max - min || 1)) * 28 - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Card className="p-5 rounded-2xl soft-shadow border-border/60 hover:border-accent/40 transition-all hover:-translate-y-0.5 relative overflow-hidden group">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full gradient-navy-cyan opacity-10 group-hover:opacity-20 transition-opacity blur-2xl" />
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-3xl font-semibold mt-2 tracking-tight">{value}</div>
            <div className={`text-xs mt-1 font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
              {delta} this month
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <svg viewBox="0 0 100 32" className="w-full h-10 mt-3" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`g-${label}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.15 215)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="oklch(0.65 0.15 215)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="oklch(0.55 0.15 220)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          <polygon fill={`url(#g-${label})`} points={`0,32 ${points} 100,32`} />
        </svg>
      </Card>
    </motion.div>
  );
}
