import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/StatCard";
import { useDashboard } from "@/hooks/use-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, ChevronRight, Activity } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const statusStyles: Record<string, string> = {
  completed:      "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  reconstructing: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  preprocessing:  "bg-sky-500/10 text-sky-600 border-sky-500/20",
  pending:        "bg-secondary text-secondary-foreground border-border",
  failed:         "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusLabel: Record<string, string> = {
  completed:      "Completed",
  reconstructing: "Reconstructing",
  preprocessing:  "Processing",
  pending:        "Pending",
  failed:         "Failed",
};

const activityDotColor: Record<string, string> = {
  completed: "bg-emerald-500",
  failed:    "bg-red-500",
  started:   "bg-sky-500",
};

function Dashboard() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { stats, recentRecons, weeklyUsage, perfData, activity, loading } = useDashboard();

  const userName = (user?.user_metadata?.full_name as string | undefined)
    ?? user?.email?.split("@")[0]
    ?? "Doctor";

  const statCards = [
    {
      label: "Total Patients",
      value: stats.totalPatients,
      delta: `+${stats.patientsThisMonth}`,
      trend: stats.patientsTrend,
      icon: "users",
    },
    {
      label: "Reconstructions",
      value: stats.totalRecons,
      delta: `+${stats.reconsThisMonth}`,
      trend: stats.reconsTrend,
      icon: "layers",
    },
    {
      label: "AI Accuracy",
      value: stats.avgAccuracy > 0 ? `${stats.avgAccuracy}%` : "—",
      delta: `+${stats.completedThisMonth} completed`,
      trend: stats.accuracyTrend,
      icon: "sparkles",
    },
    {
      label: "Completed",
      value: stats.completedRecons,
      delta: `+${stats.completedThisMonth}`,
      trend: stats.completedTrend,
      icon: "timer",
    },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {timeGreeting()}, {userName}
          </h1>
          <p className="text-muted-foreground mt-1">Here's what your AI did today.</p>
        </div>
        <Button
          className="rounded-xl gradient-navy-cyan text-white ai-glow"
          onClick={() => navigate({ to: "/app/reconstruction" })}
        >
          <Sparkles className="h-4 w-4" /> New Reconstruction
        </Button>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 rounded-2xl">
              <Skeleton className="h-3 w-28 mb-3" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-24 mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
        </div>
      )}

      {/* Middle row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Reconstructions table */}
        <Card className="xl:col-span-2 p-6 rounded-2xl border-border/60 soft-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Recent Reconstructions</h2>
              <p className="text-sm text-muted-foreground">Latest AI-generated 3D jaw models</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-accent"
              onClick={() => navigate({ to: "/app/imaging" })}
            >
              View all <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-x-auto -mx-2">
            {loading ? (
              <div className="space-y-3 px-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : recentRecons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No reconstructions yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-2 py-3">ID</th>
                    <th className="text-left font-medium px-2 py-3">Patient</th>
                    <th className="text-left font-medium px-2 py-3">Date</th>
                    <th className="text-left font-medium px-2 py-3">Status</th>
                    <th className="text-left font-medium px-2 py-3">Confidence</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {recentRecons.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-border/40 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-2 py-3 font-mono text-xs">
                        {r.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-2 py-3 font-medium">{r.patient_name}</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-3">
                        <Badge className={`rounded-full font-medium border ${statusStyles[r.status] ?? ""}`}>
                          {statusLabel[r.status] ?? r.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <Progress value={r.confidence_score} className="h-1.5" />
                          <span className="text-xs font-medium w-12 shrink-0">
                            {r.confidence_score > 0
                              ? `${r.confidence_score.toFixed(1)}%`
                              : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg"
                          onClick={() => navigate({ to: "/app/imaging" })}
                        >
                          Open
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* AI Activity feed */}
        <Card className="p-6 rounded-2xl border-border/60 soft-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">AI Activity</h2>
            <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5">
              <Activity className="h-3 w-3" />Live
            </Badge>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No activity yet.</p>
          ) : (
            <ol className="relative space-y-4">
              {activity.map((a, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-2.5 w-2.5 rounded-full mt-1.5 ${
                        activityDotColor[a.type] ?? "gradient-navy-cyan"
                      }`}
                    />
                    {i < activity.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="pb-2 flex-1">
                    <p className="text-sm">{a.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6 rounded-2xl border-border/60 soft-shadow">
          <h2 className="text-lg font-semibold mb-1">Reconstruction Performance</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Average AI accuracy per month (12 months)
          </p>
          {loading ? (
            <Skeleton className="w-full h-[240px] rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={perfData}>
                <defs>
                  <linearGradient id="acc" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.15 215)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.65 0.15 215)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 245)" />
                <XAxis dataKey="month" stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.03 250)" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 245)" }}
                  formatter={(v: number) => [`${v}%`, "Accuracy"]}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="oklch(0.55 0.15 220)"
                  strokeWidth={2.5}
                  fill="url(#acc)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6 rounded-2xl border-border/60 soft-shadow">
          <h2 className="text-lg font-semibold mb-1">Weekly Usage</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Scans uploaded vs reconstructions completed
          </p>
          {loading ? (
            <Skeleton className="w-full h-[240px] rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 245)" />
                <XAxis dataKey="day" stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.03 250)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 245)" }}
                />
                <Bar dataKey="scans" fill="oklch(0.28 0.09 260)" radius={[8, 8, 0, 0]} name="Scans" />
                <Bar dataKey="completed" fill="oklch(0.65 0.15 215)" radius={[8, 8, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
