import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  RotateCcw,
  Sparkles,
  Cpu,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { usePatients } from "@/hooks/use-patients";
import {
  useReconstructions,
  uploadAndSimulate,
  PIPELINE_STAGES,
  type ReconStatus,
  type Reconstruction,
} from "@/hooks/use-reconstructions";

// Lazy-load Three.js viewer so it doesn't block initial page paint
const JawViewer3D = lazy(() =>
  import("@/components/JawViewer3D").then((m) => ({ default: m.JawViewer3D }))
);

export const Route = createFileRoute("/app/reconstruction")({
  component: ReconstructionPage,
});

const statusConfig: Record<ReconStatus, { label: string; className: string }> = {
  pending:        { label: "Pending",        className: "bg-secondary text-secondary-foreground border-border" },
  preprocessing:  { label: "Preprocessing",  className: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  reconstructing: { label: "Reconstructing", className: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  completed:      { label: "Completed",      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  failed:         { label: "Failed",         className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

function ReconstructionPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [patientId, setPatientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepProgress, setStepProgress] = useState<number[]>(
    Array(PIPELINE_STAGES.length).fill(0)
  );
  const [status, setStatus] = useState<ReconStatus | null>(null);
  const [result, setResult] = useState<Reconstruction | null>(null);
  // Incrementing this key remounts the 3D viewer (resets rotation + zoom)
  const [viewerKey, setViewerKey] = useState(0);

  const { patients, loading: patientsLoading } = usePatients();
  const { reconstructions, loading: historyLoading, refetch } = useReconstructions(
    patientId || null
  );

  const selectedPatient = patients.find((p) => p.id === patientId);
  const done = status === "completed";

  const start = async (f: File) => {
    if (!patientId) { toast.error("Select a patient first"); return; }
    if (processing) return;
    if (!["image/png", "image/jpeg"].includes(f.type)) {
      toast.error("Please upload a PNG or JPEG file");
      return;
    }

    setFile(f);
    setProcessing(true);
    setStatus(null);
    setResult(null);
    setCurrentStep(0);
    setStepProgress(Array(PIPELINE_STAGES.length).fill(0));
    setViewerKey((k) => k + 1); // fresh 3D orientation for each new scan

    const completed = await uploadAndSimulate(
      patientId,
      f,
      (step, progress) => {
        setCurrentStep(step);
        setStepProgress((prev) =>
          prev.map((v, i) => (i === step ? progress : i < step ? 100 : v))
        );
      },
      (s) => setStatus(s)
    );

    setProcessing(false);
    if (completed) {
      setResult(completed);
      toast.success(`Reconstruction complete — ${completed.confidence_score.toFixed(1)}% confidence`);
      refetch();
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) start(f);
  };

  const reset = () => {
    setFile(null);
    setStatus(null);
    setResult(null);
    setCurrentStep(-1);
    setStepProgress(Array(PIPELINE_STAGES.length).fill(0));
    setViewerKey((k) => k + 1);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">3D Reconstruction</h1>
          <p className="text-muted-foreground mt-1">
            Upload a panoramic scan to start the AI reconstruction pipeline.
          </p>
        </div>

        {/* Patient selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Patient:</span>
          {patientsLoading ? (
            <Skeleton className="h-10 w-52 rounded-xl" />
          ) : patients.length === 0 ? (
            <Link to="/app/patients">
              <Button variant="outline" className="rounded-xl">
                Add patients first
              </Button>
            </Link>
          ) : (
            <Select value={patientId} onValueChange={setPatientId} disabled={processing}>
              <SelectTrigger className="w-56 rounded-xl">
                <SelectValue placeholder="Select patient…" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.patient_name} · {p.age} yrs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {done && (
            <Button variant="outline" className="rounded-xl" onClick={reset}>
              New scan
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Left: upload + pipeline ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Upload card */}
          <Card className="p-6 rounded-2xl border-border/60 soft-shadow">
            <h2 className="text-lg font-semibold mb-1">Upload panoramic image</h2>
            <p className="text-sm text-muted-foreground mb-4">PNG, JPEG · max 50 MB</p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => !processing && patientId && inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors group
                ${patientId && !processing
                  ? "cursor-pointer border-border hover:border-accent hover:bg-accent/5"
                  : "cursor-not-allowed border-border/40 opacity-60"}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                hidden
                onChange={(e) => e.target.files?.[0] && start(e.target.files[0])}
              />
              <div className="mx-auto h-14 w-14 rounded-2xl bg-secondary group-hover:bg-accent/10 flex items-center justify-center mb-3 transition-colors">
                <Upload className="h-6 w-6 text-accent" />
              </div>
              <p className="font-medium">
                {processing
                  ? "Processing…"
                  : file
                  ? file.name
                  : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {!patientId
                  ? "Select a patient above first"
                  : "Panoramic X-Ray (JPEG or PNG)"}
              </p>
            </div>
          </Card>

          {/* Pipeline card */}
          <Card className="p-6 rounded-2xl border-border/60 soft-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-accent" /> AI Pipeline
                </h2>
                <p className="text-sm text-muted-foreground">Six-stage neural reconstruction</p>
              </div>
              {processing && (
                <Badge className={`rounded-full border gap-1.5 ${
                  status === "reconstructing"
                    ? "bg-violet-500/10 text-violet-600 border-violet-500/20"
                    : "bg-sky-500/10 text-sky-600 border-sky-500/20"
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {status === "reconstructing" ? "Reconstructing" : "Preprocessing"}
                </Badge>
              )}
              {done && (
                <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Complete
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {PIPELINE_STAGES.map((s, i) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div>
                      <span className={`font-medium ${i === currentStep && processing ? "text-accent" : ""}`}>
                        {s.name}
                      </span>
                      <span className="text-muted-foreground ml-2 text-xs">{s.desc}</span>
                    </div>
                    <span className="font-medium tabular-nums text-xs">{stepProgress[i]}%</span>
                  </div>
                  <Progress value={stepProgress[i]} className="h-1.5" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right: 3D viewer ── */}
        <Card className="xl:col-span-3 p-6 rounded-2xl border-border/60 soft-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">3D Jaw Viewer</h2>
                {result && (
                  <Badge className="rounded-full bg-secondary border-border font-mono text-xs">
                    {result.id.slice(0, 8).toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {done
                  ? `Reconstruction complete — drag to rotate · scroll to zoom`
                  : "Interactive 3D model — drag to rotate · scroll to zoom"}
              </p>
            </div>
            {done && result && (
              <Badge className="rounded-full gap-1.5 gradient-navy-cyan text-white border-0">
                <Sparkles className="h-3 w-3" />
                {result.confidence_score.toFixed(1)}% confidence
              </Badge>
            )}
          </div>

          {/* 3D Viewer container */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[oklch(0.16_0.04_255)] to-[oklch(0.22_0.06_260)] ai-glow">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.12),transparent_70%)]" />

            {/* Three.js jaw — always rendered, lazy-loaded */}
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                </div>
              }
            >
              <JawViewer3D
                key={viewerKey}
                processing={processing}
                idle={!file && !processing && !done}
                patientSelected={!!patientId}
                processingText={
                  status === "reconstructing"
                    ? "Running AI inference…"
                    : "Preprocessing image…"
                }
              />
            </Suspense>

            {/* Top HUD */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white/50 text-xs font-mono pointer-events-none z-20">
              <span>DENTAL-NET v4.2.1</span>
              <span className="bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded px-2 py-0.5">
                SIMULATION · AI IN TRAINING
              </span>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
              <div className="flex gap-2 pointer-events-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-xl glass border-white/10 text-white/80 gap-1.5 text-xs"
                  onClick={() => setViewerKey((k) => k + 1)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset view
                </Button>
              </div>
              {result?.pano_image_url && (
                <a
                  href={result.pano_image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto"
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 rounded-xl glass border-white/10 text-white/80 gap-1.5 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View panoramic X-ray
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Download row */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button className="h-11 rounded-xl gradient-navy-cyan text-white" disabled>
              Download STL &nbsp;·&nbsp; coming soon
            </Button>
            <Button variant="outline" className="h-11 rounded-xl" disabled>
              Download Voxel .nii &nbsp;·&nbsp; coming soon
            </Button>
          </div>
        </Card>
      </div>

      {/* ── History ── */}
      {patientId && (
        <Card className="rounded-2xl border-border/60 soft-shadow overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">
              Reconstruction history
              {selectedPatient && (
                <span className="text-muted-foreground font-normal ml-2">
                  — {selectedPatient.patient_name}
                </span>
              )}
            </h2>
            <span className="text-sm text-muted-foreground">{reconstructions.length} record{reconstructions.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-muted-foreground bg-secondary/40">
                  <th className="text-left font-medium px-4 py-3">ID</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Confidence</th>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Panoramic</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!historyLoading && reconstructions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No reconstructions yet for this patient.
                    </td>
                  </tr>
                )}
                {reconstructions.map((r) => {
                  const sc = statusConfig[r.status];
                  return (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{r.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3">
                        <Badge className={`rounded-full border text-xs ${sc.className}`}>
                          {sc.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "completed" ? (
                          <span className="font-medium text-emerald-600">
                            {r.confidence_score.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {r.pano_image_url ? (
                          <a
                            href={r.pano_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-accent text-xs hover:underline"
                          >
                            View scan <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
