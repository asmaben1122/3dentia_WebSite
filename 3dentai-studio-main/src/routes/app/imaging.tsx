import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageIcon, ScanLine } from "lucide-react";
import { motion } from "framer-motion";
import { useAllReconstructions, type ReconWithPatient } from "@/hooks/use-reconstructions";

export const Route = createFileRoute("/app/imaging")({
  component: Imaging,
});

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

function ScanCard({ r, i, onOpen }: { r: ReconWithPatient; i: number; onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
    >
      <Card className="rounded-2xl border-border/60 soft-shadow overflow-hidden group hover:-translate-y-0.5 transition-all">
        {/* Thumbnail */}
        <div className="aspect-video relative bg-gradient-to-br from-[oklch(0.18_0.04_255)] to-[oklch(0.25_0.07_260)] flex items-center justify-center overflow-hidden">
          {r.pano_image_url ? (
            <img
              src={r.pano_image_url}
              alt="Panoramic scan"
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <ImageIcon className="h-12 w-12 text-white/40 relative z-10" />
          )}
          <Badge
            className={`absolute top-3 right-3 rounded-full border z-10 ${statusStyles[r.status] ?? ""}`}
          >
            {statusLabel[r.status] ?? r.status}
          </Badge>
        </div>

        {/* Info */}
        <div className="p-4 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="font-mono">{r.id.slice(0, 8).toUpperCase()}</span>
            <span>{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <div className="font-medium truncate">
            {r.patients?.patient_name ?? "Unknown patient"}
          </div>
          {r.status === "completed" && (
            <div className="text-xs text-emerald-600 font-medium">
              {r.confidence_score.toFixed(1)}% confidence
            </div>
          )}
          {(r.status === "preprocessing" || r.status === "reconstructing") && (
            <div className="text-xs text-sky-600 font-medium animate-pulse">
              Pipeline running…
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-lg mt-1"
            onClick={onOpen}
          >
            Open
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="rounded-2xl overflow-hidden">
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ tab, onNew }: { tab: string; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-base font-medium mb-1">No scans found</p>
      {tab === "all" && (
        <Button variant="link" onClick={onNew}>
          Upload your first panoramic scan →
        </Button>
      )}
    </div>
  );
}

function Imaging() {
  const navigate = useNavigate();
  const { items, loading } = useAllReconstructions();

  const openRecon = () => navigate({ to: "/app/reconstruction" });

  const byStatus = (s: string) => items.filter((r) => r.status === s);
  const inProgress = items.filter(
    (r) => r.status === "preprocessing" || r.status === "reconstructing"
  );

  const tabs: { value: string; label: string; items: ReconWithPatient[] }[] = [
    { value: "all",        label: `All (${items.length})`,                 items },
    { value: "completed",  label: `Completed (${byStatus("completed").length})`,  items: byStatus("completed") },
    { value: "processing", label: `Processing (${inProgress.length})`,    items: inProgress },
    { value: "failed",     label: `Failed (${byStatus("failed").length})`, items: byStatus("failed") },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Imaging</h1>
          <p className="text-muted-foreground mt-1">
            {loading
              ? "Loading…"
              : `${items.length} panoramic scan${items.length !== 1 ? "s" : ""} across all patients`}
          </p>
        </div>
        <Button
          className="rounded-xl gradient-navy-cyan text-white ai-glow"
          onClick={openRecon}
        >
          <ScanLine className="h-4 w-4" /> New reconstruction
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="rounded-xl bg-secondary">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-lg">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-6">
            {loading ? (
              <SkeletonGrid />
            ) : t.items.length === 0 ? (
              <EmptyState tab={t.value} onNew={openRecon} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {t.items.map((r, i) => (
                  <ScanCard key={r.id} r={r} i={i} onOpen={openRecon} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
