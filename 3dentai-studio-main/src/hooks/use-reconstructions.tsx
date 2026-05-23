import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export type ReconStatus = "pending" | "preprocessing" | "reconstructing" | "completed" | "failed";

export interface Reconstruction {
  id: string;
  patient_id: string;
  pano_image_url: string | null;
  output_voxel_url: string | null;
  output_stl_url: string | null;
  preview_url: string | null;
  status: ReconStatus;
  confidence_score: number;
  created_at: string;
}

export interface ReconWithPatient extends Reconstruction {
  patients?: { patient_name: string } | null;
}

export const PIPELINE_STAGES = [
  { name: "Noise Reduction",      desc: "Adaptive denoising filter",           duration: 1500 },
  { name: "Contrast Enhancement", desc: "CLAHE histogram tuning",              duration: 1500 },
  { name: "Arch Detection",       desc: "Dental arch landmark localization",   duration: 2000 },
  { name: "Voxel Generation",     desc: "Depth-aware voxel inference",         duration: 3000 },
  { name: "3D Reconstruction",    desc: "Volumetric mesh synthesis",           duration: 3500 },
  { name: "Mesh Refinement",      desc: "Smoothing & topology cleanup",        duration: 2000 },
] as const;

export function useReconstructions(patientId: string | null) {
  const { user } = useAuth();
  const [reconstructions, setReconstructions] = useState<Reconstruction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user || !patientId) { setReconstructions([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("reconstructions")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) console.error("[reconstruction] history query failed:", error);
    setReconstructions((data as Reconstruction[]) ?? []);
    setLoading(false);
  }, [user, patientId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { reconstructions, loading, refetch: fetch };
}

export function useAllReconstructions() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ReconWithPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to settle before deciding what to do
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    (async () => {
      setLoading(true);

      // 1. Get the IDs of patients belonging to this doctor
      const { data: ownPatients } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id);

      const ownPatientIds = (ownPatients ?? []).map((p: { id: string }) => p.id);

      // No patients yet → nothing to show
      if (ownPatientIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 2. Fetch reconstructions only for those patients
      const { data: reconData, error: reconError } = await supabase
        .from("reconstructions")
        .select("*")
        .in("patient_id", ownPatientIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (reconError) {
        console.error("[imaging] reconstructions query failed:", reconError);
        toast.error("Failed to load scans: " + reconError.message);
        setLoading(false);
        return;
      }

      if (!reconData || reconData.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 3. Fetch patient names separately so we can label each card
      const patientIds = [...new Set((reconData as Reconstruction[]).map((r) => r.patient_id))];
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, patient_name")
        .eq("user_id", user.id)
        .in("id", patientIds);

      if (patientError) {
        console.error("[imaging] patients query failed:", patientError);
      }

      const patientMap: Record<string, string> = {};
      if (patientData) {
        for (const p of patientData as { id: string; patient_name: string }[]) {
          patientMap[p.id] = p.patient_name;
        }
      }

      // 4. Merge patient name into each reconstruction record
      const merged: ReconWithPatient[] = (reconData as Reconstruction[]).map((r) => ({
        ...r,
        patients: { patient_name: patientMap[r.patient_id] ?? "Unknown patient" },
      }));

      setItems(merged);
      setLoading(false);
    })();
  }, [user, authLoading]);

  return { items, loading };
}

/** Uploads a panoramic image to Supabase Storage, creates a DB record,
 *  then simulates the AI pipeline stages with realistic timing.
 *  When your model is ready, replace the simulation block with a real API call. */
export async function uploadAndSimulate(
  patientId: string,
  file: File,
  onProgress: (step: number, progress: number) => void,
  onStatus: (status: ReconStatus) => void
): Promise<Reconstruction | null> {
  // 1. Upload panoramic to Supabase Storage
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `pano_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("panoramic-images")
    .upload(fileName, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    toast.error("Upload failed: " + uploadError.message);
    return null;
  }

  const { data: { publicUrl: panoUrl } } = supabase.storage
    .from("panoramic-images")
    .getPublicUrl(fileName);

  // 2. Create reconstruction record in DB
  onStatus("preprocessing");
  const { data: recon, error: insertError } = await supabase
    .from("reconstructions")
    .insert({
      patient_id: patientId,
      pano_image_url: panoUrl,
      status: "preprocessing",
      confidence_score: 0,
    })
    .select()
    .single();

  if (insertError || !recon) {
    toast.error("Failed to create reconstruction record: " + insertError?.message);
    return null;
  }

  // 3. Simulate AI pipeline stages
  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    // Switch to "reconstructing" at the voxel stage
    if (i === 3) {
      onStatus("reconstructing");
      await supabase
        .from("reconstructions")
        .update({ status: "reconstructing" })
        .eq("id", recon.id);
    }

    const ticks = 20;
    const tickMs = PIPELINE_STAGES[i].duration / ticks;
    for (let t = 0; t <= ticks; t++) {
      await new Promise((r) => setTimeout(r, tickMs));
      onProgress(i, Math.round((t / ticks) * 100));
    }
  }

  // 4. Mark as completed with a simulated confidence score (92–98%)
  const confidence = parseFloat((92 + Math.random() * 6).toFixed(2));
  const { data: done } = await supabase
    .from("reconstructions")
    .update({
      status: "completed",
      confidence_score: confidence,
      preview_url: panoUrl, // placeholder — replace with real 3D preview when model is ready
    })
    .eq("id", recon.id)
    .select()
    .single();

  onStatus("completed");
  return (done as Reconstruction) ?? (recon as Reconstruction);
}
