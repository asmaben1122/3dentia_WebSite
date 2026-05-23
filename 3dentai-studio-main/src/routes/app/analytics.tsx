import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { gpuUsage, performanceData, weeklyUsage } from "@/lib/mock-data";
import { Sparkles, Cpu, Gauge, Database } from "lucide-react";

export const Route = createFileRoute("/app/analytics")({
  component: Analytics,
});

const kpis = [
  { label: "Recon Accuracy", value: "98.6%", icon: Sparkles },
  { label: "GPU Utilization", value: "72%", icon: Cpu },
  { label: "Avg. Inference", value: "1.42s", icon: Gauge },
  { label: "Dataset Size", value: "12.4 TB", icon: Database },
];

function Analytics() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AI Analytics</h1>
        <p className="text-muted-foreground mt-1">Performance, throughput, and infrastructure telemetry</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5 rounded-2xl border-border/60 soft-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-semibold mt-2">{k.value}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-accent">
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6 rounded-2xl border-border/60 soft-shadow">
          <h2 className="text-lg font-semibold mb-1">Reconstruction Accuracy Trend</h2>
          <p className="text-sm text-muted-foreground mb-4">Rolling 12-month inference performance</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 245)" />
              <XAxis dataKey="month" fontSize={12} stroke="oklch(0.5 0.03 250)" />
              <YAxis fontSize={12} stroke="oklch(0.5 0.03 250)" />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="oklch(0.55 0.15 220)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="speed" stroke="oklch(0.28 0.09 260)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 rounded-2xl border-border/60 soft-shadow">
          <h2 className="text-lg font-semibold mb-1">GPU Utilization (24h)</h2>
          <p className="text-sm text-muted-foreground mb-4">Realtime inference workload distribution</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={gpuUsage}>
              <defs>
                <linearGradient id="gpu" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.15 215)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.65 0.15 215)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 245)" />
              <XAxis dataKey="hour" fontSize={11} stroke="oklch(0.5 0.03 250)" />
              <YAxis fontSize={12} stroke="oklch(0.5 0.03 250)" />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Area type="monotone" dataKey="usage" stroke="oklch(0.55 0.15 220)" strokeWidth={2} fill="url(#gpu)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 rounded-2xl border-border/60 soft-shadow xl:col-span-2">
          <h2 className="text-lg font-semibold mb-1">Processing Throughput</h2>
          <p className="text-sm text-muted-foreground mb-4">Weekly scans vs reconstructions completed</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 245)" />
              <XAxis dataKey="day" fontSize={12} stroke="oklch(0.5 0.03 250)" />
              <YAxis fontSize={12} stroke="oklch(0.5 0.03 250)" />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="scans" fill="oklch(0.28 0.09 260)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="recon" fill="oklch(0.65 0.15 215)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 rounded-2xl border-border/60 soft-shadow xl:col-span-2">
          <h2 className="text-lg font-semibold mb-1">Confidence Heatmap</h2>
          <p className="text-sm text-muted-foreground mb-4">AI confidence score distribution across dental arch regions</p>
          <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
            {Array.from({ length: 96 }).map((_, i) => {
              const v = Math.random();
              const opacity = 0.15 + v * 0.85;
              return <div key={i} className="aspect-square rounded-md" style={{ background: `oklch(0.55 0.15 220 / ${opacity})` }} />;
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
